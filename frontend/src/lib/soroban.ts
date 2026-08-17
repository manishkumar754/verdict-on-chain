/**
 * soroban.ts – Smart contract interaction helpers
 * Wraps the Soroban RPC client and builds/submits transactions
 * for the VerdictChain dispute-court and juror-registry contracts.
 */

import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  Address,
  xdr,
  Contract,
  scValToNative,
} from '@stellar/stellar-sdk'
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE, DISPUTE_COURT_ID, JUROR_REGISTRY_ID } from './constants'
import { signTransaction } from './wallet'
import type { Dispute, JurorProfile } from './store'

const server = new SorobanRpc.Server(SOROBAN_RPC_URL)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addr(pubKey: string) {
  return new Address(pubKey).toScVal()
}

/** Build, simulate, sign (via Freighter), and submit a transaction */
async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourcePublicKey: string
): Promise<string> {
  const account = await server.getAccount(sourcePublicKey)
  const contract = new Contract(contractId)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build()

  // Simulate to get the updated footprint
  const simResult = await server.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`)
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build()
  const signedXdr = await signTransaction(preparedTx.toXDR(), sourcePublicKey)

  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  )

  if (submitResult.status === 'ERROR') {
    throw new Error(`Submission failed: ${JSON.stringify(submitResult.errorResult)}`)
  }

  // Poll for confirmation
  const hash = submitResult.hash
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const status = await server.getTransaction(hash)
    if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return hash
    if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction failed on-chain')
    }
  }
  throw new Error('Transaction timed out waiting for confirmation')
}

/** Read-only contract call (no signing required) */
async function queryContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourcePublicKey: string
): Promise<xdr.ScVal> {
  const account = await server.getAccount(sourcePublicKey)
  const contract = new Contract(contractId)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const sim = await server.simulateTransaction(tx)
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Query failed: ${sim.error}`)
  }
  if (!sim.result) throw new Error('No result from query')
  return sim.result.retval
}

// ─── Contract: DisputeCourt ───────────────────────────────────────────────────

/** File a new dispute on-chain. Returns the transaction hash. */
export async function fileDispute(
  pubKey: string,
  respondent: string,
  title: string,
  description: string,
  category: string,
  evidence: string,
  stakePerJuror: number, // in XLM, we convert to stroops
  votingPeriodSecs: number = 604800
): Promise<string> {
  if (!DISPUTE_COURT_ID) throw new Error('Contract not deployed – VITE_DISPUTE_COURT_ID is not set')
  const args = [
    addr(pubKey),
    addr(respondent),
    nativeToScVal(title,       { type: 'string' }),
    nativeToScVal(description, { type: 'string' }),
    nativeToScVal(category,    { type: 'string' }),
    nativeToScVal(evidence,    { type: 'string' }),
    nativeToScVal(BigInt(stakePerJuror * 10_000_000), { type: 'i128' }),
    nativeToScVal(BigInt(votingPeriodSecs),            { type: 'u64' }),
  ]
  return invokeContract(DISPUTE_COURT_ID, 'file_dispute', args, pubKey)
}

/** Cast a vote on a dispute. Returns the transaction hash. */
export async function castVote(
  pubKey: string,
  disputeId: number,
  side: number // 1=claimant, 2=respondent, 3=abstain
): Promise<string> {
  if (!DISPUTE_COURT_ID) throw new Error('Contract not deployed – VITE_DISPUTE_COURT_ID is not set')
  const args = [
    addr(pubKey),
    nativeToScVal(BigInt(disputeId), { type: 'u64' }),
    nativeToScVal(side,              { type: 'u32' }),
  ]
  return invokeContract(DISPUTE_COURT_ID, 'cast_vote', args, pubKey)
}

/** Fetch a single dispute by ID */
export async function getDispute(pubKey: string, disputeId: number): Promise<Dispute> {
  if (!DISPUTE_COURT_ID) throw new Error('Contract not configured')
  const result = await queryContract(
    DISPUTE_COURT_ID,
    'get_dispute',
    [nativeToScVal(BigInt(disputeId), { type: 'u64' })],
    pubKey
  )
  return scValToNative(result) as Dispute
}

/** Fetch total number of disputes */
export async function getTotalDisputes(pubKey: string): Promise<number> {
  if (!DISPUTE_COURT_ID) throw new Error('Contract not configured')
  const result = await queryContract(DISPUTE_COURT_ID, 'get_total_disputes', [], pubKey)
  return Number(scValToNative(result))
}

/** Fetch all disputes filed by or against a user */
export async function getUserDisputes(pubKey: string): Promise<Dispute[]> {
  if (!DISPUTE_COURT_ID) throw new Error('Contract not configured')
  const result = await queryContract(
    DISPUTE_COURT_ID,
    'get_user_disputes',
    [addr(pubKey)],
    pubKey
  )
  return scValToNative(result) as Dispute[]
}

// ─── Contract: JurorRegistry ──────────────────────────────────────────────────

/** Fetch a juror profile (creates a default Observer profile if first time) */
export async function getJurorProfile(pubKey: string): Promise<JurorProfile | null> {
  if (!JUROR_REGISTRY_ID) return null
  try {
    const result = await queryContract(
      JUROR_REGISTRY_ID,
      'get_juror',
      [addr(pubKey)],
      pubKey
    )
    return scValToNative(result) as JurorProfile
  } catch {
    // Juror not found — return a default blank profile
    return {
      juror: pubKey,
      reputation: 0,
      tier: 'Observer',
      votes_cast: 0,
      votes_correct: 0,
      votes_incorrect: 0,
      votes_abstained: 0,
      total_staked: 0,
      total_earned: 0,
      joined_at: Math.floor(Date.now() / 1000),
      last_active: Math.floor(Date.now() / 1000),
    }
  }
}
