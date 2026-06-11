# tests/test_decide.py — the deterministic core of the verifier.
# The dangerous error is a false "valid" (telling a student an expired
# scholarship is open); assert it stays at zero.

from datetime import date

from verifier.schema import DatedFact
from verifier.decide import decide_status

TODAY = date(2026, 6, 1)

CASES = [
    # Past final deadline -> stale
    ([DatedFact(date=date(2026, 2, 1), role="final_deadline", evidence="Apps due Feb 1, 2026")], "stale"),
    # Upcoming final deadline -> valid
    ([DatedFact(date=date(2026, 9, 1), role="final_deadline", evidence="Apps due Sep 1, 2026")], "valid"),
    # Only a prior-cycle date -> unverifiable (prior_cycle is not a deadline role)
    ([DatedFact(date=date(2025, 3, 1), role="prior_cycle", evidence="2024-25 deadline was Mar 1")], "unverifiable"),
    # Rolling admission, no date -> valid
    ([DatedFact(date=None, role="rolling", evidence="Applications accepted on a rolling basis")], "valid"),
    # Past priority + upcoming final -> valid (earliest upcoming selected)
    (
        [
            DatedFact(date=date(2026, 3, 1), role="priority_deadline", evidence="Priority Mar 1"),
            DatedFact(date=date(2026, 10, 15), role="final_deadline", evidence="Final Oct 15"),
        ],
        "valid",
    ),
    # No dates at all -> unverifiable
    ([], "unverifiable"),
    # Only non-deadline dates -> unverifiable
    ([DatedFact(date=date(2026, 5, 1), role="last_updated", evidence="Page updated May 1, 2026")], "unverifiable"),
    # Deadline today counts as upcoming -> valid
    ([DatedFact(date=date(2026, 6, 1), role="final_deadline", evidence="Due June 1, 2026")], "valid"),
]


def test_decide_status_cases():
    for facts, expected in CASES:
        assert decide_status(facts, TODAY).status == expected, (facts, expected)


def test_selected_deadline_is_earliest_upcoming():
    facts = [
        DatedFact(date=date(2026, 10, 15), role="final_deadline", evidence="Final Oct 15"),
        DatedFact(date=date(2026, 7, 1), role="priority_deadline", evidence="Priority Jul 1"),
    ]
    result = decide_status(facts, TODAY)
    assert result.status == "valid"
    assert result.selected_deadline == date(2026, 7, 1)


def test_false_valid_rate():
    results = [(decide_status(f, TODAY).status, exp) for f, exp in CASES]
    false_valid = sum(1 for got, exp in results if got == "valid" and exp != "valid")
    assert false_valid == 0
