"""Employee calendar: leaves + attendance + work-period statistics."""
import calendar as cal_mod
import datetime
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from database import get_session
from models import (
    User, Attendance, LeaveRequest,
    LeaveStatusEnum, AttendanceStatusEnum, RoleEnum,
)
from auth import get_current_user

router = APIRouter(prefix="/calendar", tags=["Calendar"])


def _daterange(start: datetime.date, end: datetime.date):
    d = start
    while d <= end:
        yield d
        d += datetime.timedelta(days=1)


@router.get("/me")
def my_calendar(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Calendar events for the logged-in employee for a given month,
    plus work-period statistics.
    """
    today = datetime.date.today()
    year = year or today.year
    month = month or today.month

    # Month bounds
    _, days_in_month = cal_mod.monthrange(year, month)
    month_start = datetime.date(year, month, 1)
    month_end = datetime.date(year, month, days_in_month)

    # Attendance for month
    attendances = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date >= month_start,
            Attendance.date <= month_end,
        )
    ).all()
    att_by_date = {a.date.isoformat(): a for a in attendances}

    # Approved leaves overlapping this month
    leaves = session.exec(
        select(LeaveRequest).where(
            LeaveRequest.user_id == current_user.id,
            LeaveRequest.status == LeaveStatusEnum.APPROVED,
        )
    ).all()

    leave_days = {}  # date_iso -> leave_type
    for lr in leaves:
        for d in _daterange(lr.start_date, lr.end_date):
            if month_start <= d <= month_end:
                leave_days[d.isoformat()] = lr.leave_type

    # Build day cells
    days = []
    for day in range(1, days_in_month + 1):
        d = datetime.date(year, month, day)
        iso = d.isoformat()
        att = att_by_date.get(iso)
        leave_type = leave_days.get(iso)
        status = None
        if leave_type:
            status = f"leave:{leave_type}"
        elif att:
            status = att.status
        days.append({
            "date": iso,
            "day": day,
            "weekday": d.weekday(),  # 0=Mon
            "status": status,
            "check_in": att.check_in.isoformat() if att and att.check_in else None,
            "check_out": att.check_out.isoformat() if att and att.check_out else None,
            "working_hours": att.working_hours if att else None,
            "leave_type": leave_type,
        })

    # ---- Work-period statistics (this month + YTD) ----
    all_att = session.exec(
        select(Attendance).where(Attendance.user_id == current_user.id)
    ).all()
    month_att = [a for a in all_att if a.date.year == year and a.date.month == month]
    ytd_att = [a for a in all_att if a.date.year == year]

    def stats(records):
        present = sum(1 for a in records if a.status == AttendanceStatusEnum.PRESENT)
        half = sum(1 for a in records if a.status == AttendanceStatusEnum.HALF_DAY)
        absent = sum(1 for a in records if a.status == AttendanceStatusEnum.ABSENT)
        leave = sum(1 for a in records if a.status == AttendanceStatusEnum.LEAVE)
        hours = sum(a.working_hours or 0 for a in records)
        return {
            "present_days": present,
            "half_days": half,
            "absent_days": absent,
            "leave_days": leave,
            "total_working_hours": round(hours, 1),
        }

    # Leave type breakdown (approved, year)
    year_leaves = session.exec(
        select(LeaveRequest).where(
            LeaveRequest.user_id == current_user.id,
            LeaveRequest.status == LeaveStatusEnum.APPROVED,
        )
    ).all()
    leave_type_counts = defaultdict(int)
    leave_type_days = defaultdict(int)
    for lr in year_leaves:
        if lr.start_date.year == year or lr.end_date.year == year:
            leave_type_counts[lr.leave_type] += 1
            for d in _daterange(lr.start_date, lr.end_date):
                if d.year == year:
                    leave_type_days[lr.leave_type] += 1

    return {
        "year": year,
        "month": month,
        "month_name": cal_mod.month_name[month],
        "days": days,
        "stats_month": stats(month_att),
        "stats_ytd": stats(ytd_att),
        "leave_breakdown_ytd": {
            "by_request_count": dict(leave_type_counts),
            "by_days": dict(leave_type_days),
        },
        "legend": {
            "present": "Present",
            "half-day": "Half-day",
            "absent": "Absent",
            "leave:Paid": "Paid Time Off",
            "leave:Sick": "Sick Leave",
            "leave:Unpaid": "Unpaid Leave",
        },
    }
