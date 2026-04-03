'use strict';

/**
 * Basic Strategy — 8 decks, Dealer Stands on Soft 17
 *
 * Dealer index mapping:
 *   2→0, 3→1, 4→2, 5→3, 6→4, 7→5, 8→6, 9→7, T/J/Q/K→8, A→9
 *
 * Action codes:
 *   H  = Hit
 *   S  = Stand
 *   D  = Double (if allowed, else Hit)
 *   Ds = Double (if allowed, else Stand)
 *   P  = Split
 *   R  = Surrender (if allowed, else Hit)
 */
class Strategy {
  constructor() {
    // Hard totals [total 5-21][dealerIdx 0-9]
    this.hardTable = {
       5: ['H','H','H','H','H','H','H','H','H','H'],
       6: ['H','H','H','H','H','H','H','H','H','H'],
       7: ['H','H','H','H','H','H','H','H','H','H'],
       8: ['H','H','H','H','H','H','H','H','H','H'],
       9: ['H','D','D','D','D','H','H','H','H','H'],
      10: ['D','D','D','D','D','D','D','D','H','H'],
      11: ['D','D','D','D','D','D','D','D','D','H'],
      12: ['H','H','S','S','S','H','H','H','H','H'],
      13: ['S','S','S','S','S','H','H','H','H','H'],
      14: ['S','S','S','S','S','H','H','H','H','H'],
      15: ['S','S','S','S','S','H','H','H','R','H'],
      16: ['S','S','S','S','S','H','H','R','R','R'],
      17: ['S','S','S','S','S','S','S','S','S','S'],
      18: ['S','S','S','S','S','S','S','S','S','S'],
      19: ['S','S','S','S','S','S','S','S','S','S'],
      20: ['S','S','S','S','S','S','S','S','S','S'],
      21: ['S','S','S','S','S','S','S','S','S','S'],
    };

    // Soft totals [total 13-20][dealerIdx 0-9]
    // 'Ds' = double if allowed, else stand
    this.softTable = {
      13: ['H','H','H','D','D','H','H','H','H','H'],   // A,2
      14: ['H','H','H','D','D','H','H','H','H','H'],   // A,3
      15: ['H','H','D','D','D','H','H','H','H','H'],   // A,4
      16: ['H','H','D','D','D','H','H','H','H','H'],   // A,5
      17: ['H','D','D','D','D','H','H','H','H','H'],   // A,6
      18: ['Ds','Ds','Ds','Ds','Ds','S','S','H','H','H'], // A,7
      19: ['S','S','S','S','S','S','S','S','S','S'],   // A,8
      20: ['S','S','S','S','S','S','S','S','S','S'],   // A,9
    };

    // Pair splitting [pairKey][dealerIdx 0-9]
    // null = treat as hard total (5,5)
    this.pairTable = {
      'A': ['P','P','P','P','P','P','P','P','P','P'],
      'T': ['S','S','S','S','S','S','S','S','S','S'],
      '9': ['P','P','P','P','P','S','P','P','S','S'],
      '8': ['P','P','P','P','P','P','P','P','P','P'],
      '7': ['P','P','P','P','P','P','H','H','H','H'],
      '6': ['P','P','P','P','P','H','H','H','H','H'],
      '5': null,                                        // always treat as hard 10
      '4': ['H','H','H','P','P','H','H','H','H','H'],
      '3': ['P','P','P','P','P','P','H','H','H','H'],
      '2': ['P','P','P','P','P','P','H','H','H','H'],
    };

    this.actionNames = {
      H:  'HIT',
      S:  'STAND',
      D:  'DOUBLE DOWN',
      Ds: 'DOUBLE DOWN',
      P:  'SPLIT',
      R:  'SURRENDER',
    };

    this.actionDetails = {
      H:  'Your total is too low to stand safely — take another card.',
      S:  'Protect this total; let the dealer risk busting.',
      D:  'Strong position — double your bet and receive one more card.',
      Ds: 'Strong position — double your bet and receive one more card.',
      P:  'Splitting creates two stronger hands here.',
      R:  'Surrender half your bet to cut your losses (hit if surrender unavailable).',
    };
  }

  // Map dealer card → table index
  _dealerIdx(card) {
    if (card.rank === 'A') return 9;
    if (['J','Q','K','10'].includes(card.rank)) return 8;
    return +card.rank - 2;
  }

  // Map pair card → table key
  _pairKey(card) {
    if (card.rank === 'A') return 'A';
    if (card.value === 10) return 'T';
    return card.rank;
  }

  /**
   * Returns { action, label, explanation, highlightButton, isSurrender }
   * action = 'H' | 'S' | 'D' | 'P'  (final resolved action)
   * highlightButton = 'hit' | 'stand' | 'double' | 'split'
   */
  recommend(hand, dealerUpcard, canSplit, canDouble) {
    const di = this._dealerIdx(dealerUpcard);
    let rawAction;
    let handDesc;

    // ── Pair check ──
    if (hand.cards.length === 2 && hand.cards[0].value === hand.cards[1].value && canSplit) {
      const key = this._pairKey(hand.cards[0]);
      const pairRow = this.pairTable[key];
      if (pairRow) {
        rawAction = pairRow[di];
        handDesc = `Pair of ${this._rankName(hand.cards[0].rank)}s`;
      }
    }

    // ── Soft hand ──
    if (!rawAction) {
      if (hand.isSoft && hand.value >= 13 && hand.value <= 20) {
        rawAction = this.softTable[hand.value][di];
        handDesc = `Soft ${hand.value} (Ace + ${hand.value - 11})`;
      }
    }

    // ── Hard hand ──
    if (!rawAction) {
      const total = Math.min(Math.max(hand.value, 5), 21);
      rawAction = this.hardTable[total][di];
      handDesc = `Hard ${hand.value}`;
    }

    // ── Resolve conditional actions ──
    let action = rawAction;
    let isSurrender = false;

    if (action === 'D' && !canDouble)  action = 'H';
    if (action === 'Ds' && !canDouble) action = 'S';
    if (action === 'Ds') action = 'D'; // normalize
    if (action === 'R') { isSurrender = true; action = 'H'; }

    const dealerDesc = this._rankName(dealerUpcard.rank);
    const label = this.actionNames[isSurrender ? 'R' : action] || action;
    const detail = this.actionDetails[isSurrender ? 'R' : action] || '';

    const highlightButton = { H:'hit', S:'stand', D:'double', P:'split' }[action] || 'hit';

    const explanation = `${handDesc} vs Dealer ${dealerDesc}: ${label}. ${detail}` +
      (isSurrender ? ' (Hit if surrender is unavailable.)' : '');

    return { action, label, explanation, highlightButton, isSurrender };
  }

  _rankName(rank) {
    return ({ A:'Ace', J:'Jack', Q:'Queen', K:'King', '10':'Ten' })[rank] || rank;
  }
}
