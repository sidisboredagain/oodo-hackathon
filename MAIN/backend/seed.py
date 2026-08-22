"""
Dayflow HRMS — Development Seed Script
=======================================
Creates demo users, profiles, and sample data for local development.

Usage:
    cd backend
    python seed.py

Design:
- Safe to run multiple times (skips existing records).
- HR accounts are ONLY created here. The public /api/auth/register endpoint
  does NOT allow HR self-registration.
- All seeded accounts have email_verified=True (no verification step needed).

DEV LOGIN CREDENTIALS
---------------------
Role      | Email                 | Password     | Employee ID
----------|-----------------------|--------------|------------
HR        | hr@dayflow.dev        | HRAdmin2026  | HR-001
Employee  | alice@dayflow.dev     | Employee2026 | EMP-001
Employee  | bob@dayflow.dev       | Employee2026 | EMP-002
Employee  | carol@dayflow.dev     | Employee2026 | EMP-003

Production note on email verification:
- In production, replace the hardcoded verification_code="123456" with a
  call to secrets.token_urlsafe(32), store the token + expiry in the DB,
  and send the user a link via SendGrid or AWS SES.
- This endpoint then validates the token and checks expiry before marking
  email_verified=True.

Production note on JWT storage:
- In production, store JWTs in HttpOnly cookies (not localStorage) to
  prevent XSS attacks from reading the token.
"""

import sys
import os
import datetime

sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import (
    User, EmployeeProfile, Attendance, LeaveRequest,
    Payroll, Notification, RoleEnum, LeaveStatusEnum, AttendanceStatusEnum,
)
from auth import hash_password


def _create_user_and_profile(
    session: Session,
    employee_id: str,
    email: str,
    password: str,
    role: str,
    name: str,
    job_title: str,
    department: str,
    joining_date: datetime.date,
    employment_status: str = "Full-Time",
    phone: str = "",
    address: str = "",
) -> User:
    """Create a User + EmployeeProfile if they don't already exist."""
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        print(f"  [SKIP] {role:8s} already exists: {email}")
        return existing

    user = User(
        employee_id=employee_id,
        email=email,
        password_hash=hash_password(password),
        role=role,
        email_verified=True,      # Pre-verified — no verification step required for seed data
        verification_code="123456",
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    profile = EmployeeProfile(
        user_id=user.id,
        name=name,
        phone=phone,
        address=address,
        job_title=job_title,
        department=department,
        joining_date=joining_date,
        employment_status=employment_status,
    )
    session.add(profile)
    session.commit()

    print(f"  [OK]   {role:8s} created: {email}")
    return user


def main():
    print("\n" + "=" * 60)
    print("  Dayflow HRMS — Development Seed Script")
    print("=" * 60 + "\n")

    create_db_and_tables()

    with Session(engine) as session:

        # ----------------------------------------------------------------
        # 1. Users & Profiles
        # ----------------------------------------------------------------
        print("[Step 1/5] Seeding users and profiles...")

        hr = _create_user_and_profile(
            session,
            employee_id="OIMOHA20230001",  # OI + MO + HA + 2023 + 0001
            email="hr@dayflow.dev",
            password="HRAdmin2026",
            role=RoleEnum.HR,
            name="Morgan Hayes",
            job_title="HR Manager",
            department="Human Resources",
            joining_date=datetime.date(2023, 1, 15),
            phone="+1-555-0100",
            address="123 Office Park, Suite 200, New York, NY 10001",
        )

        alice = _create_user_and_profile(
            session,
            employee_id="OIALJO20240001",  # OI + AL + JO + 2024 + 0001
            email="alice@dayflow.dev",
            password="Employee2026",
            role=RoleEnum.EMPLOYEE,
            name="Alice Johnson",
            job_title="Software Engineer",
            department="Engineering",
            joining_date=datetime.date(2024, 3, 10),
            phone="+1-555-0101",
            address="45 Maple Street, Austin, TX 78701",
        )

        bob = _create_user_and_profile(
            session,
            employee_id="OIBOMA20240002",  # OI + BO + MA + 2024 + 0002
            email="bob@dayflow.dev",
            password="Employee2026",
            role=RoleEnum.EMPLOYEE,
            name="Bob Martinez",
            job_title="Product Designer",
            department="Design",
            joining_date=datetime.date(2024, 6, 1),
            phone="+1-555-0102",
            address="78 Pine Avenue, San Francisco, CA 94102",
        )

        carol = _create_user_and_profile(
            session,
            employee_id="OICACH20230002",  # OI + CA + CH + 2023 + 0002
            email="carol@dayflow.dev",
            password="Employee2026",
            role=RoleEnum.EMPLOYEE,
            name="Carol Chen",
            job_title="Data Analyst",
            department="Analytics",
            joining_date=datetime.date(2023, 9, 20),
            phone="+1-555-0103",
            address="12 Oak Lane, Seattle, WA 98101",
        )

        employees = [alice, bob, carol]

        # ----------------------------------------------------------------
        # 2. Attendance (last 7 days for each employee)
        # ----------------------------------------------------------------
        print("[Step 2/5] Seeding attendance records...")
        today = datetime.date.today()

        for emp in employees:
            for days_ago in range(7):
                att_date = today - datetime.timedelta(days=days_ago)
                exists = session.exec(
                    select(Attendance).where(
                        Attendance.user_id == emp.id,
                        Attendance.date == att_date,
                    )
                ).first()
                if exists:
                    continue

                # Day 3 ago = half day, otherwise full day
                if days_ago == 3:
                    check_in = datetime.datetime.combine(att_date, datetime.time(9, 0))
                    check_out = datetime.datetime.combine(att_date, datetime.time(13, 0))
                    att_status = AttendanceStatusEnum.HALF_DAY
                else:
                    check_in = datetime.datetime.combine(att_date, datetime.time(9, 0))
                    check_out = datetime.datetime.combine(att_date, datetime.time(17, 30))
                    att_status = AttendanceStatusEnum.PRESENT

                session.add(Attendance(
                    user_id=emp.id,
                    date=att_date,
                    check_in=check_in,
                    check_out=check_out,
                    status=att_status,
                    working_hours=round((check_out - check_in).seconds / 3600, 2),
                ))
        session.commit()
        print("  [OK] Attendance seeded (7 days × 3 employees).")

        # ----------------------------------------------------------------
        # 3. Leave Requests
        # ----------------------------------------------------------------
        print("[Step 3/5] Seeding leave requests...")

        leave_samples = [
            (alice.id, "Paid", today - datetime.timedelta(days=14),
             today - datetime.timedelta(days=12), LeaveStatusEnum.APPROVED, "Family event"),
            (bob.id, "Sick", today - datetime.timedelta(days=5),
             today - datetime.timedelta(days=4), LeaveStatusEnum.APPROVED, "Flu recovery"),
            (carol.id, "Paid", today + datetime.timedelta(days=7),
             today + datetime.timedelta(days=9), LeaveStatusEnum.PENDING, "Vacation"),
            (alice.id, "Unpaid", today + datetime.timedelta(days=20),
             today + datetime.timedelta(days=20), LeaveStatusEnum.PENDING, "Personal errand"),
        ]

        for user_id, leave_type, start, end, lst, remarks in leave_samples:
            exists = session.exec(
                select(LeaveRequest).where(
                    LeaveRequest.user_id == user_id,
                    LeaveRequest.start_date == start,
                )
            ).first()
            if not exists:
                session.add(LeaveRequest(
                    user_id=user_id,
                    leave_type=leave_type,
                    start_date=start,
                    end_date=end,
                    status=lst,
                    remarks=remarks,
                    admin_comment="Approved by HR" if lst == LeaveStatusEnum.APPROVED else "",
                ))
        session.commit()
        print("  [OK] Leave requests seeded (4 records).")

        # ----------------------------------------------------------------
        # 4. Payroll
        # ----------------------------------------------------------------
        print("[Step 4/5] Seeding payroll records...")

        payroll_data = [
            (hr.id,    95000, 8000, 2500),
            (alice.id, 85000, 5000, 2000),
            (bob.id,   72000, 4000, 1800),
            (carol.id, 68000, 3500, 1700),
        ]

        for user_id, base, allowances, deductions in payroll_data:
            exists = session.exec(
                select(Payroll).where(Payroll.user_id == user_id)
            ).first()
            if not exists:
                session.add(Payroll(
                    user_id=user_id,
                    base_salary=base,
                    allowances=allowances,
                    deductions=deductions,
                    net_salary=base + allowances - deductions,
                ))
        session.commit()
        print("  [OK] Payroll seeded (4 records).")

        # ----------------------------------------------------------------
        # 5. Notifications
        # ----------------------------------------------------------------
        print("[Step 5/5] Seeding notifications...")

        notification_data = [
            (alice.id, "Welcome to Dayflow!", "Your account is ready. Explore your dashboard."),
            (alice.id, "Leave Approved", "Your Paid leave for the family event has been approved."),
            (bob.id,   "Welcome to Dayflow!", "Your account is ready. Explore your dashboard."),
            (bob.id,   "Leave Approved", "Your Sick leave request has been approved."),
            (carol.id, "Welcome to Dayflow!", "Your account is ready. Explore your dashboard."),
            (carol.id, "Leave Pending", "Your vacation request is awaiting HR review."),
            (hr.id,    "Pending Leave Requests", "2 leave requests need your attention."),
            (hr.id,    "New Employee", "Carol Chen has joined the Analytics department."),
        ]

        for user_id, title, message in notification_data:
            exists = session.exec(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.title == title,
                )
            ).first()
            if not exists:
                session.add(Notification(user_id=user_id, title=title, message=message))
        session.commit()
        print("  [OK] Notifications seeded (8 records).")

    # Print credentials summary
    print("\n" + "=" * 60)
    print("  SEED COMPLETE — DEV LOGIN CREDENTIALS")
    print("=" * 60)
    print(f"  {'Role':<10}  {'Email':<25}  {'Password':<14}  {'Emp ID'}")
    print(f"  {'-'*10}  {'-'*25}  {'-'*14}  {'-'*7}")
    print(f"  {'HR':<10}  {'OIMOHA20230001':<18}  {'HRAdmin2026':<14}  Morgan Hayes")
    print(f"  {'Employee':<10}  {'OIALJO20240001':<18}  {'Employee2026':<14}  Alice Johnson")
    print(f"  {'Employee':<10}  {'OIBOMA20240002':<18}  {'Employee2026':<14}  Bob Martinez")
    print(f"  {'Employee':<10}  {'OICACH20230002':<18}  {'Employee2026':<14}  Carol Chen")
    print("=" * 60)
    print("\n  Notes:")
    print("  - Login with LOGIN ID (not email), e.g. OIALJO20240001")
    print("  - All seeded accounts have email_verified=True.")
    print("  - Login ID format: OI + name code + year + serial\n")


def seed_if_empty():
    """Called on app startup — seeds demo data only when the DB has no users."""
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(User)).first()
        if existing:
            return  # already populated
    main()


if __name__ == "__main__":
    main()
