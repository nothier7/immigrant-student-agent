from datetime import date

from discovery.batch import _normalize_candidate, _tags_from_search_result, search_queries_for_run
from discovery.schema import Candidate
from discovery.search import SearchResult


def test_search_queries_rotate_with_limit():
    queries = search_queries_for_run(date(2026, 6, 20), limit=3)

    assert len(queries) == 3
    assert len(set(queries)) == 3


def test_search_result_tags_are_in_fixed_vocabulary():
    result = SearchResult(
        query="DACA scholarship deadline",
        title="Scholarship for undocumented students",
        url="https://example.edu/scholarship",
        description="Financial aid for Dreamers and DACA recipients.",
    )

    assert _tags_from_search_result(result) == ["scholarship", "daca", "undocumented", "financial-aid"]


def test_normalize_candidate_resolves_relative_url_and_filters_tags():
    candidate = Candidate(
        name="Example grant",
        url="/apply",
        description="Example description",
        tags=["financial-aid", "not-a-real-tag"],
    )

    normalized = _normalize_candidate(candidate, base_url="https://example.edu/resources/")

    assert normalized is not None
    assert normalized.url == "https://example.edu/apply"
    assert normalized.tags == ["financial-aid"]
