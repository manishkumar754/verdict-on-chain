# ⚖ VERDICTCHAIN — Decentralized Dispute Resolution Protocol

> **Community arbitration on Stellar Soroban. Stake your judgment. Earn the truth.**

[![CI/CD](https://github.com/yourusername/verdictchain/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/verdictchain/actions)
[![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-7B1D3A?logo=stellar)](https://stellar.expert/explorer/testnet)
[![License: MIT](https://img.shields.io/badge/License-MIT-B8892A.svg)](LICENSE)

---

## ⚖ What is VerdictChain?

VerdictChain is a **decentralized arbitration protocol** built on Stellar Soroban, inspired by projects like Kleros but purpose-built for the Stellar ecosystem. Anyone can file a dispute between two parties, and community jurors stake XLM to cast votes. The majority wins; minority jurors forfeit their stake to the winners. Every verdict is immutable, public, and triggers an inter-contract call to update juror reputation scores.

### Why this beats every other submission

| Feature | VerdictChain | Standard Escrow/Vault |
|---|---|---|
| Domain | Dispute arbitration | Token storage |
| Staking mechanics | ✅ Jurors stake to vote | ❌ |
| Inter-contract call | ✅ Court → Registry on verdict | ❌ |
| Reputation with accuracy | ✅ Correct/incorrect vote tracking | ❌ |
| Majority-wins algorithm | ✅ Stake redistribution | ❌ |
| 7-state dispute machine | ✅ Full lifecycle | ❌ |

---

## 🏛 Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    VERDICTCHAIN PROTOCOL                       │
│                                                               │
│  ┌───────────────────────────┐                                │
│  │       DisputeCourt         │   Inter-contract call         │
│  │   (Soroban Contract)       │ ─────────────────────────►    │
│  │                            │                               │
│  │  file_dispute()            │   record_verdict(             │
│  │  cast_vote()           ────┼──►   dispute_id,             │
│  │  finalize_verdict()    ────┼──►   winning_side,           │
│  │                            │      jurors[],               │
│  │  [stakes XLM on vote]      │      votes[],                │
│  │  [redistributes on close]  │      stakes[]                │
│  └───────────────────────────┘   )                           │
│                                        │                      │
│  Dispute lifecycle:            ┌───────▼──────────────┐      │
│  Voting → Resolved             │   JurorRegistry       │      │
│         → Cancelled            │   (Soroban Contract)  │      │
│                                │                       │      │
│                                │  get_juror()          │      │
│                                │  accuracy tracking    │      │
│                                │  tier: Observer →     │      │
│                                │  ChiefJustice         │      │
│                                └───────────────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │       React 18 + TypeScript Frontend                  │    │
│  │  Docket │ File Case │ My Cases │ Juror ID             │    │
│  │  Judicial dark aesthetic · Brass + Burgundy           │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## 📜 Smart Contracts

### `dispute-court` — The Arbitration Engine

| Function | Description |
|---|---|
| `initialize(admin, registry, token, min_stake, vote_period)` | One-time setup |
| `file_dispute(claimant, respondent, title, desc, category, evidence, stake)` | File a new dispute |
| `cast_vote(juror, dispute_id, side)` | Stake XLM and vote (1=claimant, 2=respondent, 3=abstain) |
| `finalize_verdict(caller, dispute_id)` | Close voting, distribute stakes, **call JurorRegistry** |
| `get_dispute(id)` | Fetch full dispute |
| `get_vote(dispute_id, juror)` | Fetch a juror's vote |

**Stake distribution on verdict:**
```
winner_bonus = loser_pool / winner_count
majority juror payout = stake + winner_bonus
minority juror payout = 0 (forfeited)
tie payout           = stake (returned)
```

### `juror-registry` — The Reputation Ledger

Only callable by `DisputeCourt` via inter-contract authentication.

| Function | Caller | Description |
|---|---|---|
| `record_verdict(dispute_id, winning_side, jurors, votes, stakes)` | DisputeCourt | Updates all juror profiles |
| `get_juror(address)` | Anyone | Full juror profile |
| `get_verdict_record(dispute_id)` | Anyone | Stored verdict summary |

**Reputation formula:**
```
Correct majority vote: +100 + accuracy_bonus (0–50)
Abstain:               +15
Incorrect minority:     0 pts + penalty
Tie verdict:           +30 (everyone)

accuracy_bonus = min(floor(correct_rate% / 10) × 5, 50)
minority_penalty = min(incorrect_count × 15, 100)
reputation = max(0, reputation)   ← floor at 0
```

**Juror Tiers:**
| Tier | Score | Glyph |
|---|---|---|
| Observer | 0–149 | ○ |
| Associate | 150–349 | ◎ |
| Adjudicator | 350–699 | ⚖ |
| Senior Counsel | 700–1099 | ⚖⚖ |
| Chief Justice | 1100+ | ✦ |

---

## 🚀 Quick Start

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install soroban-cli --features opt

# Frontend
cd frontend && npm install && npm run dev
```

### One-command deploy

```bash
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

### Tests

```bash
# Rust contract tests
cd contracts && cargo test --features testutils -- --nocapture

# Frontend tests
cd frontend && npm test
```

---

## 📁 Project Structure

```
verdictchain/
├── .github/workflows/ci.yml       # Full CI/CD pipeline
├── contracts/
│   ├── Cargo.toml
│   ├── dispute-court/src/
│   │   ├── lib.rs                 # Voting, staking, stake redistribution
│   │   └── test.rs                # 12 unit tests
│   └── juror-registry/src/
│       ├── lib.rs                 # Accuracy tracking, tier system
│       └── test.rs                # 9 unit tests
├── frontend/src/
│   ├── components/                # ScalesIcon, TierBadge, StatusPill, VoteBar, DisputeCard, Nav
│   ├── pages/                     # Docket, FileCase, MyDisputes, JurorProfile
│   ├── lib/                       # store, constants, mockData
│   ├── styles/globals.css         # Judicial burgundy + brass aesthetic
│   └── test/verdictchain.test.tsx # 45+ Vitest cases
├── scripts/deploy.sh
└── README.md
```

---

## 🧪 Test Coverage

### Rust — 21 total

**`dispute-court`** (12 tests):
- `test_initialize`
- `test_file_dispute`
- `test_cast_vote_locks_stake`
- `test_multiple_jurors_vote`
- `test_vote_for_respondent`
- `test_abstain_vote`
- `test_get_vote_record`
- `test_user_dispute_list`
- `test_dispute_jurors_list`
- `test_self_dispute_fails`
- `test_party_cannot_vote`
- `test_double_vote_fails`

**`juror-registry`** (9 tests):
- `test_initialize`
- `test_record_verdict_majority_win`
- `test_tier_progression` — all 5 tiers
- `test_accuracy_bonus_increases_with_correct_votes`
- `test_minority_penalty_escalates`
- `test_reputation_never_underflows`
- `test_abstain_gives_small_points`
- `test_tie_verdict_gives_base_points`
- `test_multiple_disputes_accumulate_reputation`
- `test_verdict_record_stored`

### Frontend (Vitest) — 45+ cases
- `truncAddr`, `formatXLM`, `timeLeft`, `winnerLabel`, `formatDate` utilities
- `MOCK_DISPUTES` integrity (6 tests including vote sum validation)
- `MOCK_JURORS` sort order and validity
- `JUROR_TIER_META` structure, ascending mins
- `DISPUTE_STATUS_META` completeness
- `VOTE_OPTIONS` structure
- Reputation scoring algorithm (8 tests)
- Majority verdict logic (5 tests)
- Stake distribution logic (4 tests)
- `TierBadge` component (4 tests)
- `StatusPill` component (3 tests)
- `VoteBar` component (3 tests)

---

## 🎨 Design System — "The Dark Court"

| Token | Value | Usage |
|---|---|---|
| `bench` | `#0A0608` | Page background |
| `chamber` | `#120C10` | Deep fills |
| `burgundy` | `#7B1D3A` | Primary accent, respondent side |
| `brass` | `#B8892A` | Gold, claimant side, CTAs |
| `ivory` | `#EDE8DC` | Primary text |
| `parchment` | `#D4C9B0` | Secondary text |

Signature elements:
- **Court texture** — diagonal crosshatch CSS pattern across full page
- **Animated scales SVG** — left and right pans sway in opposite directions
- **Case cards** — brass corner bracket ornaments on every dispute card
- **Verdict stamps** — rotated `CLAIMANT PREVAILS` / `RESPONDENT PREVAILS` seals
- **VoteBar** — color-coded claimant/respondent/abstain proportional bar

---

## 🔄 CI/CD Pipeline

```
push to main
    │
    ├── 🦀 contract-tests
    │   ├── cargo fmt + clippy
    │   ├── cargo test dispute-court (12 tests)
    │   ├── cargo test juror-registry (9 tests)
    │   └── wasm build + optimize
    │
    ├── ⚡ frontend-tests
    │   ├── eslint
    │   ├── vitest (45+ tests)
    │   └── vite build
    │
    └── 🚀 deploy (main only)
        ├── Deploy JurorRegistry
        ├── Deploy DisputeCourt
        ├── Initialize with cross-references + native XLM token
        └── vercel --prod
```

---

## 🔗 Deployed Contracts

| Contract | Address |
|---|---|
| DisputeCourt | `See deployment/testnet.json` |
| JurorRegistry | `See deployment/testnet.json` |

→ [Stellar Expert Testnet Explorer](https://stellar.expert/explorer/testnet)

---

## 📄 License

MIT © 2024 VerdictChain

---

*Built for the Stellar Hackathon — Level 3 Orange Belt.*  
*"On-chain justice, staked on truth."*
