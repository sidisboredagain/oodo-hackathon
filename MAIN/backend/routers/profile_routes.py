"""
Profile Routes
==============
Handles employee profile read and update operations.

Authorization (enforced on the BACKEND — not just the frontend):
- GET  /api/profile/all         → HR only
- GET  /api/profile/{user_id}   → own profile (Employee), any profile (HR)
- PATCH /api/profile/{user_id}  → own profile + restricted fields (Employee), any + all fields (HR)

Employee-editable fields: phone, address, profile_picture
HR-only fields:           name, job_title, department, joining_date, employment_status
"""

import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import User, EmployeeProfile, RoleEnum
from auth import get_current_user, require_role

router = APIRouter(prefix="/profile", tags=["Employee Profiles"])


# Fields an employee is permitted to modify on their own profile
EMPLOYEE_EDITABLE_FIELDS: set[str] = {"phone", "address", "profile_picture"}

# Complete set of modifiable profile fields (HR can change all of these)
ALL_PROFILE_FIELDS: set[str] = EMPLOYEE_EDITABLE_FIELDS | {
    "name", "job_title", "department", "joining_date", "employment_status"
}


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class ProfileUpdateRequest(BaseModel):
    """
    All profile fields that may appear in a PATCH body.
    The endpoint decides which fields the caller is actually allowed to change.
    """
    # Employee-editable
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    # HR-only
    name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[datetime.date] = None
    employment_status: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper: build a profile dict for API responses
# ---------------------------------------------------------------------------

def _profile_response(profile: EmployeeProfile, user: User) -> dict:
    return {
        "user_id": profile.user_id,
        "employee_id": user.employee_id if user else None,
        "email": user.email if user else None,
        "role": user.role if user else None,
        "name": profile.name,
        "phone": profile.phone,
        "address": profile.address,
        "profile_picture": profile.profile_picture,
        "job_title": profile.job_title,
        "department": profile.department,
        "joining_date": str(profile.joining_date) if profile.joining_date else None,
        "employment_status": profile.employment_status,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/all", dependencies=[Depends(require_role([RoleEnum.HR]))])
def list_all_profiles(session: Session = Depends(get_session)):
    """
    HR ONLY: Returns a list of all employee profiles.
    Returns 403 if the caller is not an HR user.
    """
    profiles = session.exec(select(EmployeeProfile)).all()
    result = []
    for profile in profiles:
        user = session.get(User, profile.user_id)
        result.append(_profile_response(profile, user))
    return result


@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Get the authenticated user's own profile.
    """
    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id)
    ).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )
    return _profile_response(profile, current_user)


@router.get("/{user_id}")
def get_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Get an employee's profile by user_id.

    Authorization:
    - Employee:  can only view their OWN profile (403 if user_id != own id).
    - HR:        can view any profile.
    """
    # Backend authorization check — frontend hiding is NOT sufficient
    if current_user.role == RoleEnum.EMPLOYEE and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees can only view their own profile.",
        )

    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
    ).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    user = session.get(User, user_id)
    return _profile_response(profile, user)


@router.patch("/{user_id}")
def update_profile(
    user_id: int,
    request: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Update an employee profile.

    Authorization:
    - Employee:  can only modify their OWN profile AND only the fields:
                 phone, address, profile_picture.
                 Attempting to modify any other field → 403.
    - HR:        can modify ANY employee's profile AND all fields.

    Both rules are enforced server-side — the frontend cannot bypass them.
    """
    is_employee = current_user.role == RoleEnum.EMPLOYEE
    is_hr = current_user.role == RoleEnum.HR

    # --- Rule 1: Employee cannot modify another employee's profile ---
    if is_employee and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees can only modify their own profile.",
        )

    # --- Rule 2: Employee cannot modify HR-restricted fields ---
    if is_employee:
        # exclude_unset=True: only fields actually provided in the request body
        requested_fields = set(request.model_dump(exclude_unset=True).keys())
        restricted = requested_fields - EMPLOYEE_EDITABLE_FIELDS
        if restricted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Employees may not modify these fields: {sorted(restricted)}. "
                    f"Only HR can change: name, job_title, department, "
                    f"joining_date, employment_status."
                ),
            )

    # --- Fetch the profile ---
    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
    ).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found.",
        )

    # --- Apply updates ---
    allowed_fields = EMPLOYEE_EDITABLE_FIELDS if is_employee else ALL_PROFILE_FIELDS
    updates = request.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if field in allowed_fields:
            setattr(profile, field, value)

    session.add(profile)
    session.commit()
    session.refresh(profile)

    user = session.get(User, user_id)
    return {
        "message": "Profile updated successfully.",
        "updated_fields": sorted(updates.keys()),
        "profile": _profile_response(profile, user),
    }
