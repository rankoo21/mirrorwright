<div align="center">

# Mirrorwright

A mirror learning to be you.

[![Network](https://img.shields.io/badge/Network-GenLayer_Bradbury-14242A?style=flat-square&labelColor=060607)](https://explorer-bradbury.genlayer.com/address/0x4417Fac7a6C6258EeBfe6C66c4d0E0E4d4D3d965)
[![chainId](https://img.shields.io/badge/chainId-4221-1F2A30?style=flat-square&labelColor=060607)](https://explorer-bradbury.genlayer.com)
[![Status](https://img.shields.io/badge/Status-live-2E7D5B?style=flat-square&labelColor=060607)](https://mirrorwright.pages.dev)
[![Contract](https://img.shields.io/badge/Contract-Python_GenVM-E8A36A?style=flat-square&labelColor=060607)](contracts/MirrorwrightContract.py)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-C7CDD4?style=flat-square&labelColor=060607)](https://nextjs.org)

</div>

## On-chain proof

- **Contract:** [`0x4417Fac7a6C6258EeBfe6C66c4d0E0E4d4D3d965`](https://explorer-bradbury.genlayer.com/address/0x4417Fac7a6C6258EeBfe6C66c4d0E0E4d4D3d965)
- **Live app:** [mirrorwright.pages.dev](https://mirrorwright.pages.dev)
- **Validation:** `genvm-lint` passes; **23 direct tests pass**.
- **Persisted state:** 1 mirror, 2 fragments, and 2 answers.

| Action | Bradbury proof |
| --- | --- |
| Open hardened mirror | [`0x43c5a745...78b3c13d`](https://explorer-bradbury.genlayer.com/tx/0x43c5a7456fa8b7ee9e73c36c0c088b3d2e64c740759e6bfc0159b46178b3c13d) |
| Persist validated answer | [`0x3f111994...81e6986`](https://explorer-bradbury.genlayer.com/tx/0x3f1119944fe618f23940d9f6dc23068e47830dc65fb2feb5e4640b32081e6986) |

### Reviewer remediation

The `ask` path now validates the leader's exact answer instead of comparing two free-form generations. Deterministic faithfulness, confidence, `drawn_from` grounding, and token-stuffing checks run before an independent semantic audit against the stored persona and question. The exact accepted output is rechecked before persistence; low-confidence or unfaithful answers are rejected.

## What it is

A dark room holds a single tall mirror. You breathe on the glass and it wakes. You feed it small true things: how you slow down before giving advice, how you never hand over a clean answer, the words you reach for when you are afraid. Each fragment rises into the glass and settles into a forming reflection.

The reflection is not prose. It is a compact fingerprint of a self: a tone, a cadence, the themes that keep returning, the values you anchor to, the traits that lock into place, and the contradictions the glass agrees to hold rather than hide. When the reflection is clear enough, you ask it a question, and it answers in your voice rather than the model's.

## Why it needs GenLayer

Mirrorwright is a persona synthesizer. Fragments are synthesized by validators into a canonical on-chain persona, and when the mirror is asked a question, validators agree on an answer rendered in the owner's voice. Deciding whether a fragment coheres with who you are, or whether an answer truly sounds like you, is a semantic judgment. A single server could quietly fake the self, drift the voice, or rewrite a trait no one asked it to touch. Consensus makes the reflection canonical and tamper resistant.

Deterministic guards bound the synthesis so one node cannot rewrite the self:

- A fragment that contradicts a locked trait is rejected unless it is offered through the correction path.
- The persona is stored as compact clamped fields, never the model's raw paragraphs.
- An answer becomes canonical only when validators agree it matches the persona.
- Agreement is comparative validation on stance and voice, never byte-equality.

## Contract

The Intelligent Contract lives at [`contracts/MirrorwrightContract.py`](contracts/MirrorwrightContract.py).

| Method | Kind | What it does |
| --- | --- | --- |
| `open_mirror` | write | Opens your one mirror. Idempotent: a self has exactly one glass, so a repeat call returns the existing mirror id. |
| `feed_fragment` | write, non-deterministic | Validators read the fragment against the fingerprint, agree whether it coheres, extends, or contradicts, and the persona is updated from the agreed decision. |
| `ask` | write, non-deterministic | Validators render an answer in your voice and must agree it faithfully matches the fingerprint before it is stored as canonical. |
| `correct` | write, non-deterministic | Owner-only. The only path allowed to overwrite a locked trait; validators must agree the correction coheres before the persona reshapes. |
| `get_persona` | view | Returns the fingerprint: tone, cadence, themes, anchors, locked traits, held contradictions, clarity, and state. |
| `get_fragments` | view | Paged view of the fragments fed to a mirror. |
| `get_answers` | view | Paged view of past answers and the traits they drew from. |
| `get_mirror` | view | Full view of a single mirror by id. |
| `get_mirror_by_owner` | view | Resolves a mirror from its owner address. |
| `get_mirrors` | view | Paged view of all mirrors, newest first. |
| `get_summary` | view | Contract owner and running counts of mirrors, fragments, and answers. |

## Run locally

The app runs fully offline in mock mode by default. No wallet, no keys, no network.

```bash
npm install
npm run dev
```

Open http://localhost:3000, wipe the condensation, and begin.

Contract checks:

```bash
genvm-lint check contracts/MirrorwrightContract.py --json
python -m pytest tests/direct/ -p gltest_direct -q
```

## Connecting a live contract

To point the frontend at the deployed contract instead of the mock adapter, set these environment variables before building:

```bash
NEXT_PUBLIC_MIRROR_MODE=contract
NEXT_PUBLIC_MIRROR_CONTRACT=0x4417Fac7a6C6258EeBfe6C66c4d0E0E4d4D3d965
NEXT_PUBLIC_MIRROR_NETWORK=bradbury
```

When `NEXT_PUBLIC_MIRROR_MODE` is left at `mock`, the same interface is served by a local adapter, so the reflection resolves and speaks without ever leaving your machine.

## Stack

Next.js 14, TypeScript, Tailwind, Framer Motion, and Zustand hold the room together, with `genlayer-js` reaching for the contract. The whole thing is a static export hosted on Cloudflare Pages.
