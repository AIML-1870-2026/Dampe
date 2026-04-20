'use strict';

/* ══════════════════════════════════════════════
   Strategy base class + concrete implementations
═══════════════════════════════════════════════ */

class AgentStrategy {
  constructor(id, name, description) {
    this.id          = id;
    this._name       = name; // use _name so subclass getters can override without conflict
    this.description = description;
    this.unitBet     = 25;
  }

  get name() { return this._name; }
  set name(v) { this._name = v; }

  setUnitBet(amt) { this.unitBet = Math.max(10, Math.min(+amt || 25, 500)); }

  // Called at the end of each round with an array of outcome strings
  onRoundEnd(outcomes) {}

  getBet(bankroll, counter, deck) {
    return Math.max(10, Math.min(this.unitBet, bankroll, 500));
  }

  // Sync or async — callers always await
  getAction(hand, dealerUp, canSplit, canDouble, counter, deck, bankroll) {
    return 'stand';
  }

  getActionRationale(hand, dealerUp, canSplit, canDouble, bankroll) { return ''; }

  shouldTakeInsurance() { return false; }

  getBetRationale() { return `Flat bet: $${this.unitBet}`; }

  reset() {}
}

/* ── BookStrategy: perfect basic strategy, flat bet ── */
class BookStrategy extends AgentStrategy {
  constructor() {
    super('basic', 'Basic Strategy', 'Plays perfect basic strategy every hand. Flat bet.');
    this._strat = new Strategy();
  }

  getAction(hand, dealerUp, canSplit, canDouble, counter, deck, bankroll) {
    const rec = this._strat.recommend(
      hand, dealerUp,
      canSplit  && bankroll >= hand.bet,
      canDouble && bankroll >= hand.bet
    );
    return { H:'hit', S:'stand', D:'double', P:'split' }[rec.action] ?? 'stand';
  }

  getActionRationale(hand, dealerUp, canSplit, canDouble, bankroll) {
    return this._strat.recommend(
      hand, dealerUp,
      canSplit  && bankroll >= hand.bet,
      canDouble && bankroll >= hand.bet
    ).explanation;
  }

  getBetRationale() { return `Flat bet: $${this.unitBet}`; }
}

/* ── CardCountingStrategy: basic strategy + Hi-Lo bet spread ── */
class CardCountingStrategy extends BookStrategy {
  constructor() {
    super();
    this.id          = 'counting';
    this.name        = 'Card Counting';
    this.description = 'Hi-Lo true count bet spreading (1×→16×) on top of basic strategy.';
  }

  getBet(bankroll, counter, deck) {
    const tc  = parseFloat(counter.trueCount(deck.decksRemaining));
    let mul = 1;
    if      (tc >= 5) mul = 16;
    else if (tc >= 4) mul = 8;
    else if (tc >= 3) mul = 4;
    else if (tc >= 2) mul = 2;
    else if (tc <= 0) mul = 0.5;
    const raw = Math.round((this.unitBet * mul) / 5) * 5;
    return Math.max(10, Math.min(raw, bankroll, 500));
  }

  getBetRationale() { return `Spread 1×–16× on true count (unit $${this.unitBet})`; }
}

/* ── MartingaleStrategy: double after loss, reset after win ── */
class MartingaleStrategy extends BookStrategy {
  constructor() {
    super();
    this.id          = 'martingale';
    this.name        = 'Martingale';
    this.description = 'Doubles the bet after every loss; resets to base after a win.';
    this._current    = 25;
    this._streak     = 0;
  }

  setUnitBet(amt) { super.setUnitBet(amt); this._current = this.unitBet; }

  onRoundEnd(outcomes) {
    const won    = outcomes.some(o => o === 'win' || o === 'blackjack');
    const pushed = outcomes.every(o => o === 'push');
    if (won || pushed) { this._current = this.unitBet; this._streak = 0; }
    else               { this._streak++; this._current = Math.min(this._current * 2, 500); }
  }

  getBet(bankroll) { return Math.max(10, Math.min(this._current, bankroll, 500)); }

  getBetRationale() {
    return this._streak > 0
      ? `Loss streak ×${this._streak} → $${this._current}`
      : `Base bet: $${this.unitBet}`;
  }

  reset() { this._current = this.unitBet; this._streak = 0; }
}

/* ── ParoliStrategy: double after win (up to 3), reset on loss ── */
class ParoliStrategy extends BookStrategy {
  constructor() {
    super();
    this.id          = 'paroli';
    this.name        = 'Paroli System';
    this.description = 'Doubles bet after each win (max 3 wins), then resets to base.';
    this._current    = 25;
    this._wins       = 0;
  }

  setUnitBet(amt) { super.setUnitBet(amt); this._current = this.unitBet; }

  onRoundEnd(outcomes) {
    const won = outcomes.some(o => o === 'win' || o === 'blackjack');
    if (won) {
      this._wins++;
      if (this._wins >= 3) { this._wins = 0; this._current = this.unitBet; }
      else                  { this._current = Math.min(this._current * 2, 500); }
    } else {
      this._wins = 0; this._current = this.unitBet;
    }
  }

  getBet(bankroll) { return Math.max(10, Math.min(this._current, bankroll, 500)); }

  getBetRationale() {
    return this._wins > 0
      ? `Win streak ${this._wins}/3 → riding $${this._current}`
      : `Base bet: $${this.unitBet}`;
  }

  reset() { this._current = this.unitBet; this._wins = 0; }
}

/* ── DAlembert: +1 unit after loss, –1 unit after win ── */
class DAlembert extends BookStrategy {
  constructor() {
    super();
    this.id          = 'dalembert';
    this.name        = "D'Alembert";
    this.description = 'Increases bet by 1 unit after a loss; decreases by 1 after a win.';
    this._current    = 25;
  }

  setUnitBet(amt) { super.setUnitBet(amt); this._current = this.unitBet; }

  onRoundEnd(outcomes) {
    const won  = outcomes.some(o => o === 'win' || o === 'blackjack');
    const lost = outcomes.every(o => o === 'lose');
    if (lost) this._current = Math.min(this._current + this.unitBet, 500);
    else if (won) this._current = Math.max(this._current - this.unitBet, this.unitBet);
  }

  getBet(bankroll) { return Math.max(10, Math.min(this._current, bankroll, 500)); }

  getBetRationale() { return `Current $${this._current} (±$${this.unitBet} unit)`; }

  reset() { this._current = this.unitBet; }
}

/* ── 1-3-2-6 positive progression ── */
class OneTwoThreeSix extends BookStrategy {
  constructor() {
    super();
    this.id          = '1326';
    this.name        = '1-3-2-6 System';
    this.description = 'Positive progression: 1×, 3×, 2×, 6× units on consecutive wins.';
    this._step = 0;
    this._muls = [1, 3, 2, 6];
  }

  onRoundEnd(outcomes) {
    const won = outcomes.some(o => o === 'win' || o === 'blackjack');
    this._step = won ? (this._step + 1) % 4 : 0;
  }

  getBet(bankroll) {
    const bet = this.unitBet * this._muls[this._step];
    return Math.max(10, Math.min(bet, bankroll, 500));
  }

  getBetRationale() {
    return `Step ${this._step + 1}/4: ${this._muls[this._step]}× = $${this.unitBet * this._muls[this._step]}`;
  }

  reset() { this._step = 0; }
}

/* ── LLMStrategy: API-powered decisions, flat bet ── */
class LLMStrategy extends AgentStrategy {
  constructor(llmProvider) {
    super('llm', 'AI Agent', 'LLM API decides every action; basic strategy as fallback.');
    this._llm          = llmProvider;
    this._lastReason   = '';
    this._fallback     = new BookStrategy();
  }

  // Dynamic name reflects loaded model
  get name() { return `AI (${this._llm.modelName})`; }

  setUnitBet(amt) { super.setUnitBet(amt); this._fallback.setUnitBet(amt); }

  async getAction(hand, dealerUp, canSplit, canDouble, counter, deck, bankroll) {
    const gs = {
      playerCards:  hand.cards.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(', '),
      playerTotal:  hand.value,
      isSoft:       hand.isSoft,
      dealerUpcard: `${dealerUp.rank}${dealerUp.suit[0].toUpperCase()}`,
      canHit:       hand.canHit,
      canDouble:    canDouble && bankroll >= hand.bet,
      canSplit:     canSplit  && bankroll >= hand.bet,
      runningCount: counter.runningCount,
      trueCount:    parseFloat(counter.trueCount(deck.decksRemaining)),
      bankroll,
      currentBet:   hand.bet,
    };

    try {
      const res        = await this._llm.getBlackjackAction(gs);
      this._lastReason = res.reasoning;
      return res.action;
    } catch (err) {
      this._lastReason = `⚠ API error: ${err.message} — fallback used`;
      return this._fallback.getAction(hand, dealerUp, canSplit, canDouble, counter, deck, bankroll);
    }
  }

  getActionRationale() { return this._lastReason; }

  getBet(bankroll) { return Math.max(10, Math.min(this.unitBet, bankroll, 500)); }

  getBetRationale() { return `LLM flat bet: $${this.unitBet}`; }

  reset() { this._lastReason = ''; }
}


/* ══════════════════════════════════════════════
   Agent  —  orchestrates strategy + tracks log
═══════════════════════════════════════════════ */
class Agent {
  constructor() {
    this.strategy  = null;
    this.isRunning = false;
    this._log      = [];
    this._round    = 0;
  }

  setStrategy(strategy) { this.strategy = strategy; strategy.reset(); }

  start() { this.isRunning = true; }
  stop()  { this.isRunning = false; }

  // May return a Promise (LLMStrategy) — callers always await
  getAction(hand, dealerUp, canSplit, canDouble, counter, deck, bankroll) {
    return this.strategy?.getAction(hand, dealerUp, canSplit, canDouble, counter, deck, bankroll) ?? 'stand';
  }

  getActionRationale(hand, dealerUp, canSplit, canDouble, bankroll) {
    return this.strategy?.getActionRationale?.(hand, dealerUp, canSplit, canDouble, bankroll) ?? '';
  }

  getBet(bankroll, counter, deck) {
    return this.strategy?.getBet(bankroll, counter, deck) ?? Math.min(25, bankroll);
  }

  shouldTakeInsurance() { return false; }

  onRoundEnd(outcomes, hands, dealerHand) {
    this._round++;
    this.strategy?.onRoundEnd(outcomes);
    this._logRound(outcomes, hands, dealerHand);
  }

  getBetRationale() { return this.strategy?.getBetRationale() ?? ''; }

  /* ── Logging ── */

  addActionLog(text) {
    this._log.unshift({ text, type: 'action' });
    if (this._log.length > 80) this._log.length = 80;
  }

  _logRound(outcomes, hands, dealerHand) {
    const dv = dealerHand.displayValue;
    // Log from last hand to first so newest appears at top after unshift
    for (let i = hands.length - 1; i >= 0; i--) {
      const outcome = outcomes[i];
      const h       = hands[i];
      const sym     = { win:'✓', blackjack:'★', push:'≈', lose:'✗' }[outcome] ?? '?';
      const type    = `round-${outcome}`;
      this._log.unshift({ text: `${sym} ${h.displayValue} vs ${dv}`, type, round: this._round });
    }
    if (this._log.length > 80) this._log.length = 80;
  }

  getLog()   { return this._log; }
  clearLog() { this._log = []; this._round = 0; }
}
