import { useState } from 'react';
import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import Globe from './components/Globe/Globe';
import DetailCard from './components/Globe/DetailCard';
import ObjectTable from './components/Globe/ObjectTable';
import ProximityList from './components/ProximityList/ProximityList';
import { useNeoData } from './hooks/useNeoData';

export default function App() {
  const [activeTab, setActiveTab] = useState('current');
  const [selectedObject, setSelectedObject] = useState(null);
  const { objects, sentryObjects, loading, error, updatedAt, usingCache, refresh } = useNeoData();

  function handleSelectObject(obj) {
    setSelectedObject(obj);
    setActiveTab('current');
  }

  function handleWatchOnGlobe(obj) {
    setSelectedObject(obj);
    setActiveTab('globe');
  }

  function handleWatchOnGlobeCurrent(obj) {
    setSelectedObject(obj);
    setActiveTab('current');
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'list' || tab === 'list-current') setSelectedObject(null);
  }

  const isGlobeTab = activeTab === 'globe' || activeTab === 'current';
  const activeObjects = activeTab === 'current' ? sentryObjects : objects;

  const badgeText = activeTab === 'current'
    ? `${sentryObjects.length} tracked objects · NASA Sentry`
    : `${objects.length} objects · 60-day window`;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        updatedAt={updatedAt}
        usingCache={usingCache}
        onRefresh={refresh}
        loading={loading}
      />

      <AlertBanner
        objects={objects}
        onSelectObject={handleSelectObject}
        onSwitchTab={setActiveTab}
      />

      {error && objects.length === 0 && sentryObjects.length === 0 && (
        <div className="m-4 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-3">
          <span>Failed to load data: {error}</span>
          <button onClick={refresh} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}

      {loading && objects.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-gray-400">Fetching near-Earth object data…</div>
          </div>
        </div>
      )}

      {(!loading || objects.length > 0 || sentryObjects.length > 0) && (
        <main className="flex-1 overflow-hidden">
          {isGlobeTab ? (
            // Split layout: globe (left/top) + table (right/bottom)
            <div className="flex flex-col md:flex-row h-full">
              {/* Globe panel */}
              <div className="relative flex-1 min-h-0">
                <Globe
                  key={activeTab}
                  objects={activeObjects}
                  selectedObject={selectedObject}
                  onSelectObject={setSelectedObject}
                />

                {selectedObject && (
                  <DetailCard object={selectedObject} onClose={() => setSelectedObject(null)} />
                )}

                {/* Legend */}
                <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur rounded-lg p-3 text-xs space-y-1.5 border border-gray-700 pointer-events-none">
                  {[
                    { label: 'Critical (< 1 LD)', color: '#E24B4A' },
                    { label: 'Watch (1–5 LD)',    color: '#EF9F27' },
                    { label: 'Caution (5–10 LD)', color: '#FAC775' },
                    { label: 'Safe (> 10 LD)',    color: '#639922' },
                    { label: 'Tracked (no approach)', color: '#6b7280' },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-gray-300">{label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-700">
                    <div className="w-3 h-3 rounded-full border-2 border-red-400 animate-pulse" />
                    <span className="text-gray-300">Sentry watch list</span>
                  </div>
                </div>

                {/* Badge */}
                <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-400 border border-gray-700 pointer-events-none">
                  {badgeText}
                </div>
              </div>

              {/* Table panel — 320px wide on desktop, 40vh tall on mobile */}
              <div className="h-64 md:h-full md:w-80 lg:w-96 flex-shrink-0">
                <ObjectTable
                  objects={activeObjects}
                  selectedObject={selectedObject}
                  onSelect={setSelectedObject}
                />
              </div>
            </div>
          ) : activeTab === 'list-current' ? (
            <ProximityList
              objects={sentryObjects}
              onWatchOnGlobe={handleWatchOnGlobeCurrent}
              footerText="Top 50 NASA Sentry tracked objects"
            />
          ) : (
            <ProximityList
              objects={objects}
              onWatchOnGlobe={handleWatchOnGlobe}
              footerText="Next 60 days · Within 0.05 AU"
            />
          )}
        </main>
      )}
    </div>
  );
}
