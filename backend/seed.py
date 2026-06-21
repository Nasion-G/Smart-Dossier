"""
Seed the database with demo users and 8 sample cases.

    python seed.py

Demo accounts created:
  Clerk:   clerk@ekb.gov  / test1234
  Clerk:   clerk2@ekb.gov / test1234
  Citizen: alice@mail.com / test1234   (cases: 0001, 0005)
  Citizen: bob@mail.com   / test1234   (cases: 0002, 0006)
  Citizen: carol@mail.com / test1234   (cases: 0003, 0007)
  Citizen: david@mail.com / test1234   (cases: 0004, 0008)
"""

import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from config import settings
from models import Base, User, Case, PhaseLog
from auth import hash_password

PHASE_LABELS = {
    1: "Public notice",
    2: "Citizen application",
    3: "Legal verification (ASHK)",
    4: "Value calculation",
    5: "Contract signing",
    6: "File transfer to ASHK",
    7: "Property registration",
}


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:

        # ── Users ─────────────────────────────────────────────────────────────
        users_raw = [
            ("clerk@ekb.gov",   "test1234", "Laura Mitchell",   "clerk"),
            ("clerk2@ekb.gov",  "test1234", "Kevin Blake",      "clerk"),
            ("alice@mail.com",  "test1234", "Alice Johnson",    "citizen"),
            ("bob@mail.com",    "test1234", "Bob Williams",     "citizen"),
            ("carol@mail.com",  "test1234", "Carol Davis",      "citizen"),
            ("david@mail.com",  "test1234", "David Martinez",   "citizen"),
        ]

        users: dict[str, User] = {}
        for email, pwd, name, role in users_raw:
            u = User(email=email, password_hash=hash_password(pwd),
                     full_name=name, role=role)
            db.add(u)
            await db.flush()
            users[email] = u

        clerk = users["clerk@ekb.gov"]

        # ── Cases ─────────────────────────────────────────────────────────────
        cases_data = [
            # (seq, title, phase, days_in_phase, citizen_email, owner, pid, zone, income)
            (1, "Johnson Family — Unit 4B",         3, 18, "alice@mail.com",
             "Alice Johnson",  "P-2024-001", "Vasil Shanto Zone, Tirana",    "Category B"),
            (2, "Williams Family — Villa North",     6, 35, "bob@mail.com",
             "Bob Williams",   "P-2024-002", "Northern District, Tirana",     "Category A"),
            (3, "Davis Family — Unit 2A",            2,  3, "carol@mail.com",
             "Carol Davis",    "P-2024-003", "Don Bosko Zone, Tirana",        "Category C"),
            (4, "Martinez Family — Commercial Unit", 4, 20, "david@mail.com",
             "David Martinez", "P-2024-004", "Central Block, Tirana",         "Category B"),
            (5, "Johnson Family — Unit 7C",          5, 16, "alice@mail.com",
             "Alice Johnson",  "P-2024-005", "Vaqarr, Tirana",                "Category A"),
            (6, "Williams Family — Agricultural Land", 1, 1, "bob@mail.com",
             None,             None,          "Durres Region",                 None),
            (7, "Davis Family — Garage Unit",        7,  0, "carol@mail.com",
             "Carol Davis",    "P-2023-099", "Kombinat, Tirana",              "Category C"),
            (8, "Martinez Family — Unit 1D",         3, 22, "david@mail.com",
             "David Martinez", "P-2024-008", "Xhamlliku, Tirana",             "Category B"),
        ]

        for seq, title, phase, days_ago, citizen_email, owner, pid, zone, income in cases_data:
            entered = datetime.now(timezone.utc) - timedelta(days=days_ago)
            case = Case(
                code=f"EKB-2026-{seq:04d}",
                title=title,
                owner_name=owner,
                property_id=pid,
                zone=zone,
                income_bracket=income,
                current_phase=phase,
                status="completed" if phase == 7 else "active",
                phase_entered_at=entered,
                assigned_to=clerk.id,
                citizen_id=users[citizen_email].id,
            )
            db.add(case)
            await db.flush()

            # Create log entries for all completed phases
            for p in range(1, phase + 1):
                phase_entered = entered - timedelta(days=(phase - p) * 7)
                phase_exited  = phase_entered + timedelta(days=6) if p < phase else None
                db.add(PhaseLog(
                    case_id=case.id,
                    phase=p,
                    entered_at=phase_entered,
                    exited_at=phase_exited,
                    notes=f"Moved to {PHASE_LABELS[p]}" if p > 1 else "Case opened",
                    changed_by=clerk.id,
                ))

        await db.commit()

    await engine.dispose()

    print("\n✓ Database seeded successfully!\n")
    print("Demo accounts:")
    print("  Clerk:   clerk@ekb.gov  / test1234")
    print("  Clerk:   clerk2@ekb.gov / test1234")
    print("  Citizen: alice@mail.com / test1234   (cases EKB-2026-0001, 0005)")
    print("  Citizen: bob@mail.com   / test1234   (cases EKB-2026-0002, 0006)")
    print("  Citizen: carol@mail.com / test1234   (cases EKB-2026-0003, 0007)")
    print("  Citizen: david@mail.com / test1234   (cases EKB-2026-0004, 0008)")
    print("\nCases by phase:")
    print("  Phase 1: EKB-2026-0006 — Williams Family Agricultural Land (1d, on track)")
    print("  Phase 2: EKB-2026-0003 — Davis Family Unit 2A (3d, on track)")
    print("  Phase 3: EKB-2026-0001 — Johnson Family Unit 4B (18d, BLOCKED)")
    print("  Phase 3: EKB-2026-0008 — Martinez Family Unit 1D (22d, BLOCKED)")
    print("  Phase 4: EKB-2026-0004 — Martinez Family Commercial Unit (20d, BLOCKED)")
    print("  Phase 5: EKB-2026-0005 — Johnson Family Unit 7C (16d, BLOCKED)")
    print("  Phase 6: EKB-2026-0002 — Williams Family Villa North (35d, BLOCKED)")
    print("  Phase 7: EKB-2026-0007 — Davis Family Garage Unit (COMPLETED)")
    print("\n  5 blocked / 7 active / 1 completed = 8 total")


if __name__ == "__main__":
    asyncio.run(seed())
