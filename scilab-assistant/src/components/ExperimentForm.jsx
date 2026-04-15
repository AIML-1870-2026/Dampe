import { useState } from 'react';

const GRADE_LEVELS = ['K–2', '3–5', '6–8', '9–10', '11–12', 'College Intro'];

const SUBJECTS = [
  'Biology',
  'Chemistry',
  'Physics',
  'Earth Science',
  'Environmental Science',
  'General Science',
];

const TIME_OPTIONS = ['15 min', '30 min', '45 min', '60 min', '90 min', 'Custom'];

const DEFAULT_FORM = {
  gradeLevel: '6–8',
  subjects: [],
  materials: '',
  time: '45 min',
  customTime: '',
  studentCount: '',
  constraints: '',
};

export default function ExperimentForm({ onSubmit, isLoading, hasApiKey }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  const isFormValid =
    hasApiKey &&
    form.subjects.length > 0 &&
    form.materials.trim().length > 0 &&
    (form.time !== 'Custom' || form.customTime.trim().length > 0);

  const toggleSubject = (subject) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    onSubmit({
      gradeLevel: form.gradeLevel,
      subjects: form.subjects,
      materials: form.materials,
      time: form.time === 'Custom' ? form.customTime : form.time,
      studentCount: form.studentCount,
      constraints: form.constraints,
    });
  };

  return (
    <section className="card mb-6" aria-labelledby="form-heading">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0D6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h2 id="form-heading" className="font-serif font-semibold text-lg text-[#1A1A2E]">
          Design Your Experiment
        </h2>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Grade Level */}
        <div className="mb-5">
          <label htmlFor="grade-level" className="block text-sm font-medium text-slate-600 mb-2 font-sans">
            Grade Level <span className="text-red-400">*</span>
          </label>
          <select
            id="grade-level"
            value={form.gradeLevel}
            onChange={(e) => setForm((f) => ({ ...f, gradeLevel: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-sans appearance-none cursor-pointer"
          >
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Subject Focus */}
        <div className="mb-5">
          <fieldset>
            <legend className="block text-sm font-medium text-slate-600 mb-2 font-sans">
              Subject Focus <span className="text-red-400">*</span>
              {form.subjects.length > 0 && (
                <span className="ml-2 text-xs text-teal-600">({form.subjects.length} selected)</span>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((subject) => {
                const selected = form.subjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border font-sans ${
                      selected
                        ? 'bg-[#0D6E6E] text-white border-[#0D6E6E]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-[#0D6E6E]'
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
            {form.subjects.length === 0 && (
              <p className="text-xs text-slate-400 mt-1.5 font-sans">Select at least one subject</p>
            )}
          </fieldset>
        </div>

        {/* Available Materials */}
        <div className="mb-5">
          <label htmlFor="materials" className="block text-sm font-medium text-slate-600 mb-2 font-sans">
            Available Materials <span className="text-red-400">*</span>
          </label>
          <textarea
            id="materials"
            value={form.materials}
            onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))}
            placeholder="e.g. baking soda, vinegar, balloons, plastic cups, measuring spoons, food coloring..."
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-sans resize-y"
          />
        </div>

        {/* Time Available */}
        <div className="mb-5">
          <fieldset>
            <legend className="block text-sm font-medium text-slate-600 mb-2 font-sans">
              Time Available <span className="text-red-400">*</span>
            </legend>
            <div className="flex flex-wrap gap-2 mb-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, time: t }))}
                  aria-pressed={form.time === t}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border font-sans ${
                    form.time === t
                      ? 'bg-[#0D6E6E] text-white border-[#0D6E6E]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-[#0D6E6E]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {form.time === 'Custom' && (
              <input
                type="text"
                value={form.customTime}
                onChange={(e) => setForm((f) => ({ ...f, customTime: e.target.value }))}
                placeholder="e.g. 2 hours, 3 class periods..."
                className="mt-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-sans w-full sm:w-64"
                aria-label="Custom time duration"
              />
            )}
          </fieldset>
        </div>

        {/* Number of Students */}
        <div className="mb-5">
          <label htmlFor="student-count" className="block text-sm font-medium text-slate-600 mb-2 font-sans">
            Number of Students <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="student-count"
            type="number"
            min="1"
            max="500"
            value={form.studentCount}
            onChange={(e) => setForm((f) => ({ ...f, studentCount: e.target.value }))}
            placeholder="e.g. 25"
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-sans w-32"
          />
          <p className="text-xs text-slate-400 mt-1 font-sans">Used for materials scaling guidance</p>
        </div>

        {/* Special Constraints */}
        <div className="mb-6">
          <label htmlFor="constraints" className="block text-sm font-medium text-slate-600 mb-2 font-sans">
            Special Constraints <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="constraints"
            value={form.constraints}
            onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value }))}
            placeholder="e.g. no open flames, must be done at home, no liquids, budget under $20..."
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent font-sans resize-y"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`w-full py-3.5 px-6 rounded-xl text-base font-semibold font-sans transition-all ${
            isFormValid && !isLoading
              ? 'bg-[#0D6E6E] hover:bg-[#0a5a5a] active:bg-[#094d4d] text-white shadow-md hover:shadow-lg'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white spinner inline-block" />
              Generating your experiment...
            </span>
          ) : (
            'Generate Experiment →'
          )}
        </button>

        {!hasApiKey && (
          <p className="text-xs text-center text-slate-400 mt-2 font-sans">
            An API key is required to generate experiments
          </p>
        )}
      </form>
    </section>
  );
}
