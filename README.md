# ⚖️ VerdictChain — Decentralized Dispute Resolution Protocol

> **Community arbitration on Stellar Soroban. Stake your judgment. Earn the truth.**

[![CI/CD](https://github.com/aditi-singh-09/VERDICTCHAIN-Decentralized-Dispute-Resolution-Protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/aditi-singh-09/VERDICTCHAIN-Decentralized-Dispute-Resolution-Protocol/actions)
[![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-7B1D3A?logo=stellar)](https://stellar.expert/explorer/testnet)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-B8892A)](https://verdictchain-decentralized-dispute.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-B8892A.svg)](LICENSE)

---

## 🔗 Links

| | |
|---|---|
| 🌐 **Live App** | [verdictchain-decentralized-dispute.vercel.app](https://verdictchain-decentralized-dispute.vercel.app/) |
| 🎥 **Video Demo** | [Watch on Google Drive](https://drive.google.com/file/d/1vNvRBqQhNSnoF4i--b8gei5wmnD2zcqs/view?usp=sharing) |
| 🔍 **On-chain Tx** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/tx/5f5af0a3c2799b6b3e589ee9f9b59f68084bc0cbc50f7454ed02e6336710e97f) |

---

## 📸 Screenshots

![VerdictChain Product UI](images/product%20ui.png)

![VerdictChain Mobile UI](images/mobile%20ui.png)

---

## ⚖️ What is VerdictChain?

VerdictChain is a **decentralized arbitration protocol** built on Stellar Soroban. Anyone can file a dispute between two parties. Community jurors stake XLM to cast votes — the majority wins and earns the minority's forfeited stake. Every verdict is immutable, public, and automatically triggers an inter-contract call to update each juror's on-chain reputation score.

### Key Features

| Feature | Description |
|---|---|
| 📋 **File Disputes** | Any two parties can open a case with evidence and a juror stake amount |
| 🗳️ **Juror Staking** | Jurors stake XLM to vote — incentivizing accurate, honest judgment |
| ⚡ **Stake Redistribution** | Majority winners split the minority's forfeited stakes on finalization |
| 🏆 **On-chain Reputation** | Juror accuracy tracked across all cases with a 5-tier progression system |
| 🔗 **Inter-Contract Calls** | DisputeCourt calls JurorRegistry on every verdict to update profiles |
| 🚀 **CI/CD Pipeline** | Auto-deploys contracts + frontend to Testnet on every push to `main` |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                  VERDICTCHAIN PROTOCOL                │
│                                                      │
│  ┌─────────────────────┐   inter-contract call       │
│  │    DisputeCourt      │ ─────────────────────────► │
│  │  file_dispute()      │   JurorRegistry             │
│  │  cast_vote()         │   record_verdict()          │
│  │  finalize_verdict()  │   get_juror()               │
│  └─────────────────────┘   tier & accuracy tracking  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │   React 18 + TypeScript + Vite Frontend       │   │
│  │   Docket · File Case · My Cases · Juror ID    │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 📜 Smart Contracts

### `dispute-court`

| Function | Description |
|---|---|
| `initialize(admin, registry, token, min_stake, vote_period)` | One-time setup |
| `file_dispute(claimant, respondent, title, desc, category, evidence, stake)` | File a new dispute |
| `cast_vote(juror, dispute_id, side)` | Stake XLM and vote (1=claimant, 2=respondent, 3=abstain) |
| `finalize_verdict(caller, dispute_id)` | Close voting, redistribute stakes, call JurorRegistry |

**Stake distribution on verdict:**
```
majority juror payout = stake + (loser_pool / winner_count)
minority juror payout = 0  (forfeited)
tie payout            = stake returned to all
```

### `juror-registry`

Only callable by `DisputeCourt` via inter-contract authentication.

| Function | Description |
|---|---|
| `record_verdict(dispute_id, winning_side, jurors, votes, stakes)` | Updates all juror profiles after a verdict |
| `get_juror(address)` | Returns a full juror profile |

**Juror Tiers:**
| Tier | Score |
|---|---|
| Observer | 0 – 149 |
| Associate | 150 – 349 |
| Adjudicator | 350 – 699 |
| Senior Counsel | 700 – 1099 |
| Chief Justice | 1100+ |

---

## 🚀 Quick Start

```bash
# Install Rust + Soroban target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Run contract tests
cd contracts && cargo test --workspace

# Run frontend
cd frontend && npm install && npm run dev

# Deploy contracts (one-command)
chmod +x scripts/deploy.sh && ./scripts/deploy.sh
```

---

## 📁 Project Structure

```
verdictchain/
├── .github/workflows/ci.yml        # CI/CD: test → build → deploy to Testnet
├── contracts/
│   ├── dispute-court/src/lib.rs    # Voting, staking, stake redistribution
│   └── juror-registry/src/lib.rs  # Reputation, accuracy tracking, tier system
├── frontend/src/
│   ├── components/                 # DisputeCard, VoteBar, StatusPill, TierBadge, Nav
│   ├── pages/                      # Docket, FileCase, MyDisputes, JurorProfile
│   └── lib/                        # soroban.ts, store, constants, wallet
├── images/                         # Screenshots
└── scripts/deploy.sh
```

---

## 🧪 Tests

![CI/CD Pipeline](images/cic%20cd.png)

![Test Output](images/test%20output.png)

**Smart Contracts (Rust)** — 21 total
- `dispute-court`: 12 tests (file dispute, cast vote, stake locking, finalize verdict, edge cases)
- `juror-registry`: 9 tests (reputation scoring, tier progression, accuracy bonuses, penalties)

**Frontend (Vitest)** — 63 tests
- Utility functions, mock data integrity, component rendering, reputation algorithm, stake distribution logic

---

## 🔄 CI/CD Pipeline

Every push to `main` automatically:
1. 🦀 Runs all Rust contract tests
2. ⚡ Runs frontend lint, Vitest tests, and Vite build
3. 🚀 Deploys both Soroban contracts to Stellar Testnet
4. 🔗 Initializes contracts with cross-references and native XLM token

---

## 🔗 Deployed Contracts (Testnet)

| Contract | Address |
|---|---|
| **DisputeCourt** | `CDSJ2G3EYVB76KG5332VRYC3KW2DKN6TSV5G56G2E6VN6THNN432PJUM` |
| **JurorRegistry** | `CBX7A3ZWUM62XQZU5TP5CJGAZWUIX64Y4SNUFJGO5PJO7564DSEINNAR` |

→ [View on Stellar Expert Explorer](https://stellar.expert/explorer/testnet)

---

## 📄 License

MIT © 2024 VerdictChain

---

*Built for the Stellar Hackathon · "On-chain justice, staked on truth."*
