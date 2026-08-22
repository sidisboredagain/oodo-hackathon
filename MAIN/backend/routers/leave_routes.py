import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select, desc

from database import get_session
from models import User, EmployeeProfile, LeaveRequest, Notification, RoleEnum, LeaveStatusEnum
from auth import get_current_user, require_role

router = APIRouter(prefix="/leaves", tags=["Leave Management"])


class ApplyLeaveRequest(BaseModel):
    leave_type: str  # Paid, Sick, Unpaid
    start_date: datetime.date
    end_date: datetime.date
    remarks: Optional[str] = ""

    @field_validator("leave_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v_clean = v.strip().capitalize()
        if v_clean not in ["Paid", "Sick", "Unpaid", "Casual", "Emergency"]:
            raise ValueError("Leave type must be Paid, Sick, Unpaid, Casual, or Emergency.")
        return v_clean


class UpdateLeaveStatusRequest(BaseModel):
    status: str  # approved or rejected
    admin_comment: Optional[str] = ""

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in [LeaveStatusEnum.APPROVED, LeaveStatusEnum.REJECTED, LeaveStatusEnum.PENDING]:
            raise ValueError("Status must be approved, rejected, or pending.")
        return v_clean


def _leave_response(leave: LeaveRequest, user: Optional[User] = None, profile: Optional[EmployeeProfile] = None):
    # Calculate days requested
    num_days = (leave.end_date - leave.start_date).days + 1
    return {
        "id": leave.id,
        "user_id": leave.user_id,
        "employee_id": user.employee_id if user else (leave.user.employee_id if leave.user else ""),
        "name": profile.name if profile else (leave.user.profile.name if leave.user and leave.user.profile else ""),
        "department": profile.department if profile else (leave.user.profile.department if leave.user and leave.user.profile else ""),
        "leave_type": leave.leave_type,
        "start_date": str(leave.start_date),
        "end_date": str(leave.end_date),
        "days": max(1, num_days),
        "remarks": leave.remarks or "",
        "status": leave.status,
        "admin_comment": leave.admin_comment or "",
        "created_at": leave.created_at.isoformat() if leave.created_at else None,
        "reviewed_at": leave.reviewed_at.isoformat() if leave.reviewed_at else None,
    }


@router.get("/me")
def get_my_leaves(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Get all leave requests submitted by the logged in employee, along with leave allowance calculations.
    """
    requests = session.exec(
        select(LeaveRequest)
        .where(LeaveRequest.user_id == current_user.id)
        .order_by(desc(LeaveRequest.created_at))
    ).all()

    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id)
    ).first()

    # Calculate leave usage
    paid_allowance = 18
    sick_allowance = 10
    paid_used = 0
    sick_used = 0
    unpaid_used = 0
    pending_count = 0

    for r in requests:
        days = (r.end_date - r.start_date).days + 1
        if r.status == LeaveStatusEnum.APPROVED:
            if r.leave_type.lower() == "paid":
                paid_used += days
            elif r.leave_type.lower() == "sick":
                sick_used += days
            else:
                unpaid_used += days
        elif r.status == LeaveStatusEnum.PENDING:
            pending_count += 1

    paid_remaining = max(0, paid_allowance - paid_used)
    sick_remaining = max(0, sick_allowance - sick_used)

    return {
        "summary": {
            "paid_allowance": paid_allowance,
            "paid_used": paid_used,
            "paid_remaining": paid_remaining,
            "sick_allowance": sick_allowance,
            "sick_used": sick_used,
            "sick_remaining": sick_remaining,
            "unpaid_used": unpaid_used,
            "pending_count": pending_count,
        },
        "requests": [_leave_response(r, current_user, profile) for r in requests],
    }


@router.post("/apply", status_code=status.HTTP_201_CREATED)
def apply_leave(
    payload: ApplyLeaveRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Submit a new leave request.
    """
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be earlier than start date."
        )

    leave = LeaveRequest(
        user_id=current_user.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        remarks=payload.remarks or "",
        status=LeaveStatusEnum.PENDING,
        created_at=datetime.datetime.utcnow(),
    )
    session.add(leave)
    session.commit()
    session.refresh(leave)

    # Notify HR accounts
    hr_users = session.exec(select(User).where(User.role == RoleEnum.HR)).all()
    emp_name = current_user.profile.name if current_user.profile else current_user.email
    for hr in hr_users:
        session.add(Notification(
            user_id=hr.id,
            title="New Leave Request",
            message=f"{emp_name} requested {payload.leave_type} leave from {payload.start_date} to {payload.end_date}."
        ))
    session.commit()

    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id)
    ).first()

    return {
        "message": "Leave application submitted successfully.",
        "leave": _leave_response(leave, current_user, profile),
    }


@router.get("/all", dependencies=[Depends(require_role([RoleEnum.HR]))])
def get_all_leaves(
    status_filter: Optional[str] = Query(None, alias="status"),
    session: Session = Depends(get_session),
):
    """
    HR ONLY: List all leave requests from all employees with optional status filtering.
    """
    query = select(LeaveRequest).order_by(desc(LeaveRequest.created_at))
    if status_filter and status_filter.lower() != "all":
        query = query.where(LeaveRequest.status == status_filter.lower())

    requests = session.exec(query).all()
    results = []
    for r in requests:
        user = session.get(User, r.user_id)
        profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == r.user_id)).first()
        results.append(_leave_response(r, user, profile))
    return results


@router.patch("/{leave_id}/status", dependencies=[Depends(require_role([RoleEnum.HR]))])
def update_leave_status(
    leave_id: int,
    payload: UpdateLeaveStatusRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    HR ONLY: Approve or reject an employee's leave request.
    """
    leave = session.get(LeaveRequest, leave_id)
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found."
        )

    leave.status = payload.status
    leave.admin_comment = payload.admin_comment or ""
    leave.reviewed_at = datetime.datetime.utcnow()

    session.add(leave)

    # Notify the employee
    emp = session.get(User, leave.user_id)
    if emp:
        status_label = "Approved" if payload.status == LeaveStatusEnum.APPROVED else "Rejected"
        session.add(Notification(
            user_id=emp.id,
            title=f"Leave Request {status_label}",
            message=f"Your {leave.leave_type} leave from {leave.start_date} to {leave.end_date} was {payload.status}. {payload.admin_comment or ''}".strip()
        ))

    session.commit()
    session.refresh(leave)

    profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == leave.user_id)).first()
    return {
        "message": f"Leave request marked as {payload.status}.",
        "leave": _leave_response(leave, emp, profile),
    }
