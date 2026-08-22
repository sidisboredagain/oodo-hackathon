import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select, desc

from database import get_session
from models import (
    User, EmployeeProfile, Attendance, LeaveRequest,
    Payroll, Notification, RoleEnum
)
from auth import get_current_user, require_role, hash_password

router = APIRouter(prefix="/employees", tags=["Employee Management"])


class CreateEmployeeRequest(BaseModel):
    employee_id: str
    name: str
    email: str
    password: str
    role: Optional[str] = "employee"
    job_title: Optional[str] = "Team Member"
    department: Optional[str] = "General"
    joining_date: Optional[datetime.date] = None
    employment_status: Optional[str] = "Full-Time"
    phone: Optional[str] = ""
    address: Optional[str] = ""
    base_salary: Optional[float] = 0.0

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Valid email is required.")
        return v

    @field_validator("employee_id")
    @classmethod
    def validate_emp_id(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Employee ID cannot be empty.")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Employee name is required.")
        return v


class UpdateEmployeeRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    joining_date: Optional[datetime.date] = None
    employment_status: Optional[str] = None
    role: Optional[str] = None
    base_salary: Optional[float] = None


def _full_employee_response(user: User, profile: Optional[EmployeeProfile] = None, payroll: Optional[Payroll] = None):
    return {
        "id": user.id,
        "user_id": user.id,
        "employee_id": user.employee_id,
        "email": user.email,
        "role": user.role,
        "email_verified": user.email_verified,
        "name": profile.name if profile else user.email.split("@")[0].title(),
        "phone": profile.phone if profile else "",
        "address": profile.address if profile else "",
        "profile_picture": profile.profile_picture if profile else "",
        "job_title": profile.job_title if profile else "Team Member",
        "department": profile.department if profile else "General",
        "joining_date": str(profile.joining_date) if profile and profile.joining_date else None,
        "employment_status": profile.employment_status if profile else "Full-Time",
        "salary": {
            "base_salary": payroll.base_salary if payroll else 0.0,
            "allowances": payroll.allowances if payroll else 0.0,
            "deductions": payroll.deductions if payroll else 0.0,
            "net_salary": payroll.net_salary if payroll else 0.0,
        } if payroll else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("", dependencies=[Depends(require_role([RoleEnum.HR]))])
def list_employees(
    query: Optional[str] = Query(None, description="Search term for name, email, department, ID"),
    department: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """
    HR ONLY: List all employees with rich profile and status info. Supports searching and department filtering.
    """
    users = session.exec(select(User).order_by(User.id)).all()
    results = []

    for u in users:
        profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == u.id)).first()
        payroll = session.exec(select(Payroll).where(Payroll.user_id == u.id)).first()
        data = _full_employee_response(u, profile, payroll)

        # Apply search filter
        if query:
            q = query.strip().lower()
            match = (
                q in data["name"].lower()
                or q in data["email"].lower()
                or q in data["employee_id"].lower()
                or q in data["department"].lower()
                or q in data["job_title"].lower()
            )
            if not match:
                continue

        # Apply department filter
        if department and department.lower() != "all":
            if data["department"].lower() != department.lower():
                continue

        results.append(data)

    return results


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role([RoleEnum.HR]))])
def create_employee(
    payload: CreateEmployeeRequest,
    session: Session = Depends(get_session),
):
    """
    HR ONLY: Provision a new employee account with user credentials and complete profile.
    """
    # Check duplicate email
    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee with this email already exists."
        )

    # Check duplicate employee_id
    if session.exec(select(User).where(User.employee_id == payload.employee_id)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An employee with this Employee ID already exists."
        )

    user = User(
        employee_id=payload.employee_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role or RoleEnum.EMPLOYEE,
        email_verified=True,  # Admin-provisioned accounts are pre-verified
        verification_code="123456",
        created_at=datetime.datetime.utcnow(),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    profile = EmployeeProfile(
        user_id=user.id,
        name=payload.name,
        phone=payload.phone or "",
        address=payload.address or "",
        job_title=payload.job_title or "Team Member",
        department=payload.department or "General",
        joining_date=payload.joining_date or datetime.date.today(),
        employment_status=payload.employment_status or "Full-Time",
    )
    session.add(profile)

    payroll = Payroll(
        user_id=user.id,
        base_salary=payload.base_salary or 0.0,
        allowances=0.0,
        deductions=0.0,
        net_salary=payload.base_salary or 0.0,
    )
    session.add(payroll)

    session.add(Notification(
        user_id=user.id,
        title="Welcome to Dayflow HRMS!",
        message="Your employee account has been created. You can now access attendance, leave management, and profile services."
    ))

    session.commit()
    session.refresh(profile)
    session.refresh(payroll)

    return {
        "message": "Employee created successfully.",
        "employee": _full_employee_response(user, profile, payroll),
    }


@router.get("/{user_id}")
def get_employee_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Get employee details by user_id.
    - Employee can view own profile.
    - HR can view any employee's profile.
    """
    if current_user.role == RoleEnum.EMPLOYEE and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees can only view their own profile."
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)).first()
    payroll = session.exec(select(Payroll).where(Payroll.user_id == user_id)).first()

    return _full_employee_response(user, profile, payroll)


@router.patch("/{user_id}")
def update_employee(
    user_id: int,
    payload: UpdateEmployeeRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Update employee information.
    - Employee can update their own phone, address, profile_picture.
    - HR can update all details.
    """
    is_hr = current_user.role == RoleEnum.HR
    if not is_hr and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to edit your own details."
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)).first()
    if not profile:
        profile = EmployeeProfile(user_id=user.id, name=user.email.split("@")[0].title())
        session.add(profile)
        session.commit()
        session.refresh(profile)

    updates = payload.model_dump(exclude_unset=True)

    # Employee-allowed fields
    emp_allowed = {"phone", "address", "profile_picture"}

    for field, value in updates.items():
        if not is_hr and field not in emp_allowed:
            continue

        if hasattr(profile, field):
            setattr(profile, field, value)
        elif field == "role" and is_hr:
            user.role = value
        elif field == "base_salary" and is_hr:
            payroll = session.exec(select(Payroll).where(Payroll.user_id == user_id)).first()
            if payroll:
                payroll.base_salary = value
                payroll.net_salary = value + payroll.allowances - payroll.deductions
                session.add(payroll)

    session.add(profile)
    session.add(user)
    session.commit()
    session.refresh(profile)
    session.refresh(user)

    payroll = session.exec(select(Payroll).where(Payroll.user_id == user_id)).first()

    return {
        "message": "Employee updated successfully.",
        "employee": _full_employee_response(user, profile, payroll),
    }


@router.delete("/{user_id}", dependencies=[Depends(require_role([RoleEnum.HR]))])
def delete_employee(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    HR ONLY: Remove an employee and their records.
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own active administrator account."
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    # Delete related records
    profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)).first()
    if profile:
        session.delete(profile)

    attendances = session.exec(select(Attendance).where(Attendance.user_id == user_id)).all()
    for att in attendances:
        session.delete(att)

    leaves = session.exec(select(LeaveRequest).where(LeaveRequest.user_id == user_id)).all()
    for l in leaves:
        session.delete(l)

    payroll = session.exec(select(Payroll).where(Payroll.user_id == user_id)).first()
    if payroll:
        session.delete(payroll)

    notifs = session.exec(select(Notification).where(Notification.user_id == user_id)).all()
    for n in notifs:
        session.delete(n)

    session.delete(user)
    session.commit()

    return {"message": f"Employee {user.employee_id} ({user.email}) deleted successfully."}
