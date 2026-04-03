'use strict';

/**
 * UI  —  owns all DOM interaction, animations, and event handling.
 *
 * The Game calls into UI for display updates; UI calls Game.handleAction()
 * and Game.startRound() etc. in response to user events.
 */
class UI {
  constructor() {
    this.game = null; // injected after Game is created

    // Cached DOM refs
    this.$ = id => document.getElementById(id);

    this._insuranceResolve = null;
    this._bookVisible = false;

    this._initDOM();
    this._bindEvents();
  }

  /* ══════════════════════════════════════════
     DOM Cache
  ══════════════════════════════════════════ */
  _initDOM() {
    const $ = id => document.getElementById(id);

    this.dom = {
      // Counter
      counterPanel:   $('counter-panel'),
      runningCount:   $('running-count'),
      trueCount:      $('true-count'),
      decksRemaining: $('decks-remaining'),
      countLabel:     $('count-label'),

      // Shoe
      shoeProgress:   $('shoe-progress'),
      shoePct:        $('shoe-pct'),
      shoeCards:      $('shoe-cards'),

      // Dealer
      dealerHand:     $('dealer-hand'),
      dealerValue:    $('dealer-value'),

      // Player
      playerArea:     $('player-area'),

      // Messages
      tableMsg:       $('table-message'),

      // Bet display
      betAmount:      $('bet-amount'),
      bankroll:       $('bankroll-display'),

      // Action buttons
      actionBar:      $('action-bar'),
      btnBook:        $('btn-book'),
      btnHit:         $('btn-hit'),
      btnStand:       $('btn-stand'),
      btnDouble:      $('btn-double'),
      btnSplit:       $('btn-split'),

      // Betting UI
      bettingBar:     $('betting-bar'),
      btnDeal:        $('btn-deal'),
      btnClear:       $('btn-clear-bet'),
      btnRebet:       $('btn-rebet'),

      // Settings
      btnCounter:     $('btn-toggle-counter'),
      btnSpeed:       $('btn-speed'),
      btnNewShoe:     $('btn-new-shoe'),

      // Stats
      statHands:      $('stat-hands'),
      statWon:        $('stat-won'),
      statLost:       $('stat-lost'),
      statPushed:     $('stat-pushed'),
      statBJ:         $('stat-bj'),

      // Modals
      insuranceModal: $('insurance-modal'),
      insuranceCost:  $('insurance-cost'),
      btnTakeIns:     $('btn-take-insurance'),
      btnDeclineIns:  $('btn-decline-insurance'),

      // Book panel
      bookPanel:      $('book-panel'),
      bookAction:     $('book-action'),
      bookExplain:    $('book-explain'),
      bookClose:      $('book-close'),

      // Shuffle overlay
      shuffleOverlay: $('shuffle-overlay'),
    };
  }

  /* ══════════════════════════════════════════
     Event Binding
  ══════════════════════════════════════════ */
  _bindEvents() {
    const { dom } = this;

    // Chips
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.game?.placeBet(+btn.dataset.amount);
        this._chipClick(btn);
      });
    });

    // Bet controls
    dom.btnDeal.addEventListener('click',   () => this.game?.startRound());
    dom.btnClear.addEventListener('click',  () => this.game?.clearBet());
    dom.btnRebet.addEventListener('click',  () => this.game?.rebet());

    // Action buttons
    dom.btnBook.addEventListener('click',   () => this.game?.handleAction('book'));
    dom.btnHit.addEventListener('click',    () => this.game?.handleAction('hit'));
    dom.btnStand.addEventListener('click',  () => this.game?.handleAction('stand'));
    dom.btnDouble.addEventListener('click', () => this.game?.handleAction('double'));
    dom.btnSplit.addEventListener('click',  () => this.game?.handleAction('split'));

    // Book close
    dom.bookClose.addEventListener('click', () => this.hideBook());

    // Insurance
    dom.btnTakeIns.addEventListener('click',    () => this._insuranceResolve?.(true));
    dom.btnDeclineIns.addEventListener('click', () => this._insuranceResolve?.(false));

    // Settings
    dom.btnCounter.addEventListener('click', () => {
      const on = this.game?.toggleCounter();
      dom.btnCounter.textContent = `Counter: ${on ? 'ON' : 'OFF'}`;
      dom.btnCounter.classList.toggle('active', on);
    });

    dom.btnSpeed.addEventListener('click', () => {
      const speeds = [{ label:'Speed: Slow', v:2 }, { label:'Speed: Normal', v:1 }, { label:'Speed: Fast', v:0.5 }];
      const cur = speeds.findIndex(s => dom.btnSpeed.textContent.includes(s.label.split(' ')[1]));
      const next = speeds[(cur + 1) % speeds.length];
      dom.btnSpeed.textContent = next.label;
      this.game?.setSpeed(next.v);
    });

    dom.btnNewShoe.addEventListener('click', () => {
      if (this.game?.gamePhase === 'betting') this.game?.forceNewShoe();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      const phase = this.game?.gamePhase;
      switch (e.key.toLowerCase()) {
        case 'h': if (phase === 'playerTurn') this.game?.handleAction('hit'); break;
        case 's': if (phase === 'playerTurn') this.game?.handleAction('stand'); break;
        case 'd': if (phase === 'playerTurn') this.game?.handleAction('double'); break;
        case 'p': if (phase === 'playerTurn') this.game?.handleAction('split'); break;
        case 'b': if (phase === 'playerTurn') this.game?.handleAction('book'); break;
        case 'enter':
          if (phase === 'betting') this.game?.startRound();
          else if (phase === 'playerTurn') this.game?.handleAction('stand');
          break;
        case 'escape': this.hideBook(); break;
      }
    });

    // Close book on overlay click
    dom.bookPanel.addEventListener('click', e => {
      if (e.target === dom.bookPanel) this.hideBook();
    });
  }

  /* ══════════════════════════════════════════
     Phase Management
  ══════════════════════════════════════════ */
  setPhase(phase) {
    const { dom } = this;
    const isBetting   = phase === 'betting';
    const isPlayerTurn = phase === 'playerTurn';

    dom.bettingBar.classList.toggle('hidden', !isBetting);
    dom.actionBar.classList.toggle('hidden', !isPlayerTurn);

    if (isBetting) {
      this.showTableMessage('Place your bet to begin');
      dom.btnDeal.disabled = false;
    }
    if (phase === 'dealing') {
      dom.btnDeal.disabled = true;
    }
  }

  /* ══════════════════════════════════════════
     Table / Cards
  ══════════════════════════════════════════ */
  clearTable() {
    this.dom.dealerHand.innerHTML = '';
    this.dom.playerArea.innerHTML = '';
    this.dom.dealerValue.textContent = '';
    this.dom.tableMsg.textContent = '';
    this._clearOutcomes();
  }

  _clearOutcomes() {
    document.querySelectorAll('.hand-outcome').forEach(el => el.remove());
  }

  /* ── Card Element Creation ── */
  createCardEl(card, faceUp) {
    const el = document.createElement('div');
    el.className = 'card' + (faceUp ? '' : ' card-face-down');
    el.dataset.suit = card.suit;
    el.dataset.rank = card.rank;
    el.dataset.id   = card.id;

    el.innerHTML = `
      <div class="card-inner">
        <div class="card-front ${card.isRed ? 'card-red' : 'card-black'}">
          <div class="card-corner card-tl">
            <span class="c-rank">${card.rank}</span>
            <span class="c-suit">${card.symbol}</span>
          </div>
          <div class="card-center">${this._centerArt(card)}</div>
          <div class="card-corner card-br">
            <span class="c-rank">${card.rank}</span>
            <span class="c-suit">${card.symbol}</span>
          </div>
        </div>
        <div class="card-back">
          <div class="card-back-pattern"></div>
        </div>
      </div>`;

    return el;
  }

  _centerArt(card) {
    const faceArt = { J:'⚔', Q:'♛', K:'♚', A:'✦' };
    if (faceArt[card.rank]) {
      return `<span class="face-art">${card.symbol}<br><span class="face-letter">${card.rank}</span></span>`;
    }
    // Pip layout for number cards
    const count = card.rank === '10' ? 10 : +card.rank;
    const pips  = Array(count).fill(`<span class="pip">${card.symbol}</span>`).join('');
    return `<div class="pips pips-${count}">${pips}</div>`;
  }

  /* ── Deal Animation ── */
  async animateDeal(card, hand, faceUp) {
    const container = hand.isDealer ? this.dom.dealerHand : this._getPlayerHandEl(hand);
    const el = this.createCardEl(card, faceUp);

    // Start off-screen from shoe area
    el.style.transform = 'translateY(-120px) translateX(40px) scale(0.6) rotate(-8deg)';
    el.style.opacity   = '0';
    el.style.transition= 'none';

    container.appendChild(el);
    if (!hand.isDealer) hand.el = container;
    if (!faceUp) hand.holeCardEl = el;

    await this._nextFrame();

    el.style.transition = 'transform 0.38s cubic-bezier(.22,.68,0,1.3), opacity 0.25s ease';
    el.style.transform  = 'translateY(0) translateX(0) scale(1) rotate(0deg)';
    el.style.opacity    = '1';

    await this._wait(400);
    el.style.transition = '';
  }

  /* ── Reveal Hole Card ── */
  async animateRevealHole(dealerHand) {
    const el = dealerHand.holeCardEl;
    if (!el) return;
    // Squeeze to edge-on (scaleX → 0), swap face, expand back.
    // More reliable than backface-visibility across browsers.
    el.style.transition = 'transform 0.15s ease-in';
    el.style.transform  = 'scaleX(0)';
    await this._wait(160);

    el.classList.remove('card-face-down'); // show front, hide back

    el.style.transition = 'transform 0.15s ease-out';
    el.style.transform  = 'scaleX(1)';
    await this._wait(160);
    el.style.transition = '';
    el.style.transform  = '';
  }

  /* ── Shuffle Animation ── */
  async animateShuffle() {
    const ov = this.dom.shuffleOverlay;
    ov.classList.remove('hidden');
    ov.classList.add('shuffling');
    await this._wait(1200);
    ov.classList.remove('shuffling');
    ov.classList.add('hidden');
  }

  /* ── Split Layout ── */
  async renderSplitLayout(hands) {
    const area = this.dom.playerArea;
    hands.forEach((hand, i) => {
      let containerEl = area.querySelector(`[data-hand-idx="${i}"]`);
      if (!containerEl) {
        containerEl = document.createElement('div');
        containerEl.className = 'hand-container';
        containerEl.dataset.handIdx = i;
        const cardRow = document.createElement('div');
        cardRow.className = 'card-row';
        containerEl.appendChild(cardRow);
        area.appendChild(containerEl);
      }
      // hand.el → the .card-row where cards are appended
      hand.el = containerEl.querySelector('.card-row') || containerEl;
    });
    await this._wait(50);
  }

  /* ── Move split card's DOM element from one hand's row to another ── */
  moveSplitCardDOM(fromHand, toHand) {
    const fromRow = fromHand.el; // .card-row of the original hand
    const toRow   = toHand.el;   // .card-row of the new split hand
    if (!fromRow || !toRow) return;
    // The split card is the last .card child in fromRow
    const cardEls = fromRow.querySelectorAll('.card');
    const lastCard = cardEls[cardEls.length - 1];
    if (lastCard) toRow.appendChild(lastCard);
  }

  /* ── Get / create player hand container, returning the inner .card-row ── */
  _getPlayerHandEl(hand) {
    if (hand.el) return hand.el;
    const area = this.dom.playerArea;
    let containerEl = area.querySelector('[data-hand-idx="0"]');
    if (!containerEl) {
      containerEl = document.createElement('div');
      containerEl.className = 'hand-container';
      containerEl.dataset.handIdx = '0';
      const cardRow = document.createElement('div');
      cardRow.className = 'card-row';
      containerEl.appendChild(cardRow);
      area.appendChild(containerEl);
    }
    hand.el = containerEl.querySelector('.card-row') || containerEl;
    return hand.el;
  }

  /* ══════════════════════════════════════════
     Value Displays
  ══════════════════════════════════════════ */
  updateDealerValue(hand) {
    this.dom.dealerValue.textContent = hand.displayValue;
    this.dom.dealerValue.className   = 'hand-value' + (hand.isBusted ? ' busted' : hand.isBlackjack ? ' blackjack' : '');
  }

  updatePlayerHandValue(hand, idx) {
    const container = this.dom.playerArea.querySelector(`[data-hand-idx="${idx}"]`);
    if (!container) return;
    let valEl = container.querySelector('.hand-value');
    if (!valEl) {
      valEl = document.createElement('div');
      valEl.className = 'hand-value';
      container.appendChild(valEl);
    }
    valEl.textContent = hand.displayValue;
    valEl.className   = 'hand-value' + (hand.isBusted ? ' busted' : hand.isBlackjack ? ' blackjack' : '');
  }

  /* ══════════════════════════════════════════
     Hand Highlighting
  ══════════════════════════════════════════ */
  highlightHand(activeIdx, total) {
    for (let i = 0; i < total; i++) {
      const el = this.dom.playerArea.querySelector(`[data-hand-idx="${i}"]`);
      if (el) el.classList.toggle('hand-active', i === activeIdx);
    }
  }

  /* ══════════════════════════════════════════
     Action Buttons
  ══════════════════════════════════════════ */
  showActionButtons(hand, idx) {
    const { dom } = this;
    dom.actionBar.classList.remove('hidden');

    const canAffordSplit   = (this.game?.bankroll ?? 0) >= hand.bet;
    const canAffordDouble  = (this.game?.bankroll ?? 0) >= hand.bet;

    dom.btnHit.disabled    = !hand.canHit;
    dom.btnStand.disabled  = false;
    dom.btnDouble.disabled = !hand.canDouble || !canAffordDouble;
    dom.btnSplit.disabled  = !hand.canSplit  || !canAffordSplit;

    // Clear any book highlights
    this._clearBookHighlights();
  }

  hideActionButtons() {
    this.dom.actionBar.classList.add('hidden');
    this._clearBookHighlights();
  }

  _clearBookHighlights() {
    document.querySelectorAll('.btn-action').forEach(b => b.classList.remove('book-glow'));
    this.dom.btnBook.classList.remove('book-active');
  }

  /* ══════════════════════════════════════════
     Book (Strategy Advisor)
  ══════════════════════════════════════════ */
  showBook(rec) {
    const { dom } = this;

    // Highlight recommended button
    this._clearBookHighlights();
    const actionBtn = {
      hit:    dom.btnHit,
      stand:  dom.btnStand,
      double: dom.btnDouble,
      split:  dom.btnSplit,
    }[rec.highlightButton];
    if (actionBtn && !actionBtn.disabled) actionBtn.classList.add('book-glow');
    dom.btnBook.classList.add('book-active');

    // Show explanation panel
    dom.bookAction.textContent  = `📜 ${rec.label}`;
    dom.bookExplain.textContent = rec.explanation;
    dom.bookPanel.classList.remove('hidden');
    dom.bookPanel.classList.add('book-open');
    this._bookVisible = true;
  }

  hideBook() {
    if (!this._bookVisible) return;
    this.dom.bookPanel.classList.remove('book-open');
    setTimeout(() => this.dom.bookPanel.classList.add('hidden'), 250);
    this._clearBookHighlights();
    this._bookVisible = false;
  }

  /* ══════════════════════════════════════════
     Insurance
  ══════════════════════════════════════════ */
  offerInsurance(cost) {
    return new Promise(resolve => {
      this.dom.insuranceCost.textContent = cost;
      this.dom.insuranceModal.classList.remove('hidden');
      this._insuranceResolve = (taken) => {
        this.dom.insuranceModal.classList.add('hidden');
        this._insuranceResolve = null;
        resolve(taken);
      };
    });
  }

  /* ══════════════════════════════════════════
     Hand Outcome Display
  ══════════════════════════════════════════ */
  showHandOutcome(hand, idx, outcome, payout) {
    const container = hand.isDealer
      ? null
      : this.dom.playerArea.querySelector(`[data-hand-idx="${idx}"]`);

    const labels = {
      blackjack: { text: '✨ BLACKJACK!',    cls: 'outcome-bj' },
      win:       { text: `WIN +$${payout}`,  cls: 'outcome-win' },
      push:      { text: `PUSH  $${payout}`, cls: 'outcome-push' },
      lose:      { text: `LOSE`,             cls: 'outcome-lose' },
    };
    const info = labels[outcome];
    if (!info || !container) return;

    const el = document.createElement('div');
    el.className  = `hand-outcome ${info.cls}`;
    el.textContent = info.text;
    container.appendChild(el);

    // Celebration animation for wins
    if (outcome === 'blackjack' || outcome === 'win') {
      container.classList.add('hand-win-glow');
    } else if (outcome === 'lose') {
      container.classList.add('hand-lose-dim');
    }

    // Trigger sparkles for blackjack
    if (outcome === 'blackjack') this._sparkle(container);
  }

  _sparkle(el) {
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.cssText = `
        left: ${20 + Math.random() * 60}%;
        top:  ${20 + Math.random() * 60}%;
        animation-delay: ${Math.random() * 0.5}s;
      `;
      el.appendChild(s);
      setTimeout(() => s.remove(), 1500);
    }
  }

  /* ══════════════════════════════════════════
     Counter
  ══════════════════════════════════════════ */
  updateCounter(counter, deck) {
    if (!counter.enabled) return;
    const { dom } = this;
    const tc   = counter.trueCount(deck.decksRemaining);
    const col  = counter.countColor;

    dom.runningCount.textContent   = (counter.runningCount >= 0 ? '+' : '') + counter.runningCount;
    dom.trueCount.textContent      = (parseFloat(tc) >= 0 ? '+' : '') + tc;
    dom.decksRemaining.textContent = deck.decksRemainingDisplay;
    dom.countLabel.textContent     = counter.countLabel;

    dom.runningCount.style.color = col;
    dom.trueCount.style.color    = col;
  }

  setCounterVisible(visible) {
    this.dom.counterPanel.classList.toggle('hidden', !visible);
    if (visible && this.game) {
      this.updateCounter(this.game.counter, this.game.deck);
    }
  }

  /* ══════════════════════════════════════════
     Shoe
  ══════════════════════════════════════════ */
  updateShoe(deck) {
    const pct = deck.penetrationPct;
    this.dom.shoeProgress.style.width  = `${pct}%`;
    this.dom.shoePct.textContent       = `${pct}%`;
    this.dom.shoeCards.textContent     = `${deck.cardsRemaining} cards`;

    // Color warning when deep into shoe
    const bar = this.dom.shoeProgress;
    bar.className = pct > 85 ? 'shoe-fill shoe-danger' : pct > 65 ? 'shoe-fill shoe-warn' : 'shoe-fill';
  }

  /* ══════════════════════════════════════════
     Bet & Bankroll
  ══════════════════════════════════════════ */
  updateBetDisplay(bet, bankroll) {
    this.dom.betAmount.textContent  = bet.toLocaleString();
    this.dom.bankroll.textContent   = bankroll.toLocaleString();
  }

  /* ══════════════════════════════════════════
     Stats
  ══════════════════════════════════════════ */
  updateStats(stats) {
    this.dom.statHands.textContent  = stats.handsPlayed;
    this.dom.statWon.textContent    = stats.handsWon;
    this.dom.statLost.textContent   = stats.handsLost;
    this.dom.statPushed.textContent = stats.handsPushed;
    this.dom.statBJ.textContent     = stats.blackjacks;
  }

  /* ══════════════════════════════════════════
     Messages
  ══════════════════════════════════════════ */
  showTableMessage(text) {
    this.dom.tableMsg.textContent = text;
    this.dom.tableMsg.style.opacity = '1';
  }

  flashMessage(text, type = 'info') {
    const el = document.createElement('div');
    el.className = `flash-msg flash-${type}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('flash-fade'); setTimeout(() => el.remove(), 500); }, 2000);
  }

  /* ══════════════════════════════════════════
     Chip Click Feedback
  ══════════════════════════════════════════ */
  _chipClick(btn) {
    btn.classList.add('chip-pop');
    btn.addEventListener('animationend', () => btn.classList.remove('chip-pop'), { once: true });
  }

  /* ══════════════════════════════════════════
     Helpers
  ══════════════════════════════════════════ */
  _nextFrame() { return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }
  _wait(ms)    { return new Promise(r => setTimeout(r, ms * (this.game?.speedMultiplier ?? 1))); }

  /* ══════════════════════════════════════════
     Init Display
  ══════════════════════════════════════════ */
  initDisplay() {
    this.updateBetDisplay(0, this.game.bankroll);
    this.updateStats(this.game.stats);
    this.updateShoe(this.game.deck);
    this.setCounterVisible(false);
    this.setPhase('betting');
    this.showTableMessage('Place your bet to begin');
  }
}
