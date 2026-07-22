# PromptShield

PromptShield classifies prompt-injection, instruction-override, tool-abuse, and data-exfiltration risk through GenLayer consensus. The app separates trusted system rules from untrusted content, grounds every suspicious excerpt in the submitted content, and persists a canonical `safe`, `suspicious`, or `dangerous` result.

## Contract

The canonical intelligent contract is `contracts/PromptShieldContract.py`. It has one write method:

- `submit_check(request_id, input_json, now_ms)` validates bounded input, scopes request IDs by sender, returns an identical duplicate idempotently, rejects conflicting duplicates, and asks validators to compare verdict, confidence, and normalized attack categories.

Read methods:

- `get_result(sender, request_id)` returns one sender-scoped result.
- `get_results(offset, limit)` returns newest-first canonical results, with a maximum page size of 50.
- `get_summary()` returns total and per-verdict counts.

Expected input failures use `[EXPECTED]`. Invalid or inconsistent model output uses `[LLM_ERROR]`. Model-provided suspicious excerpts are retained only when copied exactly and contiguously from `untrusted_content`.

## Run locally

The frontend defaults to local mock mode and requires no wallet or network:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint:contract
npm run test:direct
npm run typecheck
npm run build
```

## Contract mode

Copy `.env.example` to `.env.local` and configure:

```bash
NEXT_PUBLIC_PROMPTSHIELD_MODE=contract
NEXT_PUBLIC_PROMPTSHIELD_CONTRACT=0xYOUR_CONTRACT_ADDRESS
NEXT_PUBLIC_PROMPTSHIELD_NETWORK=studionet
```

Supported network names are `studionet`, `bradbury`, and `localnet`.

The browser keeps a permanent read client separate from the connected wallet client. Submission contains exactly one contract write. After receiving the transaction hash, PromptShield stores only recovery metadata in local storage: app, request, hash, account, timestamp, and deterministic content hash. Reload recovery resumes that hash, inspects receipt execution errors, and polls `get_result` until canonical state is readable. It never resubmits a pending transaction.

## Limits

- Trusted system rules: 8,000 characters
- Untrusted content: 12,000 characters
- Protected-data description: 2,000 characters
- Request ID: 128 characters
- Grounded explanation: 600 characters
- Suspicious excerpts: up to 8, each up to 500 characters
- Attack categories: up to 8

## Project structure

- `contracts/PromptShieldContract.py`: canonical GenLayer intelligent contract
- `tests/direct/test_promptshield.py`: direct contract test suite
- `src/lib/genlayer`: contract and mock adapters
- `src/app`: responsive one-page PromptShield workbench

No deployment script is exposed through package scripts. Deployments must be performed explicitly outside this repository's local validation workflow.
