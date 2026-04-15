import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({ breaks: true, gfm: true });

function SectionIcon({ type }) {
  const icons = {
    title: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    safety: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  };
  return icons[type] || null;
}

/**
 * Attempt to extract a structured section from the raw markdown text.
 * Falls back to rendering the full text if parsing fails.
 */
function parseSections(text) {
  // Extract safety notes — lines following a "Safety" heading up to next heading
  const safetyMatch = text.match(/##?\s*Safety\s*Notes?\s*\n([\s\S]*?)(?=\n##?\s|\n#\s|$)/i);
  const safetyContent = safetyMatch ? safetyMatch[1].trim() : null;

  return { safetyContent, fullText: text };
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-sans rounded-lg border border-slate-200 text-slate-600 hover:text-[#0D6E6E] hover:border-teal-200 transition-colors bg-white"
      aria-label="Copy experiment to clipboard"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export default function ExperimentOutput({ result, onGenerateAnother, onRegenerate }) {
  const outputRef = useRef(null);
  const [checkboxStates, setCheckboxStates] = useState({});

  // Announce to screen readers when content arrives
  useEffect(() => {
    if (result && outputRef.current) {
      outputRef.current.focus();
    }
    setCheckboxStates({});
  }, [result]);

  if (!result) return null;

  const { safetyContent, fullText } = parseSections(result);

  // Render the full markdown — we also do a custom pass to make material list items checkboxes
  const htmlContent = marked.parse(fullText);

  // Post-process: inject checkbox rendering for material list items
  // Replace `- ` list items in Materials List section with checkbox inputs
  const processedHtml = htmlContent.replace(
    /(<h[23][^>]*>[^<]*[Mm]aterial[^<]*<\/h[23]>)([\s\S]*?)(<h[23]|$)/,
    (match, heading, content, next) => {
      const withCheckboxes = content.replace(
        /<li>(.*?)<\/li>/g,
        '<li class="material-item"><label class="flex items-start gap-2 cursor-pointer"><input type="checkbox" class="mt-0.5 flex-shrink-0 accent-teal-600" /><span>$1</span></label></li>'
      );
      return heading + withCheckboxes + next;
    }
  );

  return (
    <section
      className="card mb-6 animate-fade-in"
      aria-labelledby="output-heading"
      aria-live="polite"
      ref={outputRef}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0D6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 id="output-heading" className="font-serif font-semibold text-lg text-[#1A1A2E]">
            Your Experiment
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <CopyButton text={result} />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-sans rounded-lg border border-slate-200 text-slate-600 hover:text-[#0D6E6E] hover:border-teal-200 transition-colors bg-white"
            aria-label="Print or save as PDF"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* Safety callout — extracted for emphasis */}
      {safetyContent && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-500" aria-hidden="true">⚠️</span>
            <span className="text-sm font-semibold text-amber-800 font-sans">Safety Notes</span>
          </div>
          <div
            className="text-sm text-amber-800 font-sans experiment-prose"
            dangerouslySetInnerHTML={{ __html: marked.parse(safetyContent) }}
          />
        </div>
      )}

      {/* Full experiment content */}
      <div
        className="experiment-prose"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />

      {/* Action buttons */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap gap-3 print:hidden">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium font-sans rounded-lg border border-slate-200 text-slate-600 hover:text-[#0D6E6E] hover:border-teal-200 transition-colors bg-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Regenerate
        </button>
        <button
          onClick={onGenerateAnother}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold font-sans rounded-lg bg-[#0D6E6E] text-white hover:bg-[#0a5a5a] transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Generate Another
        </button>
      </div>
    </section>
  );
}
