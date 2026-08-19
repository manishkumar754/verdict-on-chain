#!/bin/bash
set -e

echo "==> Building contracts..."
cd contracts
cargo build --target wasm32-unknown-unknown --release
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/dispute_court.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/juror_registry.wasm

# Ensure deployer keys exist
if ! stellar keys ls | grep -q "deployer"; then
    echo "Generating deployer keys..."
    stellar keys generate deployer --network testnet
    stellar keys fund deployer --network testnet
fi

DEPLOYER="deployer"

echo "==> Deploying Dispute Court Contract..."
CONTRACT_1_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/dispute_court.optimized.wasm --source $DEPLOYER --network testnet)
echo "Dispute Court deployed at: $CONTRACT_1_ID"

echo "==> Deploying Juror Registry Contract..."
CONTRACT_2_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/juror_registry.optimized.wasm --source $DEPLOYER --network testnet)
echo "Juror Registry deployed at: $CONTRACT_2_ID"

echo ""
echo "=================================================="
echo " Deployment complete"
echo "=================================================="
echo " DISPUTE_COURT_ID: $CONTRACT_1_ID"
echo " JUROR_REGISTRY_ID: $CONTRACT_2_ID"
echo "=================================================="
