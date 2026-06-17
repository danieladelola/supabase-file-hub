// Hardcoded list of cryptocurrencies that may be used as a *payment method*
// for funding (deposit) and payout (withdraw) of the user's USD wallet.
// These are NOT user-balance assets in the deposit/withdraw flow — they are
// only conduits. Live USD prices come from CoinGecko via useCoinList().

export type PaymentCoin = {
  symbol: string;
  name: string;
  coingecko_id: string;
  defaultNetwork: string;
  networks: string[];
  /** CoinGecko CDN icon URL (static fallback so UI renders instantly). */
  image: string;
  /** Approximate USD price used as instant fallback before live data loads. */
  fallbackPrice: number;
};

export const PAYMENT_COINS: PaymentCoin[] = [
  { symbol: "BTC",  name: "Bitcoin",   coingecko_id: "bitcoin",      defaultNetwork: "Bitcoin",     networks: ["Bitcoin"],
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",   fallbackPrice: 95000 },
  { symbol: "ETH",  name: "Ethereum",  coingecko_id: "ethereum",     defaultNetwork: "ERC-20",      networks: ["ERC-20"],
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", fallbackPrice: 3400 },
  { symbol: "USDT", name: "Tether",    coingecko_id: "tether",       defaultNetwork: "TRC-20",      networks: ["ERC-20", "TRC-20", "Solana"],
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",   fallbackPrice: 1 },
  { symbol: "USDC", name: "USD Coin",  coingecko_id: "usd-coin",     defaultNetwork: "ERC-20",      networks: ["ERC-20", "TRC-20", "Solana"],
    image: "https://assets.coingecko.com/coins/images/6319/large/usdc.png",    fallbackPrice: 1 },
  { symbol: "SOL",  name: "Solana",    coingecko_id: "solana",       defaultNetwork: "Solana",      networks: ["Solana"],
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",  fallbackPrice: 180 },
  { symbol: "TRX",  name: "Tron",      coingecko_id: "tron",         defaultNetwork: "Tron",        networks: ["Tron"],
    image: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png", fallbackPrice: 0.25 },
  { symbol: "XRP",  name: "Ripple",    coingecko_id: "ripple",       defaultNetwork: "XRP Ledger",  networks: ["XRP Ledger"],
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", fallbackPrice: 2.3 },
];

export const DEFAULT_PAYMENT_COIN = "BTC";

export const PAYMENT_COIN_SYMBOLS = PAYMENT_COINS.map((c) => c.symbol);
