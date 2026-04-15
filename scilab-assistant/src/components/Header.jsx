export default function Header() {
  return (
    <header className="text-center py-10 px-4">
      {/* Flask icon */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-teal-50 border border-teal-100 shadow-sm">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
            <path
              d="M22 8h20v18l14 24a4 4 0 01-3.46 6H11.46A4 4 0 018 50l14-24V8z"
              fill="#0D6E6E"
              fillOpacity="0.12"
              stroke="#0D6E6E"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <rect x="22" y="6" width="20" height="4" rx="2" fill="#0D6E6E" fillOpacity="0.35" />
            <path
              d="M19 44l-6 10a4 4 0 003.46 6h31.08A4 4 0 0051 54l-6-10H19z"
              fill="#F4A261"
              fillOpacity="0.55"
            />
            <circle cx="28" cy="50" r="2" fill="white" fillOpacity="0.8" />
            <circle cx="35" cy="46" r="1.5" fill="white" fillOpacity="0.5" />
          </svg>
        </div>
      </div>

      <h1 className="font-serif text-4xl font-bold text-[#1A1A2E] mb-3 tracking-tight">
        SciLab Assistant
      </h1>
      <p className="text-lg text-[#0D6E6E] font-medium mb-2">
        Generate safe, curriculum-aligned science experiments in seconds.
      </p>
      <p className="text-sm text-slate-500 font-sans max-w-md mx-auto">
        Designed for science educators — K–12 and introductory college courses
      </p>
    </header>
  );
}
