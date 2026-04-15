import { useState, useEffect } from 'react';

const STORAGE_KEY = 'scilab_disclaimer_dismissed';

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      setDismissed(true);
      setVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 300);
  };

  const handleReopen = () => {
    setDismissed(false);
    setVisible(true);
  };

  if (dismissed) {
    return (
      <div className="max-w-[720px] mx-auto px-4 mb-6">
        <button
          onClick={handleReopen}
          className="text-xs text-amber-700 underline underline-offset-2 hover:text-amber-800 transition-colors font-sans"
        >
          View educational use disclaimer
        </button>
      </div>
    );
  }

  return (
    <div
      className={`max-w-[720px] mx-auto px-4 mb-6 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 mb-1">Educational Use Only</p>
          <p className="text-sm text-amber-700 leading-relaxed font-sans">
            This tool is intended to assist educators in lesson planning. Generated experiments are
            suggestions only. Users are solely responsible for evaluating the safety and appropriateness
            of any experiment before conducting it with students. Always follow your school's safety
            policies and local regulations. This tool will not generate dangerous, illegal, or
            age-inappropriate content.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors text-lg leading-none self-start"
          aria-label="Dismiss disclaimer"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
