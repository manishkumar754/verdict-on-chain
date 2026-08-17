/**
 * wallet.ts – Freighter browser wallet integration
 * Uses @creit.tech/stellar-wallets-kit for unified wallet access.
 * Persists the connected public key in localStorage so the session
 * survives a page refresh without requiring re-authentication.
 */

import {
  StellarWalletsKit,
  WalletNetwork,
  WalletType,
  FREIGHTER_ID,
  FreighterModule,
} from '@creit.tech/stellar-wallets-kit'
import { Networks, SorobanRpc } from '@stellar/stellar-sdk'
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from './constants'

// ─── Wallet Kit singleton ─────────────────────────────────────────────────────

export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: [new FreighterModule()],
})

// ─── LocalStorage persistence key ────────────────────────────────────────────

const STORAGE_KEY = 'verdictchain_pubkey'

export function getPersistedPubKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

export function persistPubKey(pubKey: string) {
  try { localStorage.setItem(STORAGE_KEY, pubKey) } catch {}
}

export function clearPersistedPubKey() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// ─── Connect wallet via Freighter modal ──────────────────────────────────────

export async function connectWallet(): Promise<string> {
  await kit.openModal({
    onWalletSelected: async (option: { id: WalletType }) => {
      kit.setWallet(option.id)
    },
  })
  const { address } = await kit.getAddress()
  persistPubKey(address)
  return address
}

// ─── Sign an XDR transaction string ──────────────────────────────────────────

export async function signTransaction(xdr: string, pubKey: string): Promise<string> {
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    address: pubKey,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
  return signedTxXdr
}

// ─── Fetch XLM balance ────────────────────────────────────────────────────────

export async function fetchBalance(pubKey: string): Promise<string> {
  try {
    const server = new SorobanRpc.Server(SOROBAN_RPC_URL)
    const account = await server.getAccount(pubKey)
    const xlmBalance = account.balances.find(
      (b: { asset_type: string }) => b.asset_type === 'native'
    )
    if (!xlmBalance) return '0'
    return parseFloat((xlmBalance as { balance: string }).balance).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })
  } catch {
    return '—'
  }
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export function disconnectWallet() {
  clearPersistedPubKey()
}
