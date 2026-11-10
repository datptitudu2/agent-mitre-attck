"""Unit test Phase 4–6: Kiểm chứng toàn bộ nội dung Cases YAML, Lessons Markdown, Quizzes, Glossary & chuẩn Navigator Layer v4.5."""

from apps.api.app.routers.cases_and_content import (
    load_case_yaml_files,
    load_glossary_terms,
    load_lesson_markdown_files,
    load_quizzes_map,
)


def test_cases_yaml_dynamic_lookup_and_defensive_safety():
    cases = load_case_yaml_files()
    assert len(cases) >= 6

    slugs = {c["slug"] for c in cases}
    assert {
        "solarwinds-compromise",
        "notpetya-wiper",
        "operation-dream-job",
        "ukraine-ics-power-grid",
        "apt32-oceanlotus",
        "ai-enterprise-assistant-v20",
    }.issubset(slugs)

    for c in cases:
        assert c.get("lookup_name"), f"Case {c['slug']} thiếu lookup_name"
        steps = c.get("steps") or []
        assert len(steps) >= 5, f"Case {c['slug']} cần tối thiểu 5 bước"
        for s in steps:
            # Đảm bảo tra cứu theo tên, không hard-code STIX UUID
            tname = s.get("technique_name", "")
            assert tname and not tname.startswith("attack-pattern--")
            assert s.get("plain_vi") and s.get("defender_vi") and s.get("telemetry_vi")

    ai_case = next(c for c in cases if c["slug"] == "ai-enterprise-assistant-v20")
    assert ai_case["is_hypothetical"] is True
    assert "GIẢ ĐỊNH" in ai_case["disclaimer_vi"].upper()


def test_curriculum_lessons_quizzes_and_glossary_complete():
    lessons = load_lesson_markdown_files()
    quizzes = load_quizzes_map()
    glossary = load_glossary_terms()

    assert len(lessons) == 8
    assert len(glossary) >= 10

    for lesson in lessons:
        assert lesson["slug"] in quizzes, f"Bài {lesson['slug']} chưa có câu hỏi quiz"
        q_list = quizzes[lesson["slug"]]
        assert len(q_list) >= 1
        for q in q_list:
            assert 0 <= q["correct_index"] < len(q["options"])
            assert q.get("explanation_vi")

