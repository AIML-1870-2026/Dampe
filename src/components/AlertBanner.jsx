import { formatLd } from '../constants/conversions';

export default function AlertBanner({ objects, onSelectObject, onSwitchTab }) {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const alerts = objects.filter((o) => {
    const approachDate = new Date(o.cd);
    const withinWindow = approachDate <= thirtyDays;
    const criticalDist = o.distLd < 1;
    const highTorino = o.sentry?.ts >= 2;
    return withinWindow && (criticalDist || highTorino);
  });

  if (alerts.length === 0) return null;

  const top = alerts[0];
  const isRed = top.sentry?.ts >= 2;

  return (
    <div className={`px-4 py-3 flex items-center gap-3 text-sm font-medium ${isRed ? 'bg-red-900/80 border-b border-red-700 text-red-200' : 'bg-amber-900/80 border-b border-amber-700 text-amber-200'}`}>
      <span className="text-lg">⚠</span>
      <span>
        <span className="font-bold">Elevated Alert:</span>{' '}
        {top.name || top.des} will pass within {formatLd(top.distLd)} LD on{' '}
        {new Date(top.cd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
      </span>
      <button
        onClick={() => { onSelectObject(top); onSwitchTab('globe'); }}
        className="ml-auto underline hover:no-underline whitespace-nowrap"
      >
        View details →
      </button>
    </div>
  );
}
