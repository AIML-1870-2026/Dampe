'use strict';

/**
 * Hi-Lo Card Counting System
 *   2–6  → +1  (good for player)
 *   7–9  →  0  (neutral)
 *   10–A → −1  (good for dealer)
 *
 * True Count = Running Count ÷ Decks Remaining
 */
class Counter {
  constructor() {
    this.runningCount = 0;
    this.enabled = false;
  }

  reset() {
    this.runningCount = 0;
  }

  /** Call whenever a card becomes visible */
  processCard(card) {
    this.runningCount += card.countValue;
  }

  /** True count for bet-sizing decisions */
  trueCount(decksRemaining) {
    const d = Math.max(0.5, decksRemaining);
    return (this.runningCount / d).toFixed(1);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /** CSS color based on count strength */
  get countColor() {
    const rc = this.runningCount;
    if (rc >= 4)  return '#4ade80';  // strong player edge - bright green
    if (rc >= 2)  return '#86efac';  // mild player edge - light green
    if (rc <= -4) return '#f87171';  // strong dealer edge - red
    if (rc <= -2) return '#fca5a5';  // mild dealer edge - pink
    return '#fde68a';                // neutral - amber
  }

  get countLabel() {
    const tc = parseFloat(this.trueCount(1));
    if (tc >= 3)  return '🔥 Player Advantage';
    if (tc >= 1)  return '↑ Slight Advantage';
    if (tc <= -3) return '❄️ Dealer Advantage';
    if (tc <= -1) return '↓ Slight Disadvantage';
    return '⚖ Neutral';
  }
}
