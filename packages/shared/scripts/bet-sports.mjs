// Headless Azuro sports bet on Polygon Amoy using the player wallet key.
// Proves the gasless flow: (mint/approve USDT) -> sign EIP-712 order -> submit
// via createBet, with our affiliate. No browser (docs/architecture/22).
//
// NOTE: Amoy POL gas is NOT CDP-faucetable — fund the player with POL from
// https://faucet.polygon.technology first for the on-chain mint/approve steps.
// The signature + relayer submission are verified regardless.
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, erc20Abi } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import * as az from '@azuro-org/toolkit';

const CHAIN_ID = 80002;
const RPC = 'https://rpc-amoy.polygon.technology';
const player = JSON.parse(readFileSync('.secrets/test-wallet.json', 'utf8'));
const house = JSON.parse(readFileSync('.secrets/house-wallet.json', 'utf8'));
const AFFILIATE = house.address;

const d = az.polygonAmoyData;
const USDT = d.betToken.address;
const DECIMALS = d.betToken.decimals;
const CORE = d.contracts.core.address;
const RELAYER = d.contracts.relayer.address;
const FEED = d.graphql.feed;

const account = mnemonicToAccount(player.mnemonic);
const transport = http(RPC);
const pub = createPublicClient({ chain: d.chain, transport });
const wallet = createWalletClient({ chain: d.chain, account, transport });

const usdtAbi = [{ name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] }, ...erc20Abi];
const BET = process.env.BET_USDT || '1';
const amount = parseUnits(BET, DECIMALS);

console.log(`Player: ${account.address}  Affiliate(house): ${AFFILIATE}`);
const pol = await pub.getBalance({ address: account.address });
console.log(`POL gas: ${formatUnits(pol, 18)}`);

// 1) Find a live active market.
const now = Math.floor(Date.now() / 1000);
const games = (await (await fetch(FEED, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: `{ games(first:25, orderBy: startsAt, orderDirection: desc){ gameId title } }` }) })).json()).data.games;
let pick = null;
for (const g of games) {
  const conds = await az.getConditionsByGameIds({ chainId: CHAIN_ID, gameIds: [g.gameId], extended: true });
  const arr = Array.isArray(conds) ? conds : conds.conditions || [];
  const m = arr.find((c) => c.state === 'Active' && c.isPrematchEnabled && c.outcomes?.length);
  if (m) { pick = { game: g, cond: m, outcome: m.outcomes[0] }; break; }
}
if (!pick) { console.log('BLOCKER: no active prematch market on Amoy right now.'); process.exit(2); }
console.log(`Market: ${pick.game.title} — ${pick.cond.title} => ${pick.outcome.title} @ ${pick.outcome.odds}`);

// 2) Fund USDT (mint) + approve relayer — only if we have POL for gas.
if (pol > 0n) {
  let bal = await pub.readContract({ address: USDT, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  if (bal < amount) { const h = await wallet.writeContract({ address: USDT, abi: usdtAbi, functionName: 'mint', args: [parseUnits('100', DECIMALS)] }); await pub.waitForTransactionReceipt({ hash: h }); }
  const allow = await pub.readContract({ address: USDT, abi: erc20Abi, functionName: 'allowance', args: [account.address, RELAYER] });
  if (allow < amount) { const h = await wallet.writeContract({ address: USDT, abi: erc20Abi, functionName: 'approve', args: [RELAYER, amount * 1000n] }); await pub.waitForTransactionReceipt({ hash: h }); }
  console.log('USDT funded + relayer approved.');
} else {
  console.log('No POL gas — skipping mint/approve; still verifying signature + relayer acceptance.');
}

// 3) Build + sign order, submit to relayer.
const fee = await az.getBetFee(CHAIN_ID);
const minOdds = BigInt(Math.floor(Number(pick.outcome.odds) * 0.9 * 1e12)).toString();
const clientData = {
  attention: 'By signing this transaction, I agree to place a bet for an event on Azuro Protocol',
  affiliate: AFFILIATE, core: CORE, expiresAt: Math.floor(Date.now() / 1000) + 300, chainId: CHAIN_ID,
  relayerFeeAmount: fee.relayerFeeAmount, isBetSponsored: false, isFeeSponsored: false, isSponsoredBetReturnable: false,
};
const bet = { conditionId: pick.cond.conditionId, outcomeId: pick.outcome.outcomeId, minOdds, amount: amount.toString(), nonce: String(Date.now()) };
const { account: _a, ...typed } = az.getBetTypedData({ account: account.address, clientData, bet });
const signature = await account.signTypedData(typed);
console.log('Signed order (EIP-712). Submitting to Azuro relayer…');
const res = await az.createBet({ account: account.address, clientData, bet, signature });
console.log('createBet:', JSON.stringify(res));
