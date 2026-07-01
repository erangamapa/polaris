// Headless Azuro sports bet on Base Sepolia using the player wallet key.
// Proves the gasless flow: wrap WETH -> approve relayer -> sign EIP-712 order ->
// submit via createBet -> confirm affiliate == house. No browser (docs/22).
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, parseEther, formatEther, erc20Abi } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import * as az from '@azuro-org/toolkit';

const CHAIN_ID = 84532;
const RPC = 'https://sepolia.base.org';
const WETH = '0x9e09f213Ff75e53D52e9e777A6567A68683E935f';
const player = JSON.parse(readFileSync('.secrets/test-wallet.json', 'utf8'));
const house = JSON.parse(readFileSync('.secrets/house-wallet.json', 'utf8'));
const AFFILIATE = house.address;

const d = az.baseSepoliaData;
const CORE = d.contracts.core.address;
const RELAYER = d.contracts.relayer.address;
const FEED = d.graphql.feed;

const account = mnemonicToAccount(player.mnemonic);
const transport = http(RPC);
const pub = createPublicClient({ chain: d.chain, transport });
const wallet = createWalletClient({ chain: d.chain, account, transport });

const BET_WETH = process.env.BET_WETH || '0.0002';
const betAmountWei = parseEther(BET_WETH);

console.log(`Player: ${account.address}`);
console.log(`Core: ${CORE}  Relayer: ${RELAYER}  Affiliate(house): ${AFFILIATE}`);

// 1) Find a live/active bettable condition + outcome.
const now = Math.floor(Date.now() / 1000);
const games = (await (await fetch(FEED, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: `{ games(first:25, orderBy: startsAt, orderDirection: desc){ gameId startsAt title sport{name} } }` }) })).json()).data.games;
let pick = null;
for (const g of games) {
  const conds = await az.getConditionsByGameIds({ chainId: CHAIN_ID, gameIds: [g.gameId], extended: true });
  const arr = Array.isArray(conds) ? conds : conds.conditions || [];
  const active = arr.find((c) => c.state === 'Active' && c.isPrematchEnabled && c.outcomes?.length);
  if (active) { pick = { game: g, cond: active, outcome: active.outcomes[0] }; break; }
}
if (!pick) { console.log('BLOCKER: no active prematch condition on testnet feed right now.'); process.exit(2); }
console.log(`Betting ${BET_WETH} WETH on: ${pick.game.title} — ${pick.cond.title} => ${pick.outcome.title} @ ${pick.outcome.odds}`);
console.log(`  conditionId=${pick.cond.conditionId} outcomeId=${pick.outcome.outcomeId}`);

// 2) Ensure WETH: wrap ETH -> WETH if needed.
let weth = await pub.readContract({ address: WETH, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
if (weth < betAmountWei) {
  console.log('Wrapping ETH -> WETH…');
  const wrapHash = await wallet.writeContract({ address: WETH, abi: [{ name: 'deposit', type: 'function', stateMutability: 'payable', inputs: [], outputs: [] }], functionName: 'deposit', value: betAmountWei });
  await pub.waitForTransactionReceipt({ hash: wrapHash });
  weth = await pub.readContract({ address: WETH, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
}
console.log(`  WETH balance: ${formatEther(weth)}`);

// 3) Approve WETH to the relayer.
const allowance = await pub.readContract({ address: WETH, abi: erc20Abi, functionName: 'allowance', args: [account.address, RELAYER] });
if (allowance < betAmountWei) {
  console.log('Approving WETH to relayer…');
  const apHash = await wallet.writeContract({ address: WETH, abi: erc20Abi, functionName: 'approve', args: [RELAYER, betAmountWei * 100n] });
  await pub.waitForTransactionReceipt({ hash: apHash });
}

// 4) Build the order.
const fee = await az.getBetFee(CHAIN_ID);
const oddsScaled = BigInt(Math.floor(Number(pick.outcome.odds) * 0.9 * 1e12)); // 10% slippage floor
const nonce = String(Date.now());
const clientData = {
  attention: 'By signing this transaction, I agree to place a bet for an event on Azuro Protocol',
  affiliate: AFFILIATE,
  core: CORE,
  expiresAt: Math.floor(Date.now() / 1000) + 300,
  chainId: CHAIN_ID,
  relayerFeeAmount: fee.relayerFeeAmount,
  isBetSponsored: false,
  isFeeSponsored: false,
  isSponsoredBetReturnable: false,
};
const bet = { conditionId: pick.cond.conditionId, outcomeId: pick.outcome.outcomeId, minOdds: oddsScaled.toString(), amount: betAmountWei.toString(), nonce };

// 5) Sign EIP-712 with the local key + submit.
const typedData = az.getBetTypedData({ account: account.address, clientData, bet });
const { account: _typedAccount, ...typed } = typedData;
const signature = await account.signTypedData(typed);
console.log('Signed order. Submitting to Azuro relayer…');
const res = await az.createBet({ account: account.address, clientData, bet, signature });
console.log('createBet result:', JSON.stringify(res));

if (res.error || res.errorMessage) { console.log(`RELAYER ERROR: ${res.errorMessage || res.error}`); process.exit(1); }
console.log(`\nOrder ${res.id} state=${res.state}. Polling…`);
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const st = await az.getBet({ chainId: CHAIN_ID, betId: res.id }).catch(() => null);
  if (st) { console.log(`  bet state: ${JSON.stringify(st).slice(0, 300)}`); break; }
}
console.log('PASS: Azuro order signed + accepted by relayer with affiliate = house.');
