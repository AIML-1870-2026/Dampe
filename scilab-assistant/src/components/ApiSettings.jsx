import { useState, useRef } from 'react';
import { parseEnvForKey } from '../utils/envParser.js';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', shortLabel: 'Claude' },
  { id: 'openai',    label: 'OpenAI',    shortLabel: 'GPT' },
  { id: 'google',    label: 'Google',    shortLabel: 'Gemini' },
];

const MODELS = {
  anthropic: [
    { id: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6 (Recommended)' },
    { id: 'claude-opus-4-6',            label: 'Claude Opus 4.6 (Most capable)' },
    { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5 (Fastest)' },
  ],
  openai: [
    { id: 'gpt-4o',           label: 'GPT-4o (Recommended)' },
    { id: 'gpt-4o-mini',      label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo',      label: 'GPT-4 Turbo' },
    { id: 'gpt-4',            label: 'GPT-4' },
    { id: 'gpt-3.5-turbo',    label: 'GPT-3.5 Turbo' },
    { id: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k' },
  ],
  google: [
    { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro (Recommended)' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Faster)' },
  ],
};

export default function ApiSettings({ provider, model, onProviderChange, onModelChange, onApiKeyChange, hasApiKey }) {
  const [activeTab, setActiveTab] = useState('paste');
  const [keyInput, setKeyInput] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [fileMsg, setFileMsg] = useState('');
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleProviderChange = (newProvider) => {
    onProviderChange(newProvider);
    // Reset key and input when provider changes
    setKeyInput('');
    setFileMsg('');
    setFileError('');
    onApiKeyChange('');
    // Auto-select first model for new provider
    onModelChange(MODELS[newProvider][0].id);
  };

  const handleKeyInputChange = (e) => {
    const val = e.target.value;
    setKeyInput(val);
    onApiKeyChange(val.trim());
  };

  const processFileText = (text) => {
    const key = parseEnvForKey(text, provider);
    if (key) {
      setKeyInput('');
      setFileError('');
      setFileMsg('API key loaded from file');
      onApiKeyChange(key);
    } else {
      setFileMsg('');
      setFileError('No API key found in that file. Check that it contains API_KEY=... or a provider-specific variable.');
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => processFileText(e.target.result);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const currentModels = MODELS[provider];

  return (
    <section className="card mb-6" aria-labelledby="ai-settings-heading">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0D6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 id="ai-settings-heading" className="font-serif font-semibold text-lg text-[#1A1A2E]">
          AI Settings
        </h2>
      </div>

      {/* Provider selection */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-600 mb-2 font-sans">
          AI Provider
        </label>
        <div className="flex gap-2" role="group" aria-label="Select AI provider">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border font-sans ${
                provider === p.id
                  ? 'bg-[#0D6E6E] text-white border-[#0D6E6E] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-[#0D6E6E]'
              }`}
            >
              <span className="hidden sm:inline">{p.label}</span>
              <span className="sm:hidden">{p.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model selection */}
      <div className="mb-5">
        <label htmlFor="model-select" className="block text-sm font-medium text-slate-600 mb-2 font-sans">
          Model
        </label>
        <select
          id="model-select"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-sans appearance-none cursor-pointer"
        >
          {currentModels.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* API Key — tabbed */}
      <div>
        <div className="flex gap-1 mb-3 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all font-sans ${
              activeTab === 'paste'
                ? 'bg-white text-[#1A1A2E] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Paste Key
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all font-sans ${
              activeTab === 'upload'
                ? 'bg-white text-[#1A1A2E] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Upload .env
          </button>
        </div>

        {activeTab === 'paste' && (
          <div>
            <label htmlFor="api-key-input" className="block text-sm font-medium text-slate-600 mb-2 font-sans">
              API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="api-key-input"
                  type={revealed ? 'text' : 'password'}
                  value={keyInput}
                  onChange={handleKeyInputChange}
                  placeholder="Paste your API key here..."
                  autoComplete="off"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono text-[#1A1A2E] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setRevealed((r) => !r)}
                title={revealed ? 'Hide key' : 'Show key'}
                className="px-3 py-2.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors bg-white"
                aria-label={revealed ? 'Hide API key' : 'Show API key'}
              >
                {revealed ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-sans">
              Your key is never stored or transmitted to any server other than the selected AI provider.
            </p>
          </div>
        )}

        {activeTab === 'upload' && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2 font-sans">
              Upload .env File
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-[#0D6E6E] bg-teal-50'
                  : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/50'
              }`}
              role="button"
              tabIndex={0}
              aria-label="Upload .env file"
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".env,.txt,text/plain"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <div className="text-2xl mb-1">📂</div>
              <p className="text-sm font-medium text-slate-600 font-sans">Drop a .env file or click to browse</p>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Looks for <code className="font-mono">API_KEY=</code> or provider-specific variables
              </p>
            </div>

            {fileMsg && (
              <div className="flex items-center gap-2 mt-2 text-sm text-teal-700 font-sans">
                <span>✅</span>
                <span>{fileMsg}</span>
              </div>
            )}
            {fileError && (
              <p className="mt-2 text-sm text-red-600 font-sans">{fileError}</p>
            )}
          </div>
        )}

        {/* Key status indicator */}
        <div className={`mt-3 flex items-center gap-2 text-xs font-sans ${hasApiKey ? 'text-teal-700' : 'text-slate-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasApiKey ? 'bg-teal-500' : 'bg-slate-300'}`} />
          {hasApiKey ? 'API key is set and ready' : 'No API key — required to generate experiments'}
        </div>
      </div>
    </section>
  );
}
