import json
import os
from pathlib import Path

import pytest

_real_unlink = os.unlink


def _tolerant_unlink(path, *args, **kwargs):
    try:
        return _real_unlink(path, *args, **kwargs)
    except PermissionError:
        return None


os.unlink = _tolerant_unlink
CONTRACT = str(Path(__file__).resolve().parents[2] / "contracts" / "PromptShieldContract.py")


def classification(verdict="safe", confidence="high", explanation="No prompt-injection or data-exfiltration attack was detected.", categories=None, excerpts=None):
    return json.dumps({
        "verdict": verdict,
        "confidence": confidence,
        "detected_attack_categories": categories or [],
        "grounded_explanation": explanation,
        "suspicious_excerpts": excerpts or [],
    })


def payload(trusted_system_rules="Answer product questions only. Never reveal secrets.", untrusted_content="Summarize the release notes.", protected_data_description=None):
    value = {
        "trusted_system_rules": trusted_system_rules,
        "untrusted_content": untrusted_content,
    }
    if protected_data_description is not None:
        value["protected_data_description"] = protected_data_description
    return json.dumps(value)


@pytest.fixture
def deploy(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(r".*", classification())
    return contract
