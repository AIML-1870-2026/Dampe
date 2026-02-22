import { useState, useCallback, useMemo } from 'react';
import './App.css';

// ─── WCAG Math ────────────────────────────────────────────────────────────────

function toLinear(val) {
  const s = val / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function getLuminance({ r, g, b }) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Color Blindness Simulation ───────────────────────────────────────────────

const CB_MATRICES = {
  protanopia: [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0,   0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7,   0.3,   0.0],
    [0.0,   0.3,   0.7],
  ],
  tritanopia: [
    [0.95,  0.05,  0.0],
    [0.0,   0.433, 0.567],
    [0.0,   0.475, 0.525],
  ],
  tritanomaly: [
    [0.967, 0.033, 0.0],
    [0.0,   0.733, 0.267],
    [0.0,   0.183, 0.817],
  ],
};

function simulateColor(rgb, type) {
  if (type === 'none') return rgb;
  const m = CB_MATRICES[type];
  return {
    r: Math.round(Math.min(255, Math.max(0, m[0][0] * rgb.r + m[0][1] * rgb.g + m[0][2] * rgb.b))),
    g: Math.round(Math.min(255, Math.max(0, m[1][0] * rgb.r + m[1][1] * rgb.g + m[1][2] * rgb.b))),
    b: Math.round(Math.min(255, Math.max(0, m[2][0] * rgb.r + m[2][1] * rgb.g + m[2][2] * rgb.b))),
  };
}

function rgbStr({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Black on White',        text: { r: 0, g: 0, b: 0 },       bg: { r: 255, g: 255, b: 255 } },
  { label: 'White on Black',        text: { r: 255, g: 255, b: 255 },  bg: { r: 0, g: 0, b: 0 } },
  { label: 'Dark Gray on White',    text: { r: 51, g: 51, b: 51 },     bg: { r: 255, g: 255, b: 255 } },
  { label: 'White on Navy',         text: { r: 255, g: 255, b: 255 },  bg: { r: 0, g: 51, b: 102 } },
  { label: 'Navy on Light Blue',    text: { r: 0, g: 51, b: 102 },     bg: { r: 230, g: 244, b: 255 } },
  { label: 'Dark Green on Cream',   text: { r: 0, g: 102, b: 51 },     bg: { r: 255, g: 253, b: 240 } },
  { label: 'Purple on Lavender',    text: { r: 75, g: 0, b: 130 },     bg: { r: 230, g: 230, b: 250 } },
  { label: 'Brown on Beige',        text: { r: 101, g: 67, b: 33 },    bg: { r: 245, g: 245, b: 220 } },
  { label: 'Charcoal on Light Gray',text: { r: 54, g: 54, b: 54 },     bg: { r: 242, g: 242, b: 242 } },
  { label: 'Teal on Mint',          text: { r: 0, g: 102, b: 102 },    bg: { r: 245, g: 255, b: 250 } },
];

const FONT_FAMILIES = [
  { label: 'Sans-serif (Default)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Serif',                value: "Georgia, 'Times New Roman', serif" },
  { label: 'Monospace',            value: "'Courier New', monospace" },
  { label: 'System UI',            value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
];

const FONT_WEIGHTS = [
  { label: 'Light',     value: 300 },
  { label: 'Regular',   value: 400 },
  { label: 'Medium',    value: 500 },
  { label: 'Semi-Bold', value: 600 },
  { label: 'Bold',      value: 700 },
];

const CB_TYPES = [
  { label: 'None (Normal Vision)', value: 'none' },
  { label: 'Protanopia',           value: 'protanopia' },
  { label: 'Deuteranopia',         value: 'deuteranopia' },
  { label: 'Tritanopia',           value: 'tritanopia' },
  { label: 'Tritanomaly',          value: 'tritanomaly' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RgbSliders({ label, color, onChange }) {
  const channels = [
    { key: 'r', name: 'Red',   cls: 'slider-red',   track: `linear-gradient(to right, rgb(0,${color.g},${color.b}), rgb(255,${color.g},${color.b}))` },
    { key: 'g', name: 'Green', cls: 'slider-green',  track: `linear-gradient(to right, rgb(${color.r},0,${color.b}), rgb(${color.r},255,${color.b}))` },
    { key: 'b', name: 'Blue',  cls: 'slider-blue',   track: `linear-gradient(to right, rgb(${color.r},${color.g},0), rgb(${color.r},${color.g},255))` },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-1">
        <div
          className="w-10 h-10 rounded-lg border-2 border-white shadow-md flex-shrink-0"
          style={{ backgroundColor: rgbStr(color) }}
          aria-label={`${label} color preview`}
        />
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="text-sm font-mono text-gray-700">{rgbStr(color)}</div>
        </div>
      </div>
      {channels.map(({ key, name, track }) => (
        <div key={key} className="flex items-center gap-3">
          <label className="text-xs text-gray-500 w-10 flex-shrink-0">{name}</label>
          <input
            type="range"
            min={0}
            max={255}
            value={color[key]}
            aria-label={`${label} ${name} channel`}
            onChange={e => onChange(key, parseInt(e.target.value))}
            className="flex-1 h-1.5 rounded cursor-pointer"
            style={{ background: track }}
          />
          <span className="text-xs font-mono text-gray-600 w-8 text-right">{color[key]}</span>
        </div>
      ))}
    </div>
  );
}

function ComplianceRow({ label, passes, threshold }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${passes ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{threshold}</span>
        {passes
          ? <span className="text-green-600 font-bold text-base" aria-label="Pass">✅</span>
          : <span className="text-red-500 font-bold text-base" aria-label="Fail">❌</span>
        }
      </div>
    </div>
  );
}

function PreviewPanel({ label, textColor, bgColor, sampleText, fontSize, fontFamily, fontWeight }) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-center">{label}</div>
      <div
        className="flex-1 rounded-xl border border-gray-200 shadow-inner p-5 overflow-auto min-h-[160px] flex items-center justify-center"
        style={{
          backgroundColor: rgbStr(bgColor),
          color: rgbStr(textColor),
          fontSize: `${fontSize}px`,
          fontFamily,
          fontWeight,
          lineHeight: 1.5,
          transition: 'background-color 0.2s, color 0.2s',
        }}
        aria-label={`${label} preview`}
      >
        <span style={{ wordBreak: 'break-word', textAlign: 'center' }}>{sampleText}</span>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [textColor, setTextColor]       = useState({ r: 30, g: 30, b: 30 });
  const [bgColor, setBgColor]           = useState({ r: 255, g: 255, b: 255 });
  const [fontSize, setFontSize]         = useState(16);
  const [fontFamily, setFontFamily]     = useState(FONT_FAMILIES[0].value);
  const [fontWeight, setFontWeight]     = useState(400);
  const [cbType, setCbType]             = useState('none');
  const [sampleText, setSampleText]     = useState('The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789');
  const [copied, setCopied]             = useState(null);

  // Derived values
  const textLum = useMemo(() => getLuminance(textColor), [textColor]);
  const bgLum   = useMemo(() => getLuminance(bgColor),   [bgColor]);
  const ratio   = useMemo(() => getContrastRatio(textLum, bgLum), [textLum, bgLum]);

  // WCAG large text: >= 18pt (24px) OR >= 14pt bold (18.67px at bold weight)
  const isLargeText = useMemo(() => {
    const ptSize = fontSize * 0.75; // px to pt approximation
    return ptSize >= 18 || (ptSize >= 14 && fontWeight >= 700);
  }, [fontSize, fontWeight]);

  // Color blindness simulated colors
  const simTextColor = useMemo(() => simulateColor(textColor, cbType), [textColor, cbType]);
  const simBgColor   = useMemo(() => simulateColor(bgColor, cbType),   [bgColor, cbType]);

  const handleTextChannel = useCallback((ch, val) => {
    setTextColor(prev => ({ ...prev, [ch]: val }));
  }, []);

  const handleBgChannel = useCallback((ch, val) => {
    setBgColor(prev => ({ ...prev, [ch]: val }));
  }, []);

  const applyPreset = useCallback(e => {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    setTextColor(PRESETS[idx].text);
    setBgColor(PRESETS[idx].bg);
    e.target.value = '';
  }, []);

  const copyRgb = useCallback((which, color) => {
    navigator.clipboard.writeText(rgbStr(color)).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  const ratioDisplay = ratio.toFixed(2) + ':1';
  const overallPass  = ratio >= 4.5;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700 tracking-tight">Readable</h1>
            <p className="text-sm text-gray-500">WCAG Color Contrast Checker</p>
          </div>
          <a
            href="https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:text-indigo-700 underline"
          >
            WCAG 2.1 Docs ↗
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Control Panel ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Presets + Text Color */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-5">
            {/* Presets */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Common Presets
              </label>
              <select
                onChange={applyPreset}
                defaultValue=""
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Select a color preset"
              >
                <option value="" disabled>Select a preset…</option>
                {PRESETS.map((p, i) => (
                  <option key={p.label} value={i}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Text Color */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Text Color</span>
                <button
                  onClick={() => copyRgb('text', textColor)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-50 transition-colors"
                  aria-label="Copy text color RGB value"
                >
                  {copied === 'text' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <RgbSliders label="Text" color={textColor} onChange={handleTextChannel} />
              <div className="mt-2 text-xs text-gray-400">
                Luminance: <span className="font-mono text-gray-600">{textLum.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Background Color */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Background Color</span>
              <button
                onClick={() => copyRgb('bg', bgColor)}
                className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-50 transition-colors"
                aria-label="Copy background color RGB value"
              >
                {copied === 'bg' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <RgbSliders label="Background" color={bgColor} onChange={handleBgChannel} />
            <div className="mt-2 text-xs text-gray-400">
              Luminance: <span className="font-mono text-gray-600">{bgLum.toFixed(4)}</span>
            </div>
          </div>

          {/* Font Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <span className="block text-sm font-semibold text-gray-700 mb-1">Font Options</span>

            {/* Size */}
            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="font-size" className="text-xs text-gray-500">Size</label>
                <span className="text-xs font-mono text-gray-600">{fontSize}px {isLargeText ? <span className="text-indigo-500">(large text)</span> : ''}</span>
              </div>
              <input
                id="font-size"
                type="range"
                min={12}
                max={72}
                value={fontSize}
                onChange={e => setFontSize(parseInt(e.target.value))}
                className="w-full"
                style={{ background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(fontSize - 12) / 60 * 100}%, #d1d5db ${(fontSize - 12) / 60 * 100}%, #d1d5db 100%)` }}
                aria-label="Font size"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>12px</span><span>72px</span>
              </div>
            </div>

            {/* Family */}
            <div>
              <label htmlFor="font-family" className="block text-xs text-gray-500 mb-1">Family</label>
              <select
                id="font-family"
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.label} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Weight */}
            <div>
              <label htmlFor="font-weight" className="block text-xs text-gray-500 mb-1">Weight</label>
              <select
                id="font-weight"
                value={fontWeight}
                onChange={e => setFontWeight(parseInt(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {FONT_WEIGHTS.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Compliance Section ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">

            {/* Contrast Ratio */}
            <div className="flex flex-col items-center justify-center min-w-[160px]">
              <div className={`text-5xl font-black tracking-tight ${overallPass ? 'text-green-600' : 'text-red-500'}`}>
                {ratioDisplay}
              </div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Contrast Ratio</div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Text lum: <span className="font-mono">{textLum.toFixed(4)}</span><br />
                BG lum: <span className="font-mono">{bgLum.toFixed(4)}</span>
              </div>
            </div>

            <div className="h-px md:h-20 md:w-px bg-gray-200 self-stretch" />

            {/* Normal Text */}
            <div className="flex-1 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Normal Text &lt;18pt (or &lt;14pt bold)
              </div>
              <ComplianceRow label="WCAG AA"  passes={ratio >= 4.5} threshold="≥ 4.5:1" />
              <ComplianceRow label="WCAG AAA" passes={ratio >= 7.0} threshold="≥ 7.0:1" />
            </div>

            <div className="h-px md:h-20 md:w-px bg-gray-200 self-stretch" />

            {/* Large Text */}
            <div className="flex-1 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Large Text ≥18pt (or ≥14pt bold)
                {isLargeText && <span className="ml-2 text-indigo-500">← current size</span>}
              </div>
              <ComplianceRow label="WCAG AA (Large)"  passes={ratio >= 3.0} threshold="≥ 3.0:1" />
              <ComplianceRow label="WCAG AAA (Large)" passes={ratio >= 4.5} threshold="≥ 4.5:1" />
            </div>
          </div>
        </div>

        {/* ── Preview Section ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <span className="text-sm font-semibold text-gray-700">Preview</span>
            <div className="flex items-center gap-3">
              <label htmlFor="cb-type" className="text-xs text-gray-500 whitespace-nowrap">Simulate:</label>
              <select
                id="cb-type"
                value={cbType}
                onChange={e => setCbType(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                aria-label="Color blindness simulation type"
              >
                {CB_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Editable sample text */}
          <div>
            <label htmlFor="sample-text" className="block text-xs text-gray-400 mb-1">Sample text (editable)</label>
            <textarea
              id="sample-text"
              value={sampleText}
              onChange={e => setSampleText(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              aria-label="Edit sample text"
            />
          </div>

          {/* Side-by-side panels */}
          <div className="flex gap-4">
            <PreviewPanel
              label="Normal Vision"
              textColor={textColor}
              bgColor={bgColor}
              sampleText={sampleText}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
            />
            <PreviewPanel
              label={cbType === 'none' ? 'Simulated Vision' : CB_TYPES.find(t => t.value === cbType)?.label}
              textColor={simTextColor}
              bgColor={simBgColor}
              sampleText={sampleText}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
            />
          </div>

          {cbType !== 'none' && (
            <div className="text-xs text-gray-400 text-center">
              Simulated colors — Text: <span className="font-mono">{rgbStr(simTextColor)}</span> &nbsp;|&nbsp; Background: <span className="font-mono">{rgbStr(simBgColor)}</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-8 py-5 text-center text-xs text-gray-400 bg-white">
        <p>
          <strong className="text-gray-600">WCAG 2.1</strong> requires a minimum contrast ratio of <strong>4.5:1</strong> for normal text (AA) and <strong>7:1</strong> for enhanced (AAA).
          Large text (≥18pt or bold ≥14pt) requires <strong>3:1</strong> (AA) and <strong>4.5:1</strong> (AAA).
        </p>
        <p className="mt-1">
          Luminance calculated per{' '}
          <a
            href="https://www.w3.org/TR/WCAG21/#dfn-relative-luminance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-600 underline"
          >
            WCAG relative luminance formula
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
