import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, desc, func

from database import get_session
from models import (
    User, EmployeeProfile, Attendance, LeaveRequest,
    Payroll, Notification, RoleEnum, LeaveStatusEnum, AttendanceStatusEnum
)
from auth import get_current_user, require_role

router = APIRouter(prefix="/dashboard", tags=["Dashboard Statistics"])


@router.get("/hr", dependencies=[Depends(require_role([RoleEnum.HR]))])
def get_hr_dashboard_stats(session: Session = Depends(get_session)):
    """
    HR Dashboard live aggregated statistics calculated directly from SQLite database.
    """
    today = datetime.date.today()

    # Total employees
    employees = session.exec(select(User).where(User.role == RoleEnum.EMPLOYEE)).all()
    total_employees = len(employees)

    # Today's attendance
    today_attendances = session.exec(
        select(Attendance).where(Attendance.date == today)
    ).all()

    present_count = 0
    half_day_count = 0
    on_leave_count = 0

    for a in today_attendances:
        if a.status == AttendanceStatusEnum.PRESENT:
            present_count += 1
        elif a.status == AttendanceStatusEnum.HALF_DAY:
            half_day_count += 1
        elif a.status == AttendanceStatusEnum.LEAVE:
            on_leave_count += 1

    total_present = present_count + half_day_count
    absent_count = max(0, total_employees - total_present)

    # Pending leave requests
    pending_leaves = session.exec(
        select(LeaveRequest).where(LeaveRequest.status == LeaveStatusEnum.PENDING)
    ).all()
    pending_leaves_count = len(pending_leaves)

    # Department breakdown
    profiles = session.exec(select(EmployeeProfile)).all()
    dept_map = {}
    for p in profiles:
        user = session.get(User, p.user_id)
        if user and user.role == RoleEnum.EMPLOYEE:
            dept = p.department or "General"
            dept_map[dept] = dept_map.get(dept, 0) + 1

    department_summary = [{"name": dept, "count": count} for dept, count in dept_map.items()]

    # Total monthly payroll estimated
    payrolls = session.exec(select(Payroll)).all()
    total_payroll = sum(p.net_salary for p in payrolls)

    # Recent leave requests (up to 5)
    recent_leaves_records = session.exec(
        select(LeaveRequest).order_by(desc(LeaveRequest.created_at)).limit(5)
    ).all()

    recent_leaves = []
    for r in recent_leaves_records:
        user = session.get(User, r.user_id)
        profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == r.user_id)).first()
        recent_leaves.append({
            "id": r.id,
            "user_id": r.user_id,
            "name": profile.name if profile else "Unknown",
            "employee_id": user.employee_id if user else "",
            "department": profile.department if profile else "",
            "leave_type": r.leave_type,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "days": (r.end_date - r.start_date).days + 1,
            "status": r.status,
            "remarks": r.remarks or "",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    # Recent attendance check-ins (today)
    recent_attendance = []
    for a in today_attendances[:5]:
        user = session.get(User, a.user_id)
        profile = session.exec(select(EmployeeProfile).where(EmployeeProfile.user_id == a.user_id)).first()
        recent_attendance.append({
            "id": a.id,
            "user_id": a.user_id,
            "name": profile.name if profile else "",
            "department": profile.department if profile else "",
            "check_in": a.check_in.strftime("%H:%M:%S") if a.check_in else None,
            "status": a.status,
        })

    return {
        "total_employees": total_employees,
        "present_today": total_present,
        "absent_today": absent_count,
        "pending_leaves_count": pending_leaves_count,
        "total_payroll": total_payroll,
        "department_summary": department_summary,
        "recent_leaves": recent_leaves,
        "recent_attendance": recent_attendance,
    }


@router.get("/employee")
def get_employee_dashboard_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Employee Dashboard live statistics calculated directly from SQLite database.
    """
    today = datetime.date.today()
    first_day_of_month = datetime.date(today.year, today.month, 1)

    profile = session.exec(
        select(EmployeeProfile).where(EmployeeProfile.user_id == current_user.id)
    ).first()

    # Today's attendance
    today_record = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date == today
        )
    ).first()

    # Days present this month
    monthly_records = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date >= first_day_of_month,
            Attendance.status.in_([AttendanceStatusEnum.PRESENT, AttendanceStatusEnum.HALF_DAY])
        )
    ).all()
    monthly_present_days = len(monthly_records)

    # Leave calculations
    user_leaves = session.exec(
        select(LeaveRequest)
        .where(LeaveRequest.user_id == current_user.id)
        .order_by(desc(LeaveRequest.created_at))
    ).all()

    paid_allowance = 18
    sick_allowance = 10
    paid_used = 0
    sick_used = 0
    pending_count = 0

    for l in user_leaves:
        days = (l.end_date - l.start_date).days + 1
        if l.status == LeaveStatusEnum.APPROVED:
            if l.leave_type.lower() == "paid":
                paid_used += days
            elif l.leave_type.lower() == "sick":
                sick_used += days
        elif l.status == LeaveStatusEnum.PENDING:
            pending_count += 1

    paid_remaining = max(0, paid_allowance - paid_used)
    sick_remaining = max(0, sick_allowance - sick_used)

    # Recent leaves (top 5)
    recent_leaves = []
    for l in user_leaves[:5]:
        recent_leaves.append({
            "id": l.id,
            "leave_type": l.leave_type,
            "start_date": str(l.start_date),
            "end_date": str(l.end_date),
            "days": (l.end_date - l.start_date).days + 1,
            "status": l.status,
            "remarks": l.remarks or "",
            "admin_comment": l.admin_comment or "",
            "created_at": l.created_at.isoformat() if l.created_at else None,
        })

    # Notifications (top 5)
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(5)
    ).all()

    notifs_list = [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]

    return {
        "profile": {
            "name": profile.name if profile else current_user.email,
            "job_title": profile.job_title if profile else "Team Member",
            "department": profile.department if profile else "General",
            "employment_status": profile.employment_status if profile else "Full-Time",
            "joining_date": str(profile.joining_date) if profile and profile.joining_date else None,
        },
        "today_attendance": {
            "is_checked_in": today_record is not None and today_record.check_in is not None,
            "is_checked_out": today_record is not None and today_record.check_out is not None,
            "check_in": today_record.check_in.strftime("%H:%M:%S") if today_record and today_record.check_in else None,
            "check_out": today_record.check_out.strftime("%H:%M:%S") if today_record and today_record.check_out else None,
            "working_hours": today_record.working_hours if today_record else 0.0,
            "status": today_record.status if today_record else "Not Clocked In",
        },
        "monthly_present_days": monthly_present_days,
        "leave_summary": {
            "paid_allowance": paid_allowance,
            "paid_remaining": paid_remaining,
            "paid_used": paid_used,
            "sick_allowance": sick_allowance,
            "sick_remaining": sick_remaining,
            "sick_used": sick_used,
            "pending_count": pending_count,
        },
        "recent_leaves": recent_leaves,
        "notifications": notifs_list,
    }
