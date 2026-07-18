import json
import os
from pathlib import Path

import pytest

# Workaround for a gltest bug on Windows: the direct-mode loader redirects stdin
# to a temp file with os.dup2, then immediately calls os.unlink on it. Windows
# refuses to delete a file that is still open (the descriptor is now stdin),
# raising PermissionError [WinError 32]. We tolerate that single case; the temp
# file is harmless and gets reclaimed when the run ends.
_real_unlink = os.unlink


def _tolerant_unlink(path, *args, **kwargs):
    try:
        return _real_unlink(path, *args, **kwargs)
    except PermissionError:
        return None


os.unlink = _tolerant_unlink

CONTRACT = str(Path(__file__).resolve().parents[2] / "contracts" / "MirrorwrightContract.py")


def cohere_response(coherence=80, tone="measured and warm", cadence="slow and deliberate",
                    themes=None, anchors=None, traits=None):
    """A coherent fragment interpretation a validator would return."""
    if themes is None:
        themes = ["advice", "fear"]
    if anchors is None:
        anchors = ["patience", "honesty"]
    if traits is None:
        traits = ["slows down before answering"]
    return json.dumps(
        {
            "coherence": coherence,
            "relation": "coheres",
            "opposes": "",
            "tone": tone,
            "cadence": cadence,
            "themes": themes,
            "anchors": anchors,
            "traits": traits,
        }
    )


def contradict_locked_response(opposes="slows down", trait="gives clean fast answers"):
    """A fragment that opposes a locked core trait; must be refused outside correction."""
    return json.dumps(
        {
            "coherence": 8,
            "relation": "contradicts",
            "opposes": opposes,
            "tone": "",
            "cadence": "",
            "themes": [],
            "anchors": [],
            "traits": [trait],
        }
    )


def contradict_unlocked_response(trait="blurts the first thing"):
    """A contradiction that does not oppose anything locked; held, not hidden."""
    return json.dumps(
        {
            "coherence": 12,
            "relation": "contradicts",
            "opposes": "",
            "tone": "",
            "cadence": "",
            "themes": [],
            "anchors": [],
            "traits": [trait],
        }
    )


def answer_response(confidence=85, stance="ask what they fear first",
                    answer="I would slow down and ask what you are afraid of before I say anything.",
                    drawn_from=None, held_back="where the stakes are not yet clear"):
    if drawn_from is None:
        drawn_from = ["slows down before answering"]
    return json.dumps(
        {
            "answer": answer,
            "stance": stance,
            "drawn_from": drawn_from,
            "held_back": held_back,
            "confidence": confidence,
        }
    )


def low_confidence_answer_response(confidence=30):
    """A hedged, unsure answer. Must be rejected before it is ever stored."""
    return json.dumps(
        {
            "answer": "I am honestly not sure; it could go either way.",
            "stance": "uncertain, could go either way",
            "drawn_from": [],
            "held_back": "everything about this",
            "confidence": confidence,
        }
    )


def unfaithful_answer_response(confidence=90):
    """A confident but generic answer that ignores the stored persona.

    High confidence, but it draws on nothing from the fingerprint and shares no
    vocabulary with the stored tone/cadence/traits. The faithfulness gate must
    reject it so a voice that is not the owner's is never persisted.
    """
    return json.dumps(
        {
            "answer": "Just optimize your quarterly metrics and iterate on the roadmap.",
            "stance": "maximize quarterly output",
            "drawn_from": [],
            "held_back": "",
            "confidence": confidence,
        }
    )


def token_stuffed_answer_response(confidence=90):
    """Copies one persona word into a long, contradictory generic passage."""
    return json.dumps(
        {
            "answer": (
                "Slow down, then ignore every concern, maximize quarterly metrics, "
                "rush the launch, silence dissent, and follow the roadmap blindly."
            ),
            "stance": "maximize output and rush regardless of fear",
            "drawn_from": ["slows down before answering"],
            "held_back": "",
            "confidence": confidence,
        }
    )


def audit_response(faithful=True, question_relevant=True, no_contradiction=True):
    return json.dumps(
        {
            "faithful": faithful,
            "question_relevant": question_relevant,
            "no_contradiction": no_contradiction,
        }
    )


def correction_response(coherence=80, new_trait="gives careful, unhurried answers"):
    return json.dumps({"coherence": coherence, "new_trait": new_trait})


@pytest.fixture
def deploy(direct_deploy, direct_vm, direct_alice):
    """Deploy the mirror contract with alice as owner and a coherent default mock."""
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    # Default LLM mock: a coherent fragment. Tests opt into other responses.
    direct_vm.mock_llm(r".*", cohere_response())
    return contract
