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
    this._bookVisible      = false;
    this._agentPanelOpen   = false;
    this._llmProvider      = new LLMProvider();
    this._agent            = new Agent();

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

      // Agent panel
      btnToggleAgent:     $('btn-toggle-agent'),
      agentPanel:         $('agent-panel'),
      agentPanelInner:    $('agent-panel-inner'),
      agentStatusPill:    $('agent-status-pill'),
      agentStatusText:    $('agent-status-text'),
      agentStrategySelect:$('agent-strategy-select'),
      agentStrategyDesc:  $('agent-strategy-desc'),
      agentBetUnit:       $('agent-bet-unit'),
      agentApiKey:        $('agent-api-key'),
      btnLoadKey:         $('btn-load-key'),
      agentEnvFile:       $('agent-env-file'),
      agentProviderBadge: $('agent-provider-badge'),
      agentProviderIcon:  $('agent-provider-icon'),
      agentProviderName:  $('agent-provider-name'),
      btnAgentStart:      $('btn-agent-start'),
      btnAgentStop:       $('btn-agent-stop'),
      agentRationale:     $('agent-rationale'),
      agentThinkingBar:   $('agent-thinking-bar'),
      agentThinkingText:  $('agent-thinking-text'),
      agentLog:           $('agent-log'),
      btnClearAgentLog:   $('btn-clear-agent-log'),
      agentReasoning:     $('agent-reasoning'),
      // Tab panes + buttons
      agentTabBtns:       document.querySelectorAll('.agent-tab-btn'),
      agentPaneStrategy:  $('agent-pane-strategy'),
      agentPaneApikey:    $('agent-pane-apikey'),
      btnStartAIFromKey:  $('btn-start-ai-from-key'),
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

    // Keyboard shortcuts (disabled when agent is playing)
    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      if (this._agent.isRunning) return; // agent has control
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

    // ── Agent panel ──────────────────────────────────────────────
    dom.btnToggleAgent.addEventListener('click', () => this._toggleAgentPanel());

    // Tab switching
    dom.agentTabBtns.forEach(btn => {
      btn.addEventListener('click', () => this._switchAgentTab(btn.dataset.tab));
    });

    // Strategy selector — auto-switch to API Key tab when LLM chosen
    dom.agentStrategySelect.addEventListener('change', () => this._onStrategyChange());

    // API key load button
    dom.btnLoadKey.addEventListener('click', () => this._loadApiKey());

    // .env file import
    dom.agentEnvFile.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const key = this._parseEnvFile(ev.target.result || '');
        if (key) {
          dom.agentApiKey.value = key;
          this._loadApiKey();
        } else {
          this.flashMessage('No API key found in .env file', 'warn');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    // Start / Stop
    dom.btnAgentStart.addEventListener('click',      () => this._startAgent());
    dom.btnAgentStop.addEventListener('click',       () => this._stopAgent());
    dom.btnStartAIFromKey.addEventListener('click',  () => this._startAgent());

    // Clear log
    dom.btnClearAgentLog.addEventListener('click', () => {
      this._agent.clearLog();
      this.updateAgentLog([]);
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
     Agent Panel
  ══════════════════════════════════════════ */

  _toggleAgentPanel() {
    const { dom } = this;
    this._agentPanelOpen = !this._agentPanelOpen;
    dom.agentPanel.classList.toggle('hidden', !this._agentPanelOpen);
    dom.btnToggleAgent.classList.toggle('active', this._agentPanelOpen);
  }

  _switchAgentTab(tabName) {
    const { dom } = this;
    dom.agentTabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    dom.agentPaneStrategy.classList.toggle('hidden', tabName !== 'strategy');
    dom.agentPaneApikey.classList.toggle('hidden',   tabName !== 'apikey');
  }

  _onStrategyChange() {
    const { dom } = this;
    const val = dom.agentStrategySelect.value;
    const descs = {
      basic:     'Plays perfect basic strategy every hand. Flat bet.',
      counting:  'Hi-Lo true count bet spreading (1×–16×) on top of basic strategy.',
      martingale:'Doubles the bet after every loss; resets to base after a win.',
      paroli:    'Doubles bet after each win (max 3 wins), then resets to base.',
      dalembert: 'Increases bet by 1 unit after a loss; decreases by 1 after a win.',
      '1326':    'Positive progression: bet 1×, 3×, 2×, 6× units on consecutive wins.',
      llm:       'LLM API makes every action decision. Set up your key on the API Key tab.',
    };
    dom.agentStrategyDesc.textContent = descs[val] ?? '';
    // Auto-navigate to API Key tab when LLM is selected
    if (val === 'llm') this._switchAgentTab('apikey');
  }

  _loadApiKey() {
    const { dom } = this;
    const raw = dom.agentApiKey.value;
    const ok  = this._llmProvider.setKey(raw);
    if (!ok) {
      this.flashMessage('Unrecognised key format — must start with sk-ant-, sk-, or AIza', 'warn');
      dom.agentProviderBadge.classList.add('hidden');
      dom.btnStartAIFromKey.classList.add('hidden');
      return;
    }
    dom.agentProviderIcon.textContent = this._llmProvider.providerIcon;
    dom.agentProviderName.textContent = `${this._llmProvider.providerLabel} · ${this._llmProvider.modelName}`;
    dom.agentProviderBadge.classList.remove('hidden');

    // Ensure LLM strategy is selected so _startAgent() picks it up
    dom.agentStrategySelect.value = 'llm';

    // Show the Start AI Agent shortcut button on this tab
    dom.btnStartAIFromKey.classList.remove('hidden');

    this.flashMessage(`${this._llmProvider.providerLabel} key loaded — click "Start AI Agent" to play!`, 'info');
    // Mask the input
    dom.agentApiKey.value = '●'.repeat(12) + raw.slice(-4);
  }

  _parseEnvFile(content) {
    const patterns = [
      /(?:ANTHROPIC|OPENAI|LLM)_API_KEY\s*=\s*['"]?([^\s'"#]+)/i,
      /API_KEY\s*=\s*['"]?([^\s'"#]+)/i,
    ];
    for (const re of patterns) {
      const m = content.match(re);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  }

  _buildStrategy() {
    const { dom } = this;
    const val     = dom.agentStrategySelect.value;
    const unit    = Math.max(10, Math.min(+dom.agentBetUnit.value || 25, 500));

    let strategy;
    switch (val) {
      case 'basic':     strategy = new BookStrategy();         break;
      case 'counting':  strategy = new CardCountingStrategy(); break;
      case 'martingale':strategy = new MartingaleStrategy();   break;
      case 'paroli':    strategy = new ParoliStrategy();       break;
      case 'dalembert': strategy = new DAlembert();            break;
      case '1326':      strategy = new OneTwoThreeSix();       break;
      case 'llm':       strategy = new LLMStrategy(this._llmProvider); break;
      default:          strategy = new BookStrategy();
    }
    strategy.setUnitBet(unit);
    return strategy;
  }

  _startAgent() {
    const { dom } = this;

    if (this.game?.gamePhase !== 'betting') {
      this.flashMessage('Finish the current round first', 'warn');
      return;
    }

    const val = dom.agentStrategySelect.value;
    if (val === 'llm' && !this._llmProvider.isConfigured()) {
      this.flashMessage('Load an API key on the API Key tab first', 'warn');
      this._switchAgentTab('apikey');
      return;
    }

    const strategy = this._buildStrategy();
    this._agent.setStrategy(strategy);
    this._agent.start();
    this.game.setAgent(this._agent);

    // Switch to Strategy tab so the Stop button and log are visible
    this._switchAgentTab('strategy');

    dom.btnAgentStart.classList.add('hidden');
    dom.btnAgentStop.classList.remove('hidden');
    dom.agentPanelInner.classList.add('agent-running');
    dom.agentStatusPill.classList.add('running');
    dom.agentStatusText.textContent = 'Running';
    dom.agentStrategySelect.disabled = true;
    dom.agentBetUnit.disabled = true;
    document.getElementById('game-wrapper').classList.add('agent-active');

    const bet = this._agent.getBet(this.game.bankroll, this.game.counter, this.game.deck);
    this.game.currentBet = Math.max(10, Math.min(bet, this.game.bankroll, 500));
    this.updateBetDisplay(this.game.currentBet, this.game.bankroll);
    this.updateAgentRationale(this._agent.getBetRationale());
    this.showTableMessage(`⚗ ${strategy.name} — Bet: $${this.game.currentBet}`);
    this.game.startRound();
  }

  _stopAgent() {
    const { dom } = this;
    this._agent.stop();
    this.game?.clearAgent();

    dom.btnAgentStop.classList.add('hidden');
    dom.btnAgentStart.classList.remove('hidden');
    dom.btnStartAIFromKey.classList.add('hidden');
    dom.agentPanelInner.classList.remove('agent-running');
    dom.agentStatusPill.classList.remove('running');
    dom.agentStatusText.textContent = 'Dormant';
    dom.agentStrategySelect.disabled = false;
    dom.agentBetUnit.disabled = false;
    document.getElementById('game-wrapper').classList.remove('agent-active');
    dom.agentThinkingBar.style.display = 'none';

    this.flashMessage('Agent stopped — you have control', 'info');
  }

  /* ── Called by game.js during agent play ── */

  showAgentThinking(text) {
    const { dom } = this;
    dom.agentThinkingText.textContent = text || 'Contemplating…';
    dom.agentThinkingBar.style.display = 'flex';
  }

  showAgentDecision(action, rationale) {
    const { dom } = this;

    // Brief highlight on the corresponding button
    const btnMap = { hit: dom.btnHit, stand: dom.btnStand, double: dom.btnDouble, split: dom.btnSplit };
    const btn = btnMap[action];
    if (btn && !btn.disabled) {
      btn.classList.add('agent-highlight');
      btn.addEventListener('animationend', () => btn.classList.remove('agent-highlight'), { once: true });
    }

    // Show reasoning
    if (rationale) {
      dom.agentReasoning.textContent = rationale;
      dom.agentReasoning.classList.add('fresh');
      setTimeout(() => dom.agentReasoning.classList.remove('fresh'), 2000);
    }

    dom.agentThinkingBar.style.display = 'none';
  }

  updateAgentLog(entries) {
    const { dom } = this;
    if (!entries.length) {
      dom.agentLog.innerHTML = '<div class="agent-log-empty">No activity yet…</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const el  = document.createElement('div');
      el.className = `log-entry ${entry.type ?? ''}`;

      const sym  = document.createElement('span');
      sym.className = 'log-sym';
      sym.textContent = { 'round-win':'✓', 'round-blackjack':'★', 'round-push':'≈', 'round-lose':'✗', action:'→' }[entry.type] ?? '·';

      const txt  = document.createElement('span');
      txt.className = 'log-text';
      txt.textContent = entry.text;

      el.appendChild(sym);
      el.appendChild(txt);
      fragment.appendChild(el);
    }
    dom.agentLog.innerHTML = '';
    dom.agentLog.appendChild(fragment);
    dom.agentLog.scrollTop = 0;
  }

  updateAgentRationale(text) {
    if (this.dom.agentRationale) this.dom.agentRationale.textContent = text;
  }

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
