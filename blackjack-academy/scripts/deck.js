'use strict';

/**
 * Card — represents a single playing card
 */
class Card {
  constructor(suit, rank) {
    this.suit = suit;   // 'hearts' | 'diamonds' | 'clubs' | 'spades'
    this.rank = rank;   // 'A' | '2'–'10' | 'J' | 'Q' | 'K'
    this.value      = this._calcValue();
    this.countValue = this._calcCountValue();
    this.id = `${rank}_${suit}_${Math.random().toString(36).slice(2,7)}`;
  }

  _calcValue() {
    if (this.rank === 'A') return 11;
    if (['J','Q','K'].includes(this.rank)) return 10;
    return +this.rank;
  }

  // Hi-Lo: 2-6 = +1, 7-9 = 0, 10/J/Q/K/A = -1
  _calcCountValue() {
    if (this.value >= 10) return -1;
    if (this.value <= 6)  return  1;
    return 0;
  }

  get symbol() {
    return { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' }[this.suit];
  }

  get isRed() {
    return this.suit === 'hearts' || this.suit === 'diamonds';
  }
}


/**
 * Deck — manages an N-deck shoe
 */
class Deck {
  static SUITS = ['hearts','diamonds','clubs','spades'];
  static RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  constructor(numDecks = 8) {
    this.numDecks = numDecks;
    this.shoe = [];
    this.cardsDealt = 0;
    this.init();
  }

  init() {
    this.shoe = [];
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of Deck.SUITS) {
        for (const rank of Deck.RANKS) {
          this.shoe.push(new Card(suit, rank));
        }
      }
    }
    this._shuffle();
    this.shoe.shift(); // burn first card (not shown)
    this.cardsDealt = 0;
  }

  _shuffle() {
    // Fisher-Yates
    for (let i = this.shoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shoe[i], this.shoe[j]] = [this.shoe[j], this.shoe[i]];
    }
  }

  deal() {
    if (!this.shoe.length) this.init();
    this.cardsDealt++;
    return this.shoe.shift();
  }

  // Reshuffle when ~75% of shoe has been dealt
  get needsReshuffle() {
    return this.cardsDealt >= Math.floor(this.numDecks * 52 * 0.75);
  }

  get cardsRemaining() { return this.shoe.length; }

  get decksRemaining() { return Math.max(0.5, this.shoe.length / 52); }

  get decksRemainingDisplay() { return this.decksRemaining.toFixed(1); }

  get penetrationPct() {
    return Math.round(this.cardsDealt / (this.numDecks * 52) * 100);
  }
}
