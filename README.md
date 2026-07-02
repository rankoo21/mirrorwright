<div align="center">

# Mirrorwright

_A mirror learning to be you._

<br />

[![Live Demo](https://img.shields.io/badge/Live_Demo-mirrorwright.pages.dev-EFF4F8?style=flat-square&labelColor=060607)](https://mirrorwright.pages.dev)
[![Network](https://img.shields.io/badge/Network-Testnet_Bradbury-14242A?style=flat-square&labelColor=060607)](https://explorer-bradbury.genlayer.com/address/0x5397CB6354459e1e56d72e16859da19fDbBFfBBc)
[![GenLayer](https://img.shields.io/badge/GenLayer-Intelligent_Contract-E8A36A?style=flat-square&labelColor=060607)](https://genlayer.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-C7CDD4?style=flat-square&labelColor=060607)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-4A4E55?style=flat-square&labelColor=060607)](https://www.typescriptlang.org)

<br />

Feed it fragments.
It will learn to answer as you.

</div>

<br />

## What it is

A dark room. A single tall mirror.

You breathe on the glass, and it wakes.

You feed it small true things: how you slow down before advice, how you never give a clean answer, the words you reach for when you are afraid. Each fragment rises into the glass as a shard and settles into a forming reflection.

The reflection is not prose. It is a compact fingerprint of a self: a tone, a cadence, the themes that keep returning, the values you anchor to, the traits that lock into place, the contradictions the glass agrees to hold rather than hide.

When the reflection is clear enough, you ask it a question. It answers in your voice, not the model's.

<br />

## Why it needs GenLayer

Identity is a subjective judgment. So is voice.

Deciding whether a new fragment coheres with who you are, or whether an answer truly sounds like you, is not something a single server can be trusted to do. A single server could quietly fake the self, drift the voice, or rewrite a trait no one asked it to touch.

Mirrorwright hands that judgment to consensus. Several GenLayer validators independently read each fragment against the existing fingerprint and must agree on how it relates before the shared self changes. When you ask, several validators independently render an answer in your voice and must agree it faithfully matches the fingerprint before it becomes canonical.

The reflection is only real because more than one witness agreed on it.

<br />

## The reflection

The persona lives on-chain as clamped fields, never raw model prose.

- **Tone and cadence.** One short phrase each for how you sound and your rhythm.
- **Recurring themes.** The subjects that keep surfacing across fragments.
- **Value anchors.** What you steer by.
- **Locked traits.** Traits that recurred enough for validators to agree they are stable. These are the core, and they are protected.
- **Held contradictions.** Fragments that do not yet cohere. The glass keeps them in view rather than smoothing them away.
- **Clarity and state.** A resolve score from dim, to forming, to resolved, to contested.

Three deterministic guards keep the self honest:

1. A fragment that contradicts a locked trait is refused. It can only enter through the correction path, never by silently overwriting who you are.
2. The fingerprint is stored as short clamped fields. The mirror never keeps the model's paragraphs, only the distilled self.
3. An answer becomes canonical only when validators agree it matches the persona. Agreement is comparative, on stance and voice, never byte-equality.

<br />

## Run it

The app runs fully offline in mock mode by default. No wallet, no keys, no network.

```bash
npm install
npm run dev
```

Open http://localhost:3000, wipe the condensation, and begin.

To point at the deployed contract instead of the mock, set the environment before building:

```bash
NEXT_PUBLIC_MIRROR_MODE=contract
NEXT_PUBLIC_MIRROR_CONTRACT=0x5397CB6354459e1e56d72e16859da19fDbBFfBBc
NEXT_PUBLIC_MIRROR_NETWORK=bradbury
```

When `NEXT_PUBLIC_MIRROR_MODE` is left at `mock`, the same interface is served by a local adapter, so the reflection resolves and speaks without ever leaving your machine.

<br />

## Under the glass

The Intelligent Contract lives at `contracts/MirrorwrightContract.py`. It is a persona synthesizer, not a judge, not a vote, not a ledger of value.

Its surface:

| Method | What it does |
| --- | --- |
| `open_mirror` | Opens your one mirror. Idempotent: a self has exactly one glass. |
| `feed_fragment` | Non-deterministic. Validators read the fragment against the fingerprint, agree whether it coheres, extends, or contradicts, and the self is updated from the agreed decision. |
| `ask` | Non-deterministic. Validators render an answer in your voice and must agree it matches the fingerprint before it is stored as canonical. |
| `correct` | Owner-only. Offers a correction; validators must agree it coheres before the self reshapes. |
| `get_persona` | Returns the fingerprint: tone, cadence, themes, anchors, locked traits, held contradictions. |
| `get_fragments` | A paged view of what you have fed the glass. |
| `get_answers` | A paged view of past answers and the traits they drew from. |
| `get_mirror` / `get_mirror_by_owner` / `get_mirrors` / `get_summary` | Read views of a mirror and the wider room. |

Verify the glass:

```bash
genvm-lint check contracts/MirrorwrightContract.py --json
python -m pytest tests/direct/ -p gltest_direct -q
```

<br />

## The making

Next.js 14, TypeScript, Tailwind, Framer Motion, and Zustand hold the room together, with `genlayer-js` reaching for the contract. The whole thing is a static export hosted on Cloudflare Pages.

- **Live:** https://mirrorwright.pages.dev
- **Contract, Testnet Bradbury:** [`0x5397CB6354459e1e56d72e16859da19fDbBFfBBc`](https://explorer-bradbury.genlayer.com/address/0x5397CB6354459e1e56d72e16859da19fDbBFfBBc)

<br />

<div align="center">

GenLayer . Mirrorwright . A self agreed by consensus . Testnet

</div>
