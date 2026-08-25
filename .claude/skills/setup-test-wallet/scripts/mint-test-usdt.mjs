// Mint test USDT to the test wallet on Polygon Amoy (sports betting stake).
//
// There is no public web faucet for this token — it is a test ERC-20 whose
// mint(uint256) is callable by anyone (see packages/shared/chains.js's azuro
// betToken, and bet-sports.mjs which does the same thing). So this signs the
// mint locally with the test key instead of sending someone hunting for a
// faucet that does not exist.
//
// Needs POL for gas first: get that from https://faucet.polygon.technology
// (select Polygon Amoy). Without it, this exits with a clear message rather
// than a raw revert.
//
// Usage:  node skills/setup-test-wallet/scripts/mint-test-usdt.mjs [amount]
import { createPublicClient, createWalletClient, erc20Abi, formatEther, formatUnits, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'node:fs';
import { azuro, polygonAmoy } from '../../../../packages/shared/chains.js';
import { transportFor } from './rpc.mjs';

const AMOUNT = process.argv[2] ?? '100';
const { privateKey } = JSON.parse(readFileSync('.secrets/player-wallet.json', 'utf8'));
const account = privateKeyToAccount(privateKey);

const transport = transportFor(polygonAmoy);
const pub = createPublicClient({ chain: polygonAmoy, transport });
const wallet = createWalletClient({ account, chain: polygonAmoy, transport });

const gas = await pub.getBalance({ address: account.address });
if (gas === 0n) {
  console.error(
    `No POL for gas on Polygon Amoy.\n\n` +
    `  Wallet: ${account.address}\n` +
    `  Get POL from https://faucet.polygon.technology (select "Polygon Amoy"),\n` +
    `  then re-run this script.`
  );
  process.exit(1);
}

const mintAbi = [{ name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] }];
const amount = parseUnits(AMOUNT, azuro.betToken.decimals);

console.log(`Wallet ${account.address}`);
console.log(`POL gas: ${formatEther(gas)}`);
console.log(`Minting ${AMOUNT} test USDT...`);

try {
  const hash = await wallet.writeContract({ address: azuro.betToken.address, abi: mintAbi, functionName: 'mint', args: [amount] });
  await pub.waitForTransactionReceipt({ hash });
  const balance = await pub.readContract({ address: azuro.betToken.address, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
  console.log(`Done. ${polygonAmoy.blockExplorers.default.url}/tx/${hash}`);
  console.log(`USDT balance: ${formatUnits(balance, azuro.betToken.decimals)}`);
} catch (e) {
  console.error(`Mint failed: ${e.shortMessage ?? e.message}`);
  process.exit(1);
}
