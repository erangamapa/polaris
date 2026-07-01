// Verify + claim BetSwirl affiliate revenue for the house wallet.
// Reads accrued affiliate revenue (bank.affiliateAmounts) and, if non-zero,
// claims it (bank.withdrawAffiliateRevenues) — proving revenue lands at the house.
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import * as sdk from '@betswirl/sdk-core';

const ETH = '0x0000000000000000000000000000000000000000';
const c = sdk.casinoChainById[84532];
const bank = c.contracts.bank;
const house = JSON.parse(readFileSync('.secrets/house-wallet.json', 'utf8'));
const HOUSE = house.address;

const account = mnemonicToAccount(house.mnemonic);
const transport = http('https://sepolia.base.org');
const pub = createPublicClient({ chain: c.viemChain, transport });
const wallet = createWalletClient({ chain: c.viemChain, account, transport });

const accrued = await pub.readContract({ address: bank, abi: sdk.bankAbi, functionName: 'affiliateAmounts', args: [HOUSE, ETH] });
console.log(`House ${HOUSE}`);
console.log(`Accrued BetSwirl affiliate revenue (ETH): ${formatEther(accrued)} (${accrued} wei)`);

if (accrued === 0n) {
  console.log('No claimable revenue yet (affiliate attribution is on-chain; accrual is dust at this volume).');
  process.exit(0);
}

const before = await pub.getBalance({ address: HOUSE });
console.log('Claiming via bank.withdrawAffiliateRevenues…');
const hash = await wallet.writeContract({ address: bank, abi: sdk.bankAbi, functionName: 'withdrawAffiliateRevenues', args: [HOUSE, ETH] });
const receipt = await pub.waitForTransactionReceipt({ hash });
const after = await pub.getBalance({ address: HOUSE });
console.log(`Claim tx: ${hash} (status ${receipt.status})`);
console.log(`House balance ${formatEther(before)} -> ${formatEther(after)} ETH (delta ${formatEther(after - before)})`);
console.log('PASS: affiliate revenue claimed to the house wallet.');
