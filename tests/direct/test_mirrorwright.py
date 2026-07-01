import json

from conftest import (
    cohere_response,
    contradict_locked_response,
    contradict_unlocked_response,
    answer_response,
)


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

    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", answer_response())
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
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", answer_response())
    deploy.ask(mirror_id, "What do I do now?", "0x1", 4000)
    summary = deploy.get_summary()
    assert summary["mirrors"] == 1
    assert summary["fragments"] == 2
    assert summary["answers"] == 1
