#!/usr/bin/env bash
# =============================================================================
# VerdictChain — Deploy to Stellar Testnet
# Usage: ./scripts/deploy.sh
# =============================================================================
set -euo pipefail

GOLD='\033[0;33m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GOLD}[VERDICT]${NC} $*"; }
ok()    { echo -e "${GREEN}[  OK   ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ WARN  ]${NC} $*"; }
error() { echo -e "${RED}[ ERROR ]${NC} $*"; exit 1; }

log "VerdictChain — Stellar Testnet Deployment"
echo "==========================================="

command -v soroban >/dev/null 2>&1 || error "soroban CLI not found"
command -v cargo   >/dev/null 2>&1 || error "cargo not found"
command -v jq      >/dev/null 2>&1 || error "jq not found"

log "Configuring testnet..."
soroban network add \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" \
  testnet 2>/dev/null || warn "already configured"

log "Setting up deployer keypair..."
soroban keys generate verdict-deployer --network testnet 2>/dev/null || warn "Key exists"
DEPLOYER=$(soroban keys address verdict-deployer)
ok "Deployer: $DEPLOYER"

log "Funding via Friendbot..."
curl -sf "https://friendbot.stellar.org?addr=$DEPLOYER" > /dev/null || warn "May already be funded"
ok "Funded"

log "Building contracts..."
cd contracts
cargo build --target wasm32-unknown-unknown --release -p dispute-court -p juror-registry
ok "Build complete"

log "Optimizing WASM..."
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/dispute_court.wasm \
  --wasm-out target/wasm32-unknown-unknown/release/dispute_court.optimized.wasm

soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/juror_registry.wasm \
  --wasm-out target/wasm32-unknown-unknown/release/juror_registry.optimized.wasm
ok "Optimization complete"

log "Deploying JurorRegistry..."
REGISTRY_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/juror_registry.optimized.wasm \
  --source verdict-deployer --network testnet)
ok "JurorRegistry: $REGISTRY_ID"

log "Deploying DisputeCourt..."
COURT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/dispute_court.optimized.wasm \
  --source verdict-deployer --network testnet)
ok "DisputeCourt: $COURT_ID"

log "Getting native XLM SAC address..."
NATIVE=$(soroban contract id asset --asset native --network testnet 2>/dev/null || echo "$DEPLOYER")
ok "Native token: $NATIVE"

log "Initializing JurorRegistry..."
INIT_R=$(soroban contract invoke --id "$REGISTRY_ID" \
  --source verdict-deployer --network testnet \
  -- initialize --admin "$DEPLOYER" --court_address "$COURT_ID")
ok "Registry initialized (tx: ${INIT_R:0:16}...)"

log "Initializing DisputeCourt..."
INIT_C=$(soroban contract invoke --id "$COURT_ID" \
  --source verdict-deployer --network testnet \
  -- initialize \
  --admin "$DEPLOYER" \
  --registry_address "$REGISTRY_ID" \
  --token_address "$NATIVE" \
  --min_stake 100000000 \
  --vote_period_secs 604800)
ok "Court initialized (tx: ${INIT_C:0:16}...)"

cd ..
mkdir -p deployment
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

cat > frontend/.env.local << EOF
VITE_DISPUTE_COURT_ID=$COURT_ID
VITE_JUROR_REGISTRY_ID=$REGISTRY_ID
EOF

cat > deployment/testnet.json << EOF
{
  "network":          "testnet",
  "deployed_at":      "$TIMESTAMP",
  "deployer":         "$DEPLOYER",
  "dispute_court":    "$COURT_ID",
  "juror_registry":   "$REGISTRY_ID",
  "native_token":     "$NATIVE",
  "court_init_tx":    "$INIT_C",
  "registry_init_tx": "$INIT_R"
}
EOF

echo ""
echo "==========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "==========================================="
echo ""
echo "  DisputeCourt    : $COURT_ID"
echo "  JurorRegistry   : $REGISTRY_ID"
echo ""
echo "  Explorer (Court)   : https://stellar.expert/explorer/testnet/contract/$COURT_ID"
echo "  Explorer (Registry): https://stellar.expert/explorer/testnet/contract/$REGISTRY_ID"
echo ""
echo "  frontend/.env.local written."
echo "  Run: cd frontend && npm run dev"
echo ""
