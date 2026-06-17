// Hardcoded fallback deposit addresses, keyed as `${SYMBOL}:${NETWORK}`.
// These are used when no admin override exists in `system_settings.deposit_addresses`.
// Admin-set values in the DB always take precedence (via useDepositAddresses).
// Update these when wallet ownership changes.

export const DEPOSIT_ADDRESS_FALLBACKS: Record<string, string> = {
  "BTC:Bitcoin":     "bc1qexamplebtcaddressreplaceme0000000000",
  "ETH:ERC-20":      "0xExampleEthAddressReplaceMe000000000000000",
  "USDT:ERC-20":     "0xExampleEthAddressReplaceMe000000000000000",
  "USDT:TRC-20":     "TExampleTronUsdtAddressReplaceMe0000000",
  "USDT:Solana":     "ExampleSolanaUsdtAddressReplaceMe000000000000",
  "USDC:ERC-20":     "0xExampleEthAddressReplaceMe000000000000000",
  "USDC:TRC-20":     "TExampleTronUsdcAddressReplaceMe0000000",
  "USDC:Solana":     "ExampleSolanaUsdcAddressReplaceMe000000000000",
  "SOL:Solana":      "ExampleSolanaSolAddressReplaceMe000000000000",
  "TRX:Tron":        "TExampleTronTrxAddressReplaceMe00000000",
  "XRP:XRP Ledger":  "rExampleXrpAddressReplaceMe00000000000",
};
