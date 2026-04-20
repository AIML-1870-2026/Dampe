'use strict';

/* ══════════════════════════════════════════════
   LLMProvider  —  API key management & LLM calls
   Detects provider from key prefix; calls the
   appropriate chat-completions endpoint.
═══════════════════════════════════════════════ */
class LLMProvider {
  constructor() {
    this.apiKey   = null;
    this.provider = null; // 'sk-ant' | 'sk'
  }

  /* ── Key loading ── */

  setKey(rawKey) {
    const key = (rawKey || '').trim();
    if (!key) return false;
    this.apiKey   = key;
    this.provider = this._detectProvider(key);
    return this.provider !== 'unknown';
  }

  clearKey() {
    this.apiKey   = null;
    this.provider = null;
  }

  isConfigured() { return !!this.apiKey && !!this.provider && this.provider !== 'unknown'; }

  /* ── Provider metadata ── */

  _detectProvider(key) {
    if (key.startsWith('sk-ant-'))  return 'sk-ant';
    if (key.startsWith('sk-'))      return 'sk';
    return 'unknown';
  }

  get modelName() {
    return { 'sk-ant':'Haiku (fast)', 'sk':'Mini (fast)' }[this.provider] ?? 'AI';
  }

  get providerLabel() {
    return { 'sk-ant':'sk-ant key', 'sk':'sk key' }[this.provider] ?? 'Unknown';
  }

  get providerIcon() {
    return { 'sk-ant':'⚡', 'sk':'◎' }[this.provider] ?? '?';
  }

  /* ── Main entry point ── */

  async getBlackjackAction(gameState) {
    if (!this.isConfigured()) throw new Error('API key not configured');
    const prompt = this._buildPrompt(gameState);
    const raw    = await this._call(prompt);
    return this._parseResponse(raw, gameState);
  }

  /* ── Prompt construction ── */

  _buildPrompt(gs) {
    const actions = [];
    if (gs.canHit)    actions.push('hit');
    actions.push('stand');
    if (gs.canDouble) actions.push('double');
    if (gs.canSplit)  actions.push('split');

    return `You are an expert blackjack player using basic strategy. Decide the optimal action.

Hand: ${gs.playerCards} (total ${gs.playerTotal}${gs.isSoft ? ', soft' : ''})
Dealer shows: ${gs.dealerUpcard}
Available: ${actions.join(', ')}
Hi-Lo true count: ${gs.trueCount >= 0 ? '+' : ''}${gs.trueCount} | Bankroll: $${gs.bankroll} | Bet: $${gs.currentBet}

Reply ONLY with JSON: {"action":"<one of: ${actions.join('/')}>","reasoning":"<one sentence>"}`;
  }

  /* ── Provider dispatch ── */

  _call(prompt) {
    switch (this.provider) {
      case 'sk-ant': return this._callSkAnt(prompt);
      case 'sk':     return this._callSk(prompt);
      default: throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  async _callSkAnt(prompt) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':          this.apiKey,
        'anthropic-version':  '2023-06-01',
        'content-type':       'application/json',
        'anthropic-dangerous-direct-browser-calls': 'true',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${resp.status}`);
    }
    return (await resp.json()).content[0]?.text ?? '';
  }

  async _callSk(prompt) {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:      'gpt-4o-mini',
        max_tokens: 150,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${resp.status}`);
    }
    return (await resp.json()).choices[0]?.message?.content ?? '';
  }

  /* ── Response parsing ── */

  _parseResponse(text, gs) {
    const allowed = new Set(['stand']);
    if (gs.canHit)    allowed.add('hit');
    if (gs.canDouble) allowed.add('double');
    if (gs.canSplit)  allowed.add('split');

    // Try JSON extraction first
    try {
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        const obj    = JSON.parse(match[0]);
        const action = (obj.action || '').toLowerCase().trim();
        if (allowed.has(action)) {
          return { action, reasoning: (obj.reasoning || '').substring(0, 200) };
        }
      }
    } catch (_) {}

    // Keyword fallback (order matters: split > double > hit > stand)
    const lower = text.toLowerCase();
    for (const a of ['split', 'double', 'hit', 'stand']) {
      if (lower.includes(a) && allowed.has(a)) {
        return { action: a, reasoning: text.substring(0, 200) };
      }
    }

    return { action: 'stand', reasoning: 'Could not parse response — defaulting to stand.' };
  }
}
