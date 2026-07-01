// Provision the house/affiliate + player test wallets (Base Sepolia, testnet).
// Idempotent: re-running reuses existing .secrets/*.json. Seeds are gitignored.
import { generateMnemonic, english, mnemonicToAccount } from 'viem/accounts';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function provision(role, file) {
  if (existsSync(file)) return { ...JSON.parse(readFileSync(file, 'utf8')), reused: true };
  mkdirSync(dirname(file), { recursive: true });
  const mnemonic = generateMnemonic(english);
  const account = mnemonicToAccount(mnemonic);
  const data = {
    role,
    address: account.address,
    mnemonic,
    derivationPath: "m/44'/60'/0'/0/0",
    chain: 'base-sepolia',
    chainId: 84532,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(file, JSON.stringify(data, null, 2));
  return { ...data, reused: false };
}

const house = provision('house/affiliate', '.secrets/house-wallet.json');
const player = provision('player/test', '.secrets/test-wallet.json');
console.log(`HOUSE  : ${house.address} ${house.reused ? '(reused)' : '(new)'}`);
console.log(`PLAYER : ${player.address} ${player.reused ? '(reused)' : '(new)'}`);
