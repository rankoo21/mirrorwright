<div align="center">

# Mirrorwright

A mirror learning to be you.

[![Network](https://img.shields.io/badge/Network-GenLayer_Bradbury-14242A?style=flat-square&labelColor=060607)](https://explorer-bradbury.genlayer.com/address/0x5397CB6354459e1e56d72e16859da19fDbBFfBBc)
[![chainId](https://img.shields.io/badge/chainId-4221-1F2A30?style=flat-square&labelColor=060607)](https://explorer-bradbury.genlayer.com)
[![Status](https://img.shields.io/badge/Status-live-2E7D5B?style=flat-square&labelColor=060607)](https://mirrorwright.pages.dev)
[![Contract](https://img.shields.io/badge/Contract-Python_GenVM-E8A36A?style=flat-square&labelColor=060607)](contracts/MirrorwrightContract.py)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-C7CDD4?style=flat-square&labelColor=060607)](https://nextjs.org)

</div>

## On-chain proof

Every state change is a real transaction on GenLayer Testnet Bradbury. The contract is deployed and the full lifecycle below has been verified on-chain.

- **Contract:** [`0x5397CB6354459e1e56d72e16859da19fDbBFfBBc`](https://explorer-bradbury.genlayer.com/address/0x5397CB6354459e1e56d72e16859da19fDbBFfBBc)
- **Live app:** [mirrorwright.pages.dev](https://mirrorwright.pages.dev)

### Verified lifecycle on Bradbury

| Step | Method | Transaction |
| --- | --- | --- |
| Open the mirror | `open_mirror` | [`0xa6796b06...f168dec4`](https://explorer-bradbury.genlayer.com/tx/0xa6796b069931de79e6e40aa9e8b4f232ab59936a7f6a3ef243d5ed82f168dec4) |
| Feed a fragment | `feed_fragment` | [`0xaeca1013...20054e12`](https://explorer-bradbury.genlayer.com/tx/0xaeca1013f0126f09decf04638419350501030fb14a3d1956c486978120054e12) |
| Feed a fragment | `feed_fragment` | [`0x1112399d...00ddcc25`](https://explorer-bradbury.genlayer.com/tx/0x1112399d2cd58115d0aefff19a3e78920aa7e519412aff9e44795ede00ddcc25) |
| Feed a fragment | `feed_fragment` | [`0x1fbd0cde...d2e03c0e`](https://explorer-bradbury.genlayer.com/tx/0x1fbd0cdedda287e56fe7b2ee137abdd9e159cb7c30eb5ef390e46fa1d2e03c0e) |
| Ask the mirror | `ask` | [`0xd64d1100...660324be5`](https://explorer-bradbury.genlayer.com/tx/0xd64d110053ac6a6912a3de6a7b9f743559c6edc279cefdaef2470e9660324be5) |

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
NEXT_PUBLIC_MIRROR_CONTRACT=0x5397CB6354459e1e56d72e16859da19fDbBFfBBc
NEXT_PUBLIC_MIRROR_NETWORK=bradbury
```

When `NEXT_PUBLIC_MIRROR_MODE` is left at `mock`, the same interface is served by a local adapter, so the reflection resolves and speaks without ever leaving your machine.

## Stack

Next.js 14, TypeScript, Tailwind, Framer Motion, and Zustand hold the room together, with `genlayer-js` reaching for the contract. The whole thing is a static export hosted on Cloudflare Pages.
