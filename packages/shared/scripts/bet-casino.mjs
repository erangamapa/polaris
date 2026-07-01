// Headless BetSwirl casino bet on Base Sepolia using the player wallet key.
// Proves the full on-chain loop: place dice bet -> Chainlink VRF -> settle ->
// affiliate attributed to the house wallet. No browser (docs/architecture/22).
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import * as betswirl from '@betswirl/sdk-core';

const GAS_TOKEN_ADDRESS = betswirl.GAS_TOKEN_ADDRESS;

const CHAIN_ID = 84532;
const player = JSON.parse(readFileSync('.secrets/test-wallet.json', 'utf8'));
const house = JSON.parse(readFileSync('.secrets/house-wallet.json', 'utf8'));
const AFFILIATE = house.address;
const BET_AMOUNT = parseEther(process.env.BET_ETH || '0.00001');

const chain = betswirl.casinoChainById[CHAIN_ID].viemChain;
const account = mnemonicToAccount(player.mnemonic);
const transport = http('https://sepolia.base.org');
const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ chain, account, transport });

const client = betswirl.initViemBetSwirlClient(publicClient, walletClient, {
  chainId: CHAIN_ID,
  affiliate: AFFILIATE,
});

console.log(`Player  : ${account.address}`);
console.log(`Affiliate(house): ${AFFILIATE}`);
console.log(`Bet     : ${formatEther(BET_AMOUNT)} ETH on Dice (cap 50)`);

const before = await publicClient.getBalance({ address: account.address });
console.log(`Balance before: ${formatEther(before)} ETH`);

console.log('Placing dice bet…');
const { placedBet, receipt } = await client.playDice(
  { betAmount: BET_AMOUNT, cap: 50, tokenAddress: GAS_TOKEN_ADDRESS, affiliate: AFFILIATE },
  { pollingInterval: 2000 },
);
console.log(`  bet tx: ${receipt.transactionHash}  (status ${receipt.status})`);
console.log(`  betId: ${placedBet.id}  affiliate on-chain: ${placedBet.affiliate}`);

console.log('Waiting for Chainlink VRF roll…');
const { rolledBet } = await client.waitRolledBet(placedBet, { pollingInterval: 2500, timeout: 120000 });
console.log(`  rolled: ${JSON.stringify(rolledBet, (k, v) => (typeof v === 'bigint' ? v.toString() : v))}`);
console.log(`  isWin: ${rolledBet.isWin}  payout: ${rolledBet.payout ? formatEther(rolledBet.payout) : '0'} ETH`);

const after = await publicClient.getBalance({ address: account.address });
console.log(`Balance after: ${formatEther(after)} ETH  (delta ${formatEther(after - before)})`);

// Assertions for the QA gate.
const affiliateOk = placedBet.affiliate?.toLowerCase() === AFFILIATE.toLowerCase();
const settled = receipt.status === 'success' && rolledBet != null;
console.log(`\nQA GATE: settled=${settled} affiliateAttributed=${affiliateOk}`);
if (!settled || !affiliateOk) process.exit(1);
console.log('PASS: BetSwirl on-chain bet settled via VRF with affiliate attributed to house.');
