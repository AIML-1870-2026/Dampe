import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { SIZE_REFERENCES } from '../../constants/references';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function SizeChart({ diameterM }) {
  if (diameterM == null) return <div className="text-gray-500 text-sm">Size unknown</div>;

  const refs = SIZE_REFERENCES.filter(r => r.size <= diameterM * 20 && r.size >= diameterM * 0.01);
  const nearest = SIZE_REFERENCES.reduce((prev, curr) =>
    Math.abs(curr.size - diameterM) < Math.abs(prev.size - diameterM) ? curr : prev
  );

  // Build chart with relevant references + the asteroid
  const allItems = [...SIZE_REFERENCES, { label: 'This Object', size: diameterM, isAsteroid: true }]
    .sort((a, b) => a.size - b.size);

  const labels = allItems.map(i => i.label);
  const data = allItems.map(i => i.size);
  const colors = allItems.map(i => i.isAsteroid ? '#60a5fa' : '#374151');
  const borders = allItems.map(i => i.isAsteroid ? '#93c5fd' : '#4b5563');

  const chartData = {
    labels,
    datasets: [{
      label: 'Size (m)',
      data,
      backgroundColor: colors,
      borderColor: borders,
      borderWidth: 1,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.raw;
            if (v < 1) return ` ${(v * 100).toFixed(1)} cm`;
            if (v < 1000) return ` ${v.toFixed(1)} m`;
            return ` ${(v / 1000).toFixed(2)} km`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'logarithmic',
        grid: { color: '#1f2937' },
        ticks: { color: '#6b7280', font: { size: 10 } },
      },
      y: {
        grid: { color: '#1f2937' },
        ticks: { color: '#9ca3af', font: { size: 10 } },
      },
    },
  };

  return (
    <div>
      <div className="text-xs text-gray-400 mb-2">
        {diameterM < 0.043 ? (
          <span className="text-gray-400">Smaller than a golf ball — would likely burn up in the atmosphere.</span>
        ) : diameterM >= 1000 ? (
          <span className="text-red-400 font-semibold">Objects this size are classified as potentially hazardous by NASA.</span>
        ) : (
          <span>Approximately the size of a <strong className="text-white">{nearest.label}</strong>.</span>
        )}
      </div>
      <div style={{ height: 220 }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
