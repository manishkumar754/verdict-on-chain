#!/bin/bash
set -e

echo "==> Building contracts..."
cd contracts
cargo build --target wasm32-unknown-unknown --release -p dispute-court -p juror-registry

echo "==> Optimizing contracts..."
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/dispute_court.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/juror_registry.wasm

# Ensure deployer keys exist
if ! stellar keys ls | grep -q "deployer"; then
    echo "Generating deployer keys..."
    stellar keys generate deployer --network testnet
    stellar keys fund deployer --network testnet
fi

DEPLOYER="deployer"

echo "==> Deploying JurorRegistry..."
REGISTRY_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/juror_registry.optimized.wasm --source $DEPLOYER --network testnet)
echo "JurorRegistry deployed at: $REGISTRY_ID"

echo "==> Deploying DisputeCourt..."
COURT_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/dispute_court.optimized.wasm --source $DEPLOYER --network testnet)
echo "DisputeCourt deployed at: $COURT_ID"

echo "==> Fetching Native Token ID..."
TOKEN_ID=$(stellar contract id asset --asset native --network testnet)

echo ""
echo "=================================================="
echo " Deployment complete"
echo "=================================================="
echo " JUROR_REGISTRY_ID: $REGISTRY_ID"
echo " DISPUTE_COURT_ID:  $COURT_ID"
echo " NATIVE_TOKEN_ID:   $TOKEN_ID"
echo "=================================================="

cd ..
cat > frontend/.env.local << EOF
VITE_DISPUTE_COURT_ID=$COURT_ID
VITE_JUROR_REGISTRY_ID=$REGISTRY_ID
EOF
echo "Written frontend/.env.local successfully."
