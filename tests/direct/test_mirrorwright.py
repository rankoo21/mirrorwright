import json

from conftest import (
    cohere_response,
    contradict_locked_response,
    contradict_unlocked_response,
    answer_response,
    low_confidence_answer_response,
    unfaithful_answer_response,
    token_stuffed_answer_response,
    audit_response,
)


ANSWER_PAT = r"(?s)^You speak as a specific person.*"
AUDIT_PAT = r"(?s)^FAITHFULNESS AUDIT.*"


def _mock_answer_calls(direct_vm, answer_json, audit_json=None):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(AUDIT_PAT, audit_json or audit_response())
    direct_vm.mock_llm(ANSWER_PAT, answer_json)


# ---------------------------------------------------------------------------
# open_mirror
# ---------------------------------------------------------------------------

def test_open_mirror_creates_dim_empty_persona(deploy):
    mirror_id = deploy.open_mirror(1000)
    mirror = deploy.get_mirror(mirror_id)
    assert mirror is not None
    assert mirror["state"] == "dim"
    assert mirror["fragmentCount"] == 0
    assert mirror["answerCount"] == 0
    assert mirror["persona"]["clarity"] == 0
    assert mirror["persona"]["lockedTraits"] == []


def test_open_mirror_is_idempotent_per_owner(deploy):
    first = deploy.open_mirror(1000)
    second = deploy.open_mirror(2000)
    assert first == second


# ---------------------------------------------------------------------------
# feed_fragment
# ---------------------------------------------------------------------------

def test_feed_fragment_coheres_and_forms(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    result = deploy.feed_fragment(
        mirror_id,
        "When people ask me for advice, I slow down and ask what they are afraid of first.",
        "voice",
        2000,
    )
    assert result["relation"] == "coheres"
    assert result["state"] in ("forming", "resolved")
    mirror = deploy.get_mirror(mirror_id)
    assert mirror["fragmentCount"] == 1
    assert mirror["persona"]["clarity"] > 0
    frags = deploy.get_fragments(mirror_id, 0, 20)
    assert len(frags) == 1
    assert frags[0]["kind"] == "voice"


def test_feed_fragment_requires_owner(deploy, direct_vm, direct_bob):
    mirror_id = deploy.open_mirror(1000)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only you may feed or correct"):
        deploy.feed_fragment(mirror_id, "I tend to overthink small choices.", "habit", 2000)


def test_feed_fragment_rejects_too_short(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    with direct_vm.expect_revert("needs a fragment"):
        deploy.feed_fragment(mirror_id, "no", "habit", 2000)


def test_locked_trait_locks_after_repeats_then_blocks_contradiction(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    # Feed the same trait twice so it crosses the lock threshold.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", cohere_response(traits=["slows down"], themes=["advice"]))
    deploy.feed_fragment(mirror_id, "I always slow down before I answer anyone.", "habit", 2000)
    deploy.feed_fragment(mirror_id, "I keep slowing down, never rushing a reply.", "habit", 3000)

    persona = deploy.get_persona(mirror_id)
    assert "slows down" in persona["lockedTraits"]

    # A fragment that contradicts a locked trait is refused outside correction.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", contradict_locked_response())
    with direct_vm.expect_revert("contradicts a locked trait"):
        deploy.feed_fragment(mirror_id, "Actually I give clean fast answers every time.", "voice", 4000)


def test_unlocked_contradiction_is_held_not_hidden(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    deploy.feed_fragment(mirror_id, "I slow down and ask what people fear.", "voice", 2000)

    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", contradict_unlocked_response())
    result = deploy.feed_fragment(mirror_id, "Sometimes I just blurt the first thing fast.", "voice", 3000)
    assert result["relation"] == "contradicts"
    mirror = deploy.get_mirror(mirror_id)
    assert mirror["state"] == "contested"
    assert len(mirror["persona"]["heldContradictions"]) >= 1


# ---------------------------------------------------------------------------
# ask
# ---------------------------------------------------------------------------

def test_ask_answers_in_voice(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    # Build enough of a persona so clarity clears the answer floor.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", cohere_response(traits=["asks what they fear", "slows down"]))
    deploy.feed_fragment(mirror_id, "I slow down and ask what they fear before advising.", "voice", 2000)
    deploy.feed_fragment(mirror_id, "I never give a clean answer; I sit in the question.", "voice", 3000)

    _mock_answer_calls(direct_vm, answer_response())
    result = deploy.ask(mirror_id, "How should I make a hard decision?", "0xabc", 4000)
    assert result["answer"] != ""
    assert result["note"] == "It answered in your voice."

    answers = deploy.get_answers(mirror_id, 0, 20)
    assert len(answers) == 1
    assert answers[0]["question"] == "How should I make a hard decision?"
    assert answers[0]["mockTxHash"] == "0xabc"


def test_ask_refuses_when_too_dim(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    with direct_vm.expect_revert("too dim to answer"):
        deploy.ask(mirror_id, "What should I do?", "0x0", 2000)


def _build_persona_for_ask(deploy, direct_vm):
    """Feed enough coherent fragments that the mirror can answer."""
    mirror_id = deploy.open_mirror(1000)
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", cohere_response(traits=["asks what they fear", "slows down"]))
    deploy.feed_fragment(mirror_id, "I slow down and ask what they fear before advising.", "voice", 2000)
    deploy.feed_fragment(mirror_id, "I never give a clean answer; I sit in the question.", "voice", 3000)
    return mirror_id


def test_ask_rejects_low_confidence_answer_not_stored(deploy, direct_vm):
    # A hedged, low-confidence leader answer must be refused by the confidence
    # gate and never persisted.
    mirror_id = _build_persona_for_ask(deploy, direct_vm)
    _mock_answer_calls(direct_vm, low_confidence_answer_response(confidence=30))
    with direct_vm.expect_revert("too unsure to answer"):
        deploy.ask(mirror_id, "How should I make a hard decision?", "0xabc", 4000)
    answers = deploy.get_answers(mirror_id, 0, 20)
    assert len(answers) == 0


def test_ask_rejects_unfaithful_answer_not_stored(deploy, direct_vm):
    # A confident answer that ignores the stored persona (generic voice) must be
    # refused by the faithfulness gate and never persisted.
    mirror_id = _build_persona_for_ask(deploy, direct_vm)
    _mock_answer_calls(direct_vm, unfaithful_answer_response(confidence=90))
    with direct_vm.expect_revert("did not match your voice"):
        deploy.ask(mirror_id, "How should I make a hard decision?", "0xabc", 4000)
    answers = deploy.get_answers(mirror_id, 0, 20)
    assert len(answers) == 0


# ---------------------------------------------------------------------------
# comparative validator: substance, not shape
# ---------------------------------------------------------------------------

def test_feed_validator_agrees_on_matching_substance(deploy, direct_vm):
    # Two nodes that read the same coherence band and the same persona field
    # updates agree. The captured validator re-runs the (same) leader mock and
    # compares against a matching leader_result.
    mirror_id = deploy.open_mirror(1000)
    direct_vm.clear_mocks()
    matching = json.loads(cohere_response(traits=["slows down"], themes=["advice"]))
    direct_vm.mock_llm(r".*", json.dumps(matching))
    deploy.feed_fragment(mirror_id, "I slow down before answering anyone.", "habit", 2000)
    assert direct_vm.run_validator(leader_result=matching) is True


def test_feed_validator_disagrees_on_contradictory_persona_update(deploy, direct_vm):
    # Same coherence band, but the peer leader would rewrite the persona with a
    # different tone/cadence and different traits/themes. The comparative
    # validator must disagree, because these values drive stored state.
    mirror_id = deploy.open_mirror(1000)
    direct_vm.clear_mocks()
    mine = json.loads(cohere_response(
        coherence=80, tone="measured and warm", cadence="slow and deliberate",
        themes=["advice"], anchors=["patience"], traits=["slows down"],
    ))
    direct_vm.mock_llm(r".*", json.dumps(mine))
    deploy.feed_fragment(mirror_id, "I slow down before answering anyone.", "habit", 2000)

    theirs = json.loads(cohere_response(
        coherence=78, tone="blunt and abrasive", cadence="clipped and fast",
        themes=["speed"], anchors=["efficiency"], traits=["fires back instantly"],
    ))
    assert direct_vm.run_validator(leader_result=theirs) is False


def test_feed_validator_disagrees_on_relation_mismatch(deploy, direct_vm):
    # Same numeric band but a different relation word rewrites which branch the
    # state update takes, so the validator disagrees.
    mirror_id = deploy.open_mirror(1000)
    direct_vm.clear_mocks()
    mine = json.loads(cohere_response(coherence=80, traits=["slows down"]))
    direct_vm.mock_llm(r".*", json.dumps(mine))
    deploy.feed_fragment(mirror_id, "I slow down before answering anyone.", "habit", 2000)

    theirs = dict(mine)
    theirs["relation"] = "extends"
    assert direct_vm.run_validator(leader_result=theirs) is False


def test_ask_validator_rejects_unfaithful_leader_result(deploy, direct_vm):
    # The validator re-runs a faithful answer (current mock) but is handed an
    # unfaithful peer result; it must disagree.
    mirror_id = _build_persona_for_ask(deploy, direct_vm)
    _mock_answer_calls(direct_vm, answer_response())
    deploy.ask(mirror_id, "How should I make a hard decision?", "0xabc", 4000)
    unfaithful = json.loads(unfaithful_answer_response(confidence=90))
    assert direct_vm.run_validator(leader_result=unfaithful) is False


def test_ask_validator_rejects_low_confidence_leader_result(deploy, direct_vm):
    mirror_id = _build_persona_for_ask(deploy, direct_vm)
    _mock_answer_calls(direct_vm, answer_response())
    deploy.ask(mirror_id, "How should I make a hard decision?", "0xdef", 4000)
    hedged = json.loads(low_confidence_answer_response(confidence=30))
    assert direct_vm.run_validator(leader_result=hedged) is False


def test_ask_validator_rejects_token_stuffed_contradictory_answer(deploy, direct_vm):
    # One copied persona phrase cannot launder a long contradictory passage.
    mirror_id = _build_persona_for_ask(deploy, direct_vm)
    _mock_answer_calls(direct_vm, answer_response())
    deploy.ask(mirror_id, "How should I make a hard decision?", "0xfeed", 4000)
    stuffed = json.loads(token_stuffed_answer_response())
    assert direct_vm.run_validator(leader_result=stuffed) is False


def test_ask_validator_rejects_answer_failed_by_independent_audit(deploy, direct_vm):
    # Even a lexically similar answer is rejected when the independent audit
    # finds that its exact prose contradicts the stored fingerprint.
    mirror_id = _build_persona_for_ask(deploy, direct_vm)
    _mock_answer_calls(
        direct_vm,
        answer_response(),
        audit_response(faithful=True, question_relevant=True, no_contradiction=False),
    )
    deploy.ask(mirror_id, "How should I make a hard decision?", "0xa11d", 4000)
    assert direct_vm.run_validator(leader_result=json.loads(answer_response())) is False


# ---------------------------------------------------------------------------
# correct (owner-only)
# ---------------------------------------------------------------------------

def test_correct_is_owner_only(deploy, direct_vm, direct_bob):
    mirror_id = deploy.open_mirror(1000)
    deploy.feed_fragment(mirror_id, "I slow down before I answer.", "habit", 2000)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only you may feed or correct"):
        deploy.correct(mirror_id, "slows down", "I am actually quite quick to respond.", 3000)


def test_correct_dims_trait_and_reshapes(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", cohere_response(traits=["slows down"], themes=["advice"]))
    deploy.feed_fragment(mirror_id, "I slow down before answering anyone.", "habit", 2000)
    deploy.feed_fragment(mirror_id, "I keep slowing down, every time.", "habit", 3000)
    persona = deploy.get_persona(mirror_id)
    assert "slows down" in persona["lockedTraits"]

    # Correction mode allows amending even a locked trait.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", cohere_response(traits=["decides quickly"], themes=["advice"], tone="direct"))
    result = deploy.correct(mirror_id, "slows down", "I have learned to trust a quick first instinct.", 4000)
    assert result["dimmedTrait"] == "slows down"
    assert result["note"] == "This shard dimmed. The reflection reshaped."

    persona2 = deploy.get_persona(mirror_id)
    assert "slows down" not in persona2["lockedTraits"]


# ---------------------------------------------------------------------------
# views
# ---------------------------------------------------------------------------

def test_get_fragments_newest_first(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    deploy.feed_fragment(mirror_id, "I value patience over speed in all things.", "value", 2000)
    deploy.feed_fragment(mirror_id, "I prefer silence to filling the air with noise.", "value", 3000)
    frags = deploy.get_fragments(mirror_id, 0, 20)
    assert len(frags) == 2
    assert frags[0]["text"].startswith("I prefer silence")


def test_get_persona_returns_clamped_fields(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    deploy.feed_fragment(mirror_id, "I slow down and ask what people fear.", "voice", 2000)
    persona = deploy.get_persona(mirror_id)
    assert "tone" in persona
    assert "cadence" in persona
    assert "recurringThemes" in persona
    assert "valueAnchors" in persona
    assert "lockedTraits" in persona
    assert "heldContradictions" in persona
    assert isinstance(persona["clarity"], int)


def test_summary_counts(deploy, direct_vm):
    mirror_id = deploy.open_mirror(1000)
    deploy.feed_fragment(mirror_id, "I slow down and ask what they fear first.", "voice", 2000)
    deploy.feed_fragment(mirror_id, "I never give a clean answer; I hold the question.", "voice", 3000)
    _mock_answer_calls(direct_vm, answer_response())
    deploy.ask(mirror_id, "What do I do now?", "0x1", 4000)
    summary = deploy.get_summary()
    assert summary["mirrors"] == 1
    assert summary["fragments"] == 2
    assert summary["answers"] == 1
