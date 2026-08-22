import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlmodel import Session, select, desc

from database import get_session
from models import User, EmployeeProfile, Attendance, RoleEnum, AttendanceStatusEnum
from auth import get_current_user, require_role

router = APIRouter(prefix="/attendance", tags=["Attendance"])


class ManualAttendanceRequest(BaseModel):
    user_id: int
    date: datetime.date
    status: str
    check_in: Optional[datetime.datetime] = None
    check_out: Optional[datetime.datetime] = None
    working_hours: Optional[float] = 0.0


def _attendance_response(att: Attendance, user: Optional[User] = None, profile: Optional[EmployeeProfile] = None):
    return {
        "id": att.id,
        "user_id": att.user_id,
        "employee_id": user.employee_id if user else (att.user.employee_id if att.user else ""),
        "name": profile.name if profile else (att.user.profile.name if att.user and att.user.profile else ""),
        "department": profile.department if profile else (att.user.profile.department if att.user and att.user.profile else ""),
        "date": str(att.date),
        "check_in": att.check_in.isoformat() if att.check_in else None,
        "check_out": att.check_out.isoformat() if att.check_out else None,
        "status": att.status,
        "working_hours": att.working_hours or 0.0,
    }


@router.get("/me")
def get_my_attendance(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    """
    Get attendance records for the current employee, sorted most recent first.
    """
    query = select(Attendance).where(Attendance.user_id == current_user.id).order_by(desc(Attendance.date))
    records = session.exec(query).all()

    # Optional filter by month / year if provided
    filtered = []
    for r in records:
        if month and r.date.month != month:
            continue
        if year and r.date.year != year:
            continue
        filtered.append(_attendance_response(r, current_user, current_user.profile))

    return filtered


@router.get("/today")
def get_today_attendance(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Get today's attendance record for current user.
    """
    today = datetime.date.today()
    record = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date == today
        )
    ).first()

    if not record:
        return {
            "is_checked_in": False,
            "is_checked_out": False,
            "record": None,
        }

    return {
        "is_checked_in": record.check_in is not None,
        "is_checked_out": record.check_out is not None,
        "record": _attendance_response(record, current_user, current_user.profile),
    }


@router.post("/check-in")
def check_in(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Clock in for today.
    """
    today = datetime.date.today()
    now = datetime.datetime.now()

    record = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date == today
        )
    ).first()

    if record:
        if record.check_in is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Already checked in today at {record.check_in.strftime('%H:%M:%S')}."
            )
        record.check_in = now
        record.status = AttendanceStatusEnum.PRESENT
    else:
        record = Attendance(
            user_id=current_user.id,
            date=today,
            check_in=now,
            status=AttendanceStatusEnum.PRESENT,
            working_hours=0.0,
        )
        session.add(record)

    session.commit()
    session.refresh(record)

    return {
        "message": f"Checked in successfully at {now.strftime('%H:%M:%S')}",
        "record": _attendance_response(record, current_user, current_user.profile),
    }


@router.post("/check-out")
def check_out(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Clock out for today. Computes total working hours.
    """
    today = datetime.date.today()
    now = datetime.datetime.now()

    record = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date == today
        )
    ).first()

    if not record or record.check_in is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check out without checking in first."
        )

    if record.check_out is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Already checked out today at {record.check_out.strftime('%H:%M:%S')}."
        )

    record.check_out = now
    duration_seconds = (now - record.check_in).total_seconds()
    hours = max(0.0, round(duration_seconds / 3600, 2))
    record.working_hours = hours

    if hours < 4.5:
        record.status = AttendanceStatusEnum.HALF_DAY
    else:
        record.status = AttendanceStatusEnum.PRESENT

    session.add(record)
    session.commit()
    session.refresh(record)

    return {
        "message": f"Checked out successfully at {now.strftime('%H:%M:%S')}. Worked {hours} hours.",
        "record": _attendance_response(record, current_user, current_user.profile),
    }


@router.get("/all", dependencies=[Depends(require_role([RoleEnum.HR]))])
def get_all_attendance(
    target_date: Optional[datetime.date] = Query(None, alias="date"),
    user_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    HR ONLY: View attendance records across company with filtering.
    """
    query = select(Attendance).order_by(desc(Attendance.date))
    if target_date:
        query = query.where(Attendance.date == target_date)
    if user_id:
        query = query.where(Attendance.user_id == user_id)

    records = session.exec(query).all()
    results = []
    for r in records:
        user = session.get(User, r.user_id)
        profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == r.user_id)).first()
        results.append(_attendance_response(r, user, profile))
    return results


@router.post("/record", dependencies=[Depends(require_role([RoleEnum.HR]))])
def create_or_update_attendance_record(
    payload: ManualAttendanceRequest,
    session: Session = Depends(get_session),
):
    """
    HR ONLY: Manually create or update an attendance record for any employee.
    """
    user = session.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    record = session.exec(
        select(Attendance).where(
            Attendance.user_id == payload.user_id,
            Attendance.date == payload.date
        )
    ).first()

    if record:
        record.status = payload.status
        if payload.check_in:
            record.check_in = payload.check_in
        if payload.check_out:
            record.check_out = payload.check_out
        if payload.working_hours is not None:
            record.working_hours = payload.working_hours
    else:
        record = Attendance(
            user_id=payload.user_id,
            date=payload.date,
            status=payload.status,
            check_in=payload.check_in,
            check_out=payload.check_out,
            working_hours=payload.working_hours or 0.0,
        )
        session.add(record)

    session.commit()
    session.refresh(record)

    profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == payload.user_id)).first()
    return {
        "message": "Attendance record saved successfully.",
        "record": _attendance_response(record, user, profile),
    }
