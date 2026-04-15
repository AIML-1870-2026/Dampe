/**
 * Parse a .env file text and extract the API key.
 * Supports multiple provider-specific variable names.
 */
export function parseEnvForKey(text, provider = 'anthropic') {
  const patterns = {
    anthropic: [
      /(?:ANTHROPIC_API_KEY|VITE_ANTHROPIC_API_KEY)\s*=\s*["']?([^\s"'\r\n]+)["']?/i,
      /API_KEY\s*=\s*["']?(sk-ant-[^\s"'\r\n]+)["']?/i,
    ],
    openai: [
      /(?:OPENAI_API_KEY|VITE_OPENAI_API_KEY)\s*=\s*["']?([^\s"'\r\n]+)["']?/i,
      /API_KEY\s*=\s*["']?(sk-[^\s"'\r\n]+)["']?/i,
    ],
    google: [
      /(?:GOOGLE_API_KEY|GEMINI_API_KEY|VITE_GOOGLE_API_KEY|VITE_GEMINI_API_KEY)\s*=\s*["']?([^\s"'\r\n]+)["']?/i,
      /API_KEY\s*=\s*["']?([^\s"'\r\n]+)["']?/i,
    ],
  };

  const providerPatterns = patterns[provider] || patterns.anthropic;

  for (const pattern of providerPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }

  // Fallback: any line with API_KEY=
  const genericMatch = text.match(/API_KEY\s*=\s*["']?([^\s"'\r\n]+)["']?/i);
  if (genericMatch && genericMatch[1]) return genericMatch[1];

  return null;
}
