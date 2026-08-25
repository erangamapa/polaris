// Generate a fresh TESTNET-ONLY player wallet for TriBet and save it to
// .secrets/ (gitignored).
//
// Deliberately separate from packages/shared/scripts/provision.mjs: that one
// provisions the house + player pair for autonomous agent runs and emits
// MNEMONICS. This one is for a HUMAN who is about to paste a key into a browser
// extension, and that changes two things:
//
//   1. It emits a PRIVATE KEY, not a seed phrase. In MetaMask, "Import Account"
//      (private key) adds one extra account beside whatever the person already
//      has. Restoring a SEED PHRASE replaces the entire vault — someone with a
//      real wallet in that extension could lose access to it. Handing a human a
//      mnemonic invites exactly that mistake, so this never prints one.
//   2. It refuses to run at all if the destination is not gitignored (below).
//
// The key this prints is disposable and worthless: it is minted here, funded
// only from testnet faucets, and used only on Base Sepolia / Polygon Amoy.
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = '.secrets/player-wallet.json';

// HARD SAFETY GATE. A private key must never land somewhere git can pick it up,
// so this asks git itself rather than trusting that .gitignore still says what
// it said when this script was written. If git does not consider the path
// ignored — the rule was edited, or this is running outside the repo — nothing
// is written and nothing is printed.
function assertIgnored(path) {
  try {
    execFileSync('git', ['check-ignore', '-q', path], { stdio: 'ignore' });
  } catch {
    console.error(`REFUSING TO WRITE A PRIVATE KEY.\n\n  ${path} is not gitignored, so a key written there could be committed.\n  Add '.secrets/' to .gitignore and re-run.`);
    process.exit(1);
  }
}

assertIgnored(OUT);

// Reuse an existing wallet rather than silently replacing one that may already
// hold faucet funds and be imported in someone's browser.
if (existsSync(OUT)) {
  const existing = JSON.parse(readFileSync(OUT, 'utf8'));
  console.log(JSON.stringify({ ...existing, reused: true }, null, 2));
  process.exit(0);
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

const wallet = {
  role: 'player/test',
  address: account.address,
  privateKey,
  networks: [
    { name: 'Base Sepolia', chainId: 84532, use: 'casino bets + gas (ETH)' },
    { name: 'Polygon Amoy', chainId: 80002, use: 'sports bets (USDT) + gas (POL)' },
  ],
  testnetOnly: true,
  createdAt: new Date().toISOString(),
  warning: 'TESTNET ONLY. Disposable key. Never send real funds to this address and never reuse this key on mainnet.',
  reused: false,
};

mkdirSync('.secrets', { recursive: true });
writeFileSync(OUT, JSON.stringify(wallet, null, 2));
console.log(JSON.stringify(wallet, null, 2));
