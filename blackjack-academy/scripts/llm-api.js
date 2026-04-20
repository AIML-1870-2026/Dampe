'use strict';

/* ══════════════════════════════════════════════
   LLMProvider  —  API key management & LLM calls
   Supports Anthropic and OpenAI via direct fetch (no SDK required).
═══════════════════════════════════════════════ */
class LLMProvider {
  constructor() {
    this.apiKey   = null;
    this.provider = null; // 'anthropic' | 'openai'
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
    if (key.startsWith('sk-ant-'))  return 'anthropic';
    if (key.startsWith('sk-'))      return 'openai';
    return 'unknown';
  }

  get modelName() {
    return { anthropic:'Claude Haiku', openai:'GPT-4o Mini' }[this.provider] ?? 'AI';
  }

  get providerLabel() {
    return { anthropic:'Anthropic', openai:'OpenAI' }[this.provider] ?? 'Unknown';
  }

  get providerIcon() {
    return { anthropic:'⚡', openai:'◎' }[this.provider] ?? '?';
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
      case 'anthropic': return this._callAnthropic(prompt);
      case 'openai':    return this._callOpenAI(prompt);
      default: throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  async _callAnthropic(prompt) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':     this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':  'application/json',
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
      throw new Error(err.error?.message || `Anthropic ${resp.status}`);
    }
    return (await resp.json()).content[0]?.text ?? '';
  }

  async _callOpenAI(prompt) {
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
      throw new Error(err.error?.message || `OpenAI ${resp.status}`);
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
