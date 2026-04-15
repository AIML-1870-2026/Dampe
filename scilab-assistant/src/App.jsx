import { useState, useRef } from 'react';

import Header from './components/Header.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import ApiSettings from './components/ApiSettings.jsx';
import ExperimentForm from './components/ExperimentForm.jsx';
import ExperimentOutput from './components/ExperimentOutput.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import ErrorAlert from './components/ErrorAlert.jsx';

import { callLLM } from './utils/apiHelpers.js';
import { buildUserPrompt } from './utils/prompts.js';

const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

export default function App() {
  // AI settings
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState('');

  // Request state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  // Keep last form inputs for regenerate
  const lastFormInputs = useRef(null);

  const outputRef = useRef(null);

  const handleGenerate = async (formInputs) => {
    setError('');
    setResult('');
    setIsLoading(true);
    lastFormInputs.current = formInputs;

    try {
      const userPrompt = buildUserPrompt(formInputs);
      const text = await callLLM({ provider, apiKey, model, userPrompt });
      setResult(text);

      // Scroll to output after render
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (lastFormInputs.current) {
      handleGenerate(lastFormInputs.current);
    }
  };

  const handleGenerateAnother = () => {
    setResult('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Print-only title */}
      <div className="hidden print:block text-center py-4 border-b border-slate-200 mb-4">
        <h1 className="font-serif text-2xl font-bold text-[#1A1A2E]">SciLab Assistant — Generated Experiment</h1>
      </div>

      <div className="max-w-[720px] mx-auto px-4 pb-16 print:px-0 print:pb-0">
        {/* Header */}
        <div className="print:hidden">
          <Header />
          <DisclaimerBanner />
        </div>

        {/* AI Settings */}
        <div className="print:hidden">
          <ApiSettings
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
            onApiKeyChange={setApiKey}
            hasApiKey={!!apiKey}
          />
        </div>

        {/* Experiment Form */}
        <div className="print:hidden">
          <ExperimentForm
            onSubmit={handleGenerate}
            isLoading={isLoading}
            hasApiKey={!!apiKey}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 print:hidden">
            <ErrorAlert message={error} onDismiss={() => setError('')} />
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="card mb-6 print:hidden">
            <LoadingSpinner />
          </div>
        )}

        {/* Output */}
        <div ref={outputRef}>
          {result && !isLoading && (
            <ExperimentOutput
              result={result}
              onGenerateAnother={handleGenerateAnother}
              onRegenerate={handleRegenerate}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-8 border-t border-slate-100 text-center print:hidden">
          <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-md mx-auto mb-3">
            SciLab Assistant is an independent educator tool. It is not affiliated with any school district,
            government body, or curriculum publisher.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <button
              onClick={() => {
                localStorage.removeItem('scilab_disclaimer_dismissed');
                window.location.reload();
              }}
              className="text-slate-400 hover:text-[#0D6E6E] underline underline-offset-2 transition-colors font-sans"
            >
              View full disclaimer
            </button>
            <span className="text-slate-200">|</span>
            <span className="text-slate-400 font-sans">No data is stored or transmitted beyond the selected AI provider</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
