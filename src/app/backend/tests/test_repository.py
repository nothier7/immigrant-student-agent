from bank.repository import _strip_nul


def test_strip_nul_recurses_through_verification_payload():
    payload = {
        "reason": "valid\x00 reason",
        "dated_facts": [
            {
                "evidence": "Deadline evidence\x00 from fetched page",
                "role": "final_deadline",
            }
        ],
    }

    assert _strip_nul(payload) == {
        "reason": "valid reason",
        "dated_facts": [
            {
                "evidence": "Deadline evidence from fetched page",
                "role": "final_deadline",
            }
        ],
    }
