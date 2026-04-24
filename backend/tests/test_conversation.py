import json

from app.services.conversation import _parse_response


def test_valid_json_returns_reply_and_correction():
    raw = json.dumps({"reply": "Hi there!", "correction": "Hello!"})
    assert _parse_response(raw) == ("Hi there!", "Hello!")


def test_correction_null_returns_none():
    raw = json.dumps({"reply": "Hi there!", "correction": None})
    assert _parse_response(raw) == ("Hi there!", None)


def test_json_code_fence_is_stripped():
    raw = '```json\n{"reply": "Hello there!", "correction": null}\n```'
    assert _parse_response(raw) == ("Hello there!", None)


def test_plain_code_fence_is_stripped():
    raw = '```\n{"reply": "Hello!", "correction": "Hey!"}\n```'
    assert _parse_response(raw) == ("Hello!", "Hey!")


def test_invalid_json_returns_raw_with_no_correction():
    raw = "not valid json at all"
    assert _parse_response(raw) == ("not valid json at all", None)


def test_empty_reply_falls_back_to_raw_but_keeps_correction():
    raw = '{"reply": "", "correction": "Fixed!"}'
    reply, correction = _parse_response(raw)
    assert reply == raw
    assert correction == "Fixed!"


def test_whitespace_only_correction_is_treated_as_none():
    raw = '{"reply": "Hi there!", "correction": "   "}'
    reply, correction = _parse_response(raw)
    assert reply == "Hi there!"
    assert correction == ""
