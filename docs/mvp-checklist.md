# Polaris — Crypto-First MVP Checklist

Tracks the head-of-product P0 scope (`crypto_first_mvp_necessities`) against the current prototype.

**Legend:** `[x]` built in prototype (mock data) · `[~]` partial / static mock · `[ ]` not started
**Scope note:** This is a front-end prototype. "Built" means the UI + flow works against mock data — it does not mean a real provider/integration is wired.

_Last updated: 2026-06-30 (refinement pass: My Activity, settlement, favourites, search, order-book toggle, a11y)_

---

## 1. Product principles (design intent)

- [x] One account, one balance feel across Sportsbook / Casino / Predictions
- [x] Crypto as the rail, USD-equivalent presentation of stakes/payouts/balance
- [x] Familiarity over invention (Stake / Polymarket patterns)
- [x] Reliability before breadth (few sports, curated markets)
- [~] No surprises (fees/settlement/withdrawal states clear before commit) — _improving with wallet depth_
- [x] Mobile first (responsive shell, bottom product bar, drawers)

## 2. P0 launch scope

### Account & access
- [x] Sign up / login / logout — _mock session: 4 wallets + email/password, persisted to localStorage_
- [ ] Account recovery
- [~] Age & jurisdiction checks — _country + DOB collected in mock KYC; no real checks_
- [x] KYC where required — _mock KYC gates the whole wallet (deposit + withdraw)_
- [ ] 2FA
- [ ] Basic settings
- [~] Responsible-gambling controls — _18+ footer only; no limits/cool-off_

### Unified crypto wallet
- [x] One platform balance (shared across all products)
- [x] Supported crypto deposits — _asset + network select, address, QR_
- [x] Network selection
- [x] QR / address
- [x] Deposit confirmations (detected → confirming → credited)
- [x] Conversion disclosure (rate + spread before crediting)
- [x] Withdrawals (full staged flow)
- [x] Fees + exact amount received
- [x] Transaction history
- [x] Clear pending states (available / in-play / pending withdrawal)

### Sportsbook
- [x] Sport / league navigation
- [x] Event lists
- [x] Prematch odds + core markets
- [x] Bet slip — singles + multiples
- [x] Stake & payout
- [x] Bet confirmation (accepted price)
- [x] Open / settled bets — _My Activity (open + settled), in-play balance reflects open stakes_
- [~] Win / loss / void states — _win/loss auto-settle modelled; void not modelled_

### Casino
- [x] Lobby + categories + search
- [x] Provider filter — _shown on tiles; not a standalone filter UI_
- [x] Game launch
- [x] Shared balance
- [x] Recently played / favourites — _Continue Playing rail; favourites star toggle + Favorites view_
- [x] Basic game history — _casino rounds logged to My Activity_
- [~] Failed-session recovery — _not modelled_

### Prediction markets
- [x] Curated markets + categories
- [x] Yes/No + price / implied probability
- [x] Amount + potential payout
- [x] Close time
- [x] Resolution rules / source
- [x] Open & settled positions

### Shared discovery
- [x] Top-level Sports / Casino / Predictions navigation
- [x] Persistent balance
- [x] Home page / lobby
- [x] Featured content (promo hero)
- [x] Basic search (casino, predictions, sports)
- [x] Mobile navigation

### Trust & support
- [~] Readable rules — _predictions only_
- [x] Receipts & transaction IDs — _wallet tx hashes_
- [x] Timestamps
- [x] Withdrawal tracking
- [~] Useful error messages — _insufficient balance etc.; not comprehensive_
- [ ] Help centre
- [ ] Support case ID & history

### Operations (back office)
- [ ] User / KYC review
- [ ] Deposits / withdrawals admin
- [ ] Account controls
- [ ] Bet & casino-session lookup
- [ ] Prediction creation / resolution
- [ ] Exposure, fraud flags, audit logs

## 3. Crypto wallet requirements (the core)

### Deposit flow
- [x] Choose asset + network
- [x] Address + QR
- [x] Repeat asset/network prominently (wrong-chain guard)
- [x] Min deposit, confirmations, est. crediting time
- [x] Status: detected → confirming → credited
- [x] Tx hash + credited amount
- [x] Conversion rate / spread disclosure

### Balance model
- [x] One USD-equivalent balance
- [x] Distinguish available / in-play / pending settlement / pending withdrawal
- [~] Bonus balance separate from cash — _no bonuses in scope_
- [x] No funds disappear between states without explanation

### Withdrawal flow
- [x] Available balance, min, fee, exact received
- [x] Confirm destination + network
- [~] Security checks (2FA / address confirm) — _address confirm only; no real 2FA_
- [x] Stages: requested → review → sent → confirming → completed
- [x] Tx hash once broadcast
- [~] Explain review / hold / rejection — _happy path only_

## 4. Product-specific minimums

### Sportsbook
- [x] Prematch first (live present but flagged)
- [x] Core markets before depth
- [x] Confirmation shows accepted price + payout
- [~] Price-change reconfirmation — _confirm step added; no live price drift sim_
- [x] Every wager gets a receipt + appears in open bets — _appears in My Activity → Open_

### Casino
- [x] Aggregator rather than proprietary — _renamed to "Popular"; provider "Spinwave"_
- [x] Reliable launch + balance updates
- [~] Interrupted-session recovery — _not modelled_
- [x] Basic lobby (popular / slots / live / tables / providers / recent / favourites)

### Prediction markets
- [x] Curated objective Yes/No markets
- [x] Default UX: outcome → amount → review → confirm
- [x] Plain-English criteria, source, close time, status
- [x] Avoid order books in basic mode — _hidden behind an "advanced" toggle_
- [x] No subjective markets

## 5. Five launch-critical journeys

- [x] First deposit — sign up → verify → asset/network → send → credited _(verify step still placeholder)_
- [x] First sports bet — event → market → stake → confirm → open
- [x] First casino session — game → launch → wager → balance/history correct _(history partial)_
- [x] First prediction — market → Yes/No → amount → confirm → position appears
- [x] First withdrawal — asset/network → address + amount → review → track → receive

## 6b. Quality pass (prototype)

- [x] Top-level error boundary (graceful crash screen)
- [x] `prefers-reduced-motion` respected
- [x] Focus-visible rings on custom buttons
- [~] Contrast review of muted text — _spot-checked; full WCAG AA audit pending_

## 7. Non-functional (not addressable in a UI prototype)

- [ ] Performance on mid-range devices (needs real testing)
- [ ] Security review of auth/wallet/withdrawal
- [ ] Idempotent deposit/bet/withdraw actions (backend)
- [ ] Monitoring & alerting (backend)
- [ ] Audit trail for money movement (backend)
- [ ] Backups / recovery / incident ownership (ops)
- [ ] Legal / licensing / AML / RG review (legal)

## 8. Out of scope (correctly excluded — do NOT build for v1)

Fiat rails · native apps · many coins/networks · cross-chain/DeFi · platform token/NFT/P2P · user-generated markets · full order book · social/copy betting · custom originals · complex bonuses/VIP · deep personalisation · custom live visualisations.

## 10. Decisions required before scope lock (blockers — owned by product/leadership)

- [ ] 1. Launch jurisdictions
- [ ] 2. Platform base currency ← **gates the entire balance model / every number on screen**
- [ ] 3. Supported assets & networks
- [ ] 4. Auto-convert deposits to a stable balance? ← **gates wallet UX**
- [ ] 5. Custody / wallet infrastructure provider
- [ ] 6. KYC / sanctions / blockchain screening provider
- [ ] 7. Sportsbook provider & market coverage
- [ ] 8. Casino aggregator & providers
- [ ] 9. Prediction-market pricing & liquidity source ← **riskiest vertical**
- [ ] 10. Who creates & resolves prediction markets? ← **the oracle question**
- [ ] 11. Live sports betting a launch requirement?
- [ ] 12. Any bonuses at launch?
- [ ] 13. Withdrawal limits / review rules / SLAs
- [ ] 14. Target launch date & operating team

---

### Prototype coverage summary

The prototype covers the **front of every journey** and now the **wallet money-loop UI** (balance states, staged deposit/withdrawal, history, bet confirmation). The remaining gaps are, by nature, **backend, ops, account/KYC, and the §10 business decisions** — none of which a UI prototype can close. Use this to show stakeholders what's demonstrable vs. what still needs decisions and engineering.
