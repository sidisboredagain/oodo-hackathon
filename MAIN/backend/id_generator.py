"""
Auto-generate Login / Employee IDs.

Format: {COMPANY}{NAME_CODE}{YEAR}{SERIAL:04d}
Example: OIJODO20220001

  OI   = Company code (configurable)
  JODO = First 2 letters of first name + first 2 of last name
  2022 = Year of joining
  0001 = Serial number for that year
"""
from __future__ import annotations
import re
import datetime
from sqlmodel import Session, select
from models import User, EmployeeProfile

COMPANY_CODE = "OI"  # As per hackathon spec example (Odoo India style)


def _letters_only(s: str) -> str:
    return re.sub(r"[^A-Za-z]", "", s or "").upper()


def name_code_from_full_name(full_name: str) -> str:
    """JODO from 'John Doe'; single name → JOXX."""
    parts = [p for p in (full_name or "").strip().split() if p]
    if not parts:
        return "XXXX"
    first = _letters_only(parts[0])
    last = _letters_only(parts[-1]) if len(parts) > 1 else ""
    a = (first + "XX")[:2]
    b = (last + "XX")[:2] if last else "XX"
    return a + b


def next_serial_for_year(session: Session, year: int) -> int:
    """Count existing employee_ids that end with this year + 4 digits, return next serial."""
    prefix_year = f"{year}"
    users = session.exec(select(User)).all()
    max_serial = 0
    # Match ...YYYY#### at end of employee_id
    pattern = re.compile(rf"{year}(\d{{4}})$")
    for u in users:
        m = pattern.search(u.employee_id or "")
        if m:
            max_serial = max(max_serial, int(m.group(1)))
    return max_serial + 1


def generate_login_id(
    session: Session,
    full_name: str,
    joining_date: datetime.date | None = None,
) -> str:
    joining_date = joining_date or datetime.date.today()
    year = joining_date.year
    code = name_code_from_full_name(full_name)
    serial = next_serial_for_year(session, year)
    return f"{COMPANY_CODE}{code}{year}{serial:04d}"
