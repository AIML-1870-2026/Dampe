export default function LoadingSpinner({ message = 'Generating your experiment...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <div
        className="w-10 h-10 rounded-full border-4 border-teal-100 border-t-[#0D6E6E] spinner"
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm text-slate-500 font-sans animate-pulse">{message}</p>
    </div>
  );
}
