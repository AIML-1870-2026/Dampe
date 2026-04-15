export default function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start"
    >
      <span className="text-red-500 text-lg flex-shrink-0" aria-hidden="true">⚠</span>
      <p className="text-sm text-red-700 font-sans flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors text-lg leading-none"
          aria-label="Dismiss error"
        >
          &times;
        </button>
      )}
    </div>
  );
}
