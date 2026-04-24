from app.routers.chat import _split_sentences


def test_single_sentence_without_boundary_stays_in_remainder():
    sentences, remainder = _split_sentences("Hello world.")
    assert sentences == []
    assert remainder == "Hello world."


def test_period_space_capital_splits_sentence():
    sentences, remainder = _split_sentences("First sentence. Second sentence.")
    assert sentences == ["First sentence."]
    assert remainder == "Second sentence."


def test_exclamation_mark_splits_sentence():
    sentences, remainder = _split_sentences("What a day! Next part here.")
    assert sentences == ["What a day!"]
    assert remainder == "Next part here."


def test_question_mark_splits_sentence():
    sentences, remainder = _split_sentences("How are you? I am doing fine.")
    assert sentences == ["How are you?"]
    assert remainder == "I am doing fine."


def test_candidate_below_ten_chars_is_kept_in_remainder():
    sentences, remainder = _split_sentences("Hi. Next is a longer line.")
    assert sentences == []
    assert remainder == "Hi. Next is a longer line."


def test_lowercase_after_punctuation_is_not_a_split_point():
    buf = "Long enough sentence. continues in lowercase."
    sentences, remainder = _split_sentences(buf)
    assert sentences == []
    assert remainder == buf


def test_multiple_sentences_are_all_split():
    buf = "First long one. Second long one! Third continues here."
    sentences, remainder = _split_sentences(buf)
    assert sentences == ["First long one.", "Second long one!"]
    assert remainder == "Third continues here."


def test_empty_input_returns_empty_results():
    sentences, remainder = _split_sentences("")
    assert sentences == []
    assert remainder == ""
