'use strict';

/* ══════════════════════════════════════════════
   Hand  —  a player or dealer hand
═══════════════════════════════════════════════ */
class Hand {
  constructor(bet = 0, isDealer = false, isSplitHand = false, splitDepth = 0) {
    this.cards       = [];
    this.bet         = bet;
    this.isDealer    = isDealer;
    this.isSplitHand = isSplitHand;
    this.splitDepth  = splitDepth;
    this.isDoubled   = false;
    this.isStood     = false;
    this.insuranceBet= 0;
    this.outcome     = null;
    this.el          = null;      // DOM element reference (set by UI)
    this.holeCardEl  = null;      // Dealer hole card element (set by UI)
  }

  addCard(card) { this.cards.push(card); }

  get value() {
    let total = 0, aces = 0;
    for (const c of this.cards) {
      if (c.rank === 'A') { aces++; total += 11; }
      else total += c.value;
    }
    while (total > 21 && aces-- > 0) total -= 10;
    return total;
  }

  get isSoft() {
    let total = 0, aces = 0;
    for (const c of this.cards) {
      if (c.rank === 'A') { aces++; total += 11; }
      else total += c.value;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return aces > 0 && total <= 21;
  }

  /** Natural 21 on first two cards of an un-split hand */
  get isBlackjack() {
    return !this.isSplitHand && this.cards.length === 2 && this.value === 21;
  }

  get isBusted() { return this.value > 21; }

  get canSplit() {
    if (this.cards.length !== 2) return false;
    if (this.splitDepth >= 3) return false;
    if (this.isSplitHand && this.cards[0].rank === 'A') return false; // no re-split aces
    return this.cards[0].value === this.cards[1].value;
  }

  get canDouble() {
    return this.cards.length === 2 && !this.isDoubled;
  }

  get canHit() {
    if (this.isBusted || this.value >= 21) return false;
    // Split aces get exactly one extra card — after that, done
    if (this.isSplitHand && this.cards[0].rank === 'A' && this.cards.length === 2) return false;
    return true;
  }

  /** True when no more player decisions needed for this hand */
  get isDone() {
    if (this.isStood || this.isBusted || this.value === 21 || this.isDoubled) return true;
    if (this.isSplitHand && this.cards[0].rank === 'A' && this.cards.length === 2) return true;
    return false;
  }

  get displayValue() {
    if (this.isBlackjack) return '✨ BLACKJACK!';
    if (this.isBusted)    return `BUST (${this.value})`;
    if (this.isSoft && this.value < 21) return `${this.value} (soft)`;
    return `${this.value}`;
  }
}


/* ══════════════════════════════════════════════
   Game  —  main controller
═══════════════════════════════════════════════ */
class Game {
  constructor(ui) {
    this.ui = ui;

    this.deck     = new Deck(8);
    this.strategy = new Strategy();
    this.counter  = new Counter();

    this.bankroll   = this._loadBankroll() || 1000;
    this.currentBet = 0;
    this.lastBet    = 0;

    this.playerHands      = [];
    this.dealerHand       = null;
    this.currentHandIndex = 0;

    this.gamePhase = 'betting'; // betting | dealing | playerTurn | dealerTurn | roundEnd

    this.stats = { handsPlayed:0, handsWon:0, handsLost:0, handsPushed:0, blackjacks:0 };

    this.speedMultiplier = 1.0;

    // The resolve function for the current player-action promise
    this._actionResolve = null;
  }

  delay(ms) {
    return new Promise(r => setTimeout(r, Math.round(ms * this.speedMultiplier)));
  }

  /* ══ Betting ══ */

  placeBet(amount) {
    if (this.gamePhase !== 'betting') return;
    if (this.currentBet + amount > 500) {
      this.ui.flashMessage('Maximum bet is $500', 'warn'); return;
    }
    if (amount > this.bankroll - this.currentBet) {
      this.ui.flashMessage('Insufficient funds!', 'warn'); return;
    }
    this.currentBet += amount;
    this.ui.updateBetDisplay(this.currentBet, this.bankroll);
  }

  clearBet() {
    if (this.gamePhase !== 'betting') return;
    this.currentBet = 0;
    this.ui.updateBetDisplay(0, this.bankroll);
  }

  rebet() {
    if (this.gamePhase !== 'betting' || !this.lastBet) return;
    const bet = Math.min(this.lastBet, this.bankroll, 500);
    this.currentBet = bet;
    this.ui.updateBetDisplay(bet, this.bankroll);
  }

  /* ══ Round Management ══ */

  async startRound() {
    if (this.gamePhase !== 'betting') return;
    if (this.currentBet < 10) {
      this.ui.flashMessage('Minimum bet is $10', 'warn'); return;
    }

    this.gamePhase = 'dealing';
    this.ui.setPhase('dealing');

    // Shuffle if needed
    if (this.deck.needsReshuffle) {
      this.ui.showTableMessage('🔀 Shuffling the shoe…');
      await this.ui.animateShuffle();
      this.deck.init();
      this.counter.reset();
      this.ui.updateCounter(this.counter, this.deck);
      await this.delay(400);
    }

    // Reset state
    this.lastBet    = this.currentBet;
    this.bankroll  -= this.currentBet;
    this.playerHands = [ new Hand(this.currentBet) ];
    this.dealerHand  = new Hand(0, true);
    this.currentHandIndex = 0;
    this.stats.handsPlayed++;

    this.ui.clearTable();
    this.ui.updateBetDisplay(this.currentBet, this.bankroll);
    this.ui.updateStats(this.stats);

    // Deal sequence: P1, D1, P2, D2(hole)
    await this._dealTo(this.playerHands[0], true);
    await this.delay(250);
    await this._dealTo(this.dealerHand, true);
    await this.delay(250);
    await this._dealTo(this.playerHands[0], true);
    await this.delay(250);
    await this._dealTo(this.dealerHand, false); // hole card

    // Insurance offer when dealer shows Ace
    const dealerUp = this.dealerHand.cards[0];
    if (dealerUp.rank === 'A') {
      const cost = Math.floor(this.currentBet / 2);
      if (cost > 0 && cost <= this.bankroll) {
        const taken = await this.ui.offerInsurance(cost);
        if (taken) {
          this.bankroll -= cost;
          this.playerHands[0].insuranceBet = cost;
          this.ui.updateBetDisplay(this.currentBet, this.bankroll);
        }
      }
    }

    // Check dealer Blackjack
    const dealerBJ = this.dealerHand.isBlackjack;
    const playerBJ = this.playerHands[0].isBlackjack;

    if (dealerBJ) {
      await this._revealHole();

      if (this.playerHands[0].insuranceBet > 0) {
        this.bankroll += this.playerHands[0].insuranceBet * 3; // return + 2:1 payout
      }

      await this._settleHand(this.playerHands[0], 0, playerBJ ? 'push' : 'lose');
      await this._finishRound();
      return;
    }

    // Player Blackjack (dealer doesn't have BJ)
    if (playerBJ) {
      this.stats.blackjacks++;
      await this._revealHole();
      await this._settleHand(this.playerHands[0], 0, 'blackjack');
      await this._finishRound();
      return;
    }

    await this._playerTurn();
  }

  async _dealTo(hand, faceUp) {
    const card = this.deck.deal();
    hand.addCard(card);
    if (faceUp) this.counter.processCard(card);
    await this.ui.animateDeal(card, hand, faceUp);
    this.ui.updateCounter(this.counter, this.deck);
    this.ui.updateShoe(this.deck);
    return card;
  }

  async _revealHole() {
    const hole = this.dealerHand.cards[1];
    this.counter.processCard(hole);
    await this.ui.animateRevealHole(this.dealerHand);
    this.ui.updateCounter(this.counter, this.deck);
    this.ui.updateDealerValue(this.dealerHand);
  }

  /* ══ Player Turn ══ */

  async _playerTurn() {
    this.gamePhase = 'playerTurn';
    this.ui.setPhase('playerTurn');

    // Use a while loop so split-inserted hands are automatically picked up
    let i = 0;
    while (i < this.playerHands.length) {
      this.currentHandIndex = i;
      const hand = this.playerHands[i];

      this.ui.highlightHand(i, this.playerHands.length);
      this.ui.updatePlayerHandValue(hand, i);

      if (!hand.isDone) {
        await this._playHand(hand, i);
      }

      i++;
    }

    await this._dealerTurn();
  }

  /** Drives a single hand until the player is done */
  async _playHand(hand, idx) {
    while (!hand.isDone) {
      await this._awaitAction(hand, idx);
    }
    this.ui.hideActionButtons();
  }

  _awaitAction(hand, idx) {
    return new Promise(resolve => {
      this._actionResolve = resolve;
      this.ui.showActionButtons(hand, idx);
    });
  }

  /** Called by UI event listeners */
  async handleAction(action) {
    if (this.gamePhase !== 'playerTurn') return;
    const hand = this.playerHands[this.currentHandIndex];
    const idx  = this.currentHandIndex;

    // Book: show strategy — does NOT advance game
    if (action === 'book') {
      this.ui.showBook(this.strategy.recommend(
        hand, this.dealerHand.cards[0],
        hand.canSplit && this.bankroll >= hand.bet,
        hand.canDouble && this.bankroll >= hand.bet
      ));
      return;
    }

    if (action === 'hit') {
      if (!hand.canHit) return;
      await this._dealTo(hand, true);
      this.ui.updatePlayerHandValue(hand, idx);
      if (hand.isDone) { this.ui.hideActionButtons(); this._actionResolve?.(); }
      else             { this.ui.showActionButtons(hand, idx); }
      return;
    }

    if (action === 'stand') {
      hand.isStood = true;
      this.ui.hideActionButtons();
      this._actionResolve?.();
      return;
    }

    if (action === 'double') {
      if (!hand.canDouble || this.bankroll < 1) return;
      const extra = Math.min(hand.bet, this.bankroll);
      this.bankroll -= extra;
      hand.bet += extra;
      hand.isDoubled = true;
      this.ui.updateBetDisplay(this.currentBet, this.bankroll);
      await this._dealTo(hand, true);
      this.ui.updatePlayerHandValue(hand, idx);
      this.ui.hideActionButtons();
      this._actionResolve?.();
      return;
    }

    if (action === 'split') {
      if (!hand.canSplit || this.bankroll < hand.bet) return;
      await this._doSplit(hand, idx);
      // _doSplit dealt cards to each split hand; now let _playHand continue
      // for the current hand (resolve current _awaitAction so loop continues)
      this._actionResolve?.();
      return;
    }
  }

  /** Splits hand[idx] into two, deals one card to each. Does NOT drive play. */
  async _doSplit(hand, idx) {
    this.bankroll -= hand.bet;
    this.ui.updateBetDisplay(this.currentBet, this.bankroll);
    this.ui.hideActionButtons();

    // Move second card to new hand
    const splitCard = hand.cards.pop();
    const newHand   = new Hand(hand.bet, false, true, hand.splitDepth + 1);
    hand.isSplitHand = true;
    hand.splitDepth += 1;
    newHand.addCard(splitCard);

    // Insert immediately after current hand
    this.playerHands.splice(idx + 1, 0, newHand);

    // Rebuild the split layout in the UI
    await this.ui.renderSplitLayout(this.playerHands);

    // Move the split card's DOM element from hand 0's row into newHand's row.
    // The game-logic card was already popped, but the DOM element is still in
    // hand 0's container and must be relocated before new cards are dealt.
    this.ui.moveSplitCardDOM(hand, newHand);

    // Deal one card to each
    await this._dealTo(hand, true);
    this.ui.updatePlayerHandValue(hand, idx);
    await this.delay(250);
    await this._dealTo(newHand, true);
    this.ui.updatePlayerHandValue(newHand, idx + 1);
    await this.delay(200);

    this.ui.highlightHand(idx, this.playerHands.length);
  }

  /* ══ Dealer Turn ══ */

  async _dealerTurn() {
    this.gamePhase = 'dealerTurn';
    this.ui.setPhase('dealerTurn');
    this.ui.hideActionButtons();

    const allBusted = this.playerHands.every(h => h.isBusted);

    await this._revealHole();
    await this.delay(400);

    if (!allBusted) {
      while (this.dealerHand.value < 17) {
        await this.delay(600);
        await this._dealTo(this.dealerHand, true);
        this.ui.updateDealerValue(this.dealerHand);
      }
    }

    await this._resolveAllHands();
  }

  /* ══ Resolution ══ */

  async _resolveAllHands() {
    this.gamePhase = 'roundEnd';
    const dv      = this.dealerHand.value;
    const dBusted = this.dealerHand.isBusted;

    await this.delay(300);

    for (let i = 0; i < this.playerHands.length; i++) {
      const hand = this.playerHands[i];
      let outcome;

      if      (hand.isBusted)     outcome = 'lose';
      else if (hand.isBlackjack)  outcome = 'blackjack';
      else if (dBusted)           outcome = 'win';
      else if (hand.value > dv)   outcome = 'win';
      else if (hand.value < dv)   outcome = 'lose';
      else                         outcome = 'push';

      await this._settleHand(hand, i, outcome);
      await this.delay(300);
    }

    await this._finishRound();
  }

  async _settleHand(hand, idx, outcome) {
    hand.outcome = outcome;
    let payout = 0;

    switch (outcome) {
      case 'blackjack':
        payout = hand.bet + Math.floor(hand.bet * 1.5);
        this.stats.handsWon++;
        this.stats.blackjacks++;
        break;
      case 'win':
        payout = hand.bet * 2;
        this.stats.handsWon++;
        break;
      case 'push':
        payout = hand.bet;
        this.stats.handsPushed++;
        break;
      case 'lose':
        this.stats.handsLost++;
        break;
    }

    if (payout > 0) this.bankroll += payout;

    this.ui.showHandOutcome(hand, idx, outcome, payout);
    this.ui.updateBetDisplay(this.currentBet, this.bankroll);
    this.ui.updateStats(this.stats);
    this._saveBankroll();
  }

  async _finishRound() {
    await this.delay(2000);
    this.gamePhase = 'betting';
    this.currentBet = 0;

    if (this.bankroll < 10) {
      this.ui.flashMessage('Bankroll reset to $1,000 — good luck!', 'info');
      this.bankroll = 1000;
      this._saveBankroll();
    }

    // Auto-rebet: carry the last bet forward so the player can just hit Deal
    if (this.lastBet && this.lastBet <= this.bankroll) {
      this.currentBet = Math.min(this.lastBet, this.bankroll, 500);
    }

    this.ui.setPhase('betting');
    this.ui.updateBetDisplay(this.currentBet, this.bankroll);
    this.ui.showTableMessage('Place your bet to begin the next round');
  }

  /* ══ Counter ══ */

  toggleCounter() {
    const on = this.counter.toggle();
    this.ui.setCounterVisible(on);
    return on;
  }

  /* ══ Speed ══ */

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    try { localStorage.setItem('bja_speed', multiplier); } catch(_) {}
  }

  /* ══ New Shoe ══ */

  async forceNewShoe() {
    if (this.gamePhase !== 'betting') return;
    this.ui.showTableMessage('🔀 New shoe — shuffling…');
    await this.ui.animateShuffle();
    this.deck.init();
    this.counter.reset();
    this.ui.updateCounter(this.counter, this.deck);
    this.ui.updateShoe(this.deck);
    this.ui.showTableMessage('Place your bet to begin');
  }

  /* ══ Persistence ══ */

  _saveBankroll() {
    try { localStorage.setItem('bja_bankroll', this.bankroll); } catch(_) {}
  }
  _loadBankroll() {
    try { const v = localStorage.getItem('bja_bankroll'); return v ? +v : null; } catch(_) { return null; }
  }
}
