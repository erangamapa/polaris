// SX Bet sports integration bound to the connected wallet (SX Toronto testnet).
// Read: real, priced markets from the public order book (no key, no wallet).
// Write: fill a maker order — approve USDC -> sign an EIP-712 fill -> POST
// /orders/fill/v2, auto-switching the wallet to SX Network at bet time. Signing
// addresses come from /metadata at runtime (SX rotates them per environment).
import { useCallback, useEffect, useState } from "react";
import { useAccount, useConfig } from "wagmi";
import { getWalletClient, getPublicClient, switchChain } from "@wagmi/core";
import { parseUnits, formatUnits, erc20Abi, zeroAddress, maxUint256 } from "viem";
import { sxbet } from "@shared/chains";
import { loadSxEvents, fetchSxMetadata, sxUrl } from "@/lib/sxbet";
import { normalizeSxGame } from "@/lib/sportsModel";

const SX_CHAIN_ID = sxbet.chainId;
const USDC = sxbet.betToken.address;
const DECIMALS = sxbet.betToken.decimals;
const ZERO_HASH = `0x${"0".repeat(64)}`;
const POLL_MS = 60_000;

// Normalized SX events for every customer-facing sports page — mirrors
// useNormalizedAzuroEvents() exactly, so App.jsx can swap one for the other.
// Each normalized outcome keeps its order-fill descriptor on `.raw` so
// SxBetSlip can reconstruct the exact bet when an odds button is clicked.
export function useNormalizedSxEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const games = await loadSxEvents();
        const normalized = games.map(normalizeSxGame).filter(Boolean);
        if (!cancelled) setEvents(normalized);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { events, loading, bettableCount: events.filter((e) => e.status === "upcoming").length };
}

// EIP-712 fill signature — see docs.sx.bet (post-fill-order / filling-orders).
// The outer Details fields are protocol placeholders; the real bet lives in
// `fills`. `verifyingContract`/`version` are read from metadata at call time.
const FILL_TYPES = {
  Details: [
    { name: "action", type: "string" },
    { name: "market", type: "string" },
    { name: "betting", type: "string" },
    { name: "stake", type: "string" },
    { name: "worstOdds", type: "string" },
    { name: "worstReturning", type: "string" },
    { name: "fills", type: "FillObject" },
  ],
  FillObject: [
    { name: "stakeWei", type: "string" },
    { name: "marketHash", type: "string" },
    { name: "baseToken", type: "string" },
    { name: "desiredOdds", type: "string" },
    { name: "oddsSlippage", type: "uint256" },
    { name: "isTakerBettingOutcomeOne", type: "bool" },
    { name: "fillSalt", type: "uint256" },
    { name: "beneficiary", type: "address" },
    { name: "beneficiaryType", type: "uint8" },
    { name: "cashOutTarget", type: "bytes32" },
  ],
};

// A random 32-byte salt as a decimal string (uint256), per the SX fill spec.
function randomFillSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return BigInt(hex).toString();
}

const DEFAULT_ODDS_SLIPPAGE = 3; // %, tolerate small book movement between quote and fill

export function useSxBet() {
  const { isConnected } = useAccount();
  const config = useConfig();

  const readUsdcBalance = useCallback(
    async (address) => {
      const publicClient = getPublicClient(config, { chainId: SX_CHAIN_ID });
      const raw = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [address] });
      return Number(formatUnits(raw, DECIMALS));
    },
    [config],
  );

  // Fill the best maker order on the selected side.
  //   selection.raw = { marketHash, baseToken, isTakerBettingOutcomeOne,
  //                     desiredOdds, percentageOdds, odds }
  const placeBet = useCallback(
    async ({ fill, amountUsdc, onStep }) => {
      onStep?.("switching");
      await switchChain(config, { chainId: SX_CHAIN_ID });
      const walletClient = await getWalletClient(config, { chainId: SX_CHAIN_ID });
      const publicClient = getPublicClient(config, { chainId: SX_CHAIN_ID });
      const account = walletClient.account.address;
      const stakeWei = parseUnits(String(amountUsdc), DECIMALS);
      const baseToken = fill.baseToken || USDC;

      onStep?.("funding");
      const balance = await publicClient.readContract({ address: baseToken, abi: erc20Abi, functionName: "balanceOf", args: [account] });
      if (balance < stakeWei) {
        throw new Error(`Insufficient testnet USDC. Fund this wallet from the SX faucet (${sxbet.faucet}) and try again.`);
      }

      // Signing addresses are environment-specific — always from metadata.
      const meta = await fetchSxMetadata();
      const spender = meta.TokenTransferProxy;
      const verifyingContract = meta.EIP712FillHasher;
      const version = meta.domainVersion;

      onStep?.("approving");
      const allowance = await publicClient.readContract({ address: baseToken, abi: erc20Abi, functionName: "allowance", args: [account, spender] });
      if (allowance < stakeWei) {
        const hash = await walletClient.writeContract({ address: baseToken, abi: erc20Abi, functionName: "approve", args: [spender, maxUint256] });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      onStep?.("signing");
      const fillSalt = randomFillSalt();
      const domain = { name: sxbet.eip712DomainName, version, chainId: SX_CHAIN_ID, verifyingContract };
      const fillObject = {
        stakeWei: stakeWei.toString(),
        marketHash: fill.marketHash,
        baseToken,
        desiredOdds: String(fill.desiredOdds),
        oddsSlippage: BigInt(DEFAULT_ODDS_SLIPPAGE),
        isTakerBettingOutcomeOne: !!fill.isTakerBettingOutcomeOne,
        fillSalt: BigInt(fillSalt),
        // Affiliate attribution goes here once SX approves an affiliate address
        // (beneficiary + beneficiaryType). Zero = no affiliate; see the spec.
        beneficiary: zeroAddress,
        beneficiaryType: 0,
        cashOutTarget: ZERO_HASH,
      };
      const message = {
        action: "N/A", market: fill.marketHash, betting: "N/A", stake: "N/A",
        worstOdds: "N/A", worstReturning: "N/A", fills: fillObject,
      };
      const takerSig = await walletClient.signTypedData({ account, domain, types: FILL_TYPES, primaryType: "Details", message });

      onStep?.("submitting");
      const res = await fetch(sxUrl("orders/fill/v2"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          market: fill.marketHash,
          baseToken,
          isTakerBettingOutcomeOne: !!fill.isTakerBettingOutcomeOne,
          stakeWei: stakeWei.toString(),
          desiredOdds: String(fill.desiredOdds),
          oddsSlippage: DEFAULT_ODDS_SLIPPAGE,
          fillSalt,
          taker: account,
          takerSig,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status === "failure" || (!body.data && !body.fillHash)) {
        throw new Error(body?.message || body?.error || "SX fill rejected");
      }
      return body.data ?? body;
    },
    [config],
  );

  return { ready: isConnected, placeBet, readUsdcBalance };
}
