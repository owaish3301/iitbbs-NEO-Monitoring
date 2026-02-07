import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsCards from '@/components/dashboard/StatsCards';
import NeoFeedTable from '@/components/dashboard/NeoFeedTable';
import RiskAnalysisPanel from '@/components/dashboard/RiskAnalysisPanel';
import NeoDetailPanel from '@/components/dashboard/NeoDetailPanel';
import Watchlist from '@/components/dashboard/Watchlist';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import OrbitViewer from '@/components/dashboard/OrbitViewer';
import CommunityChat from '@/components/dashboard/CommunityChat';

// Import NEO data
import neoDataJson from '@/data/neo-data.json';

const DashboardLayout = () => {
  const [activeView, setActiveView] = useState('overview');
  const [neoData, setNeoData] = useState(null);
  const [selectedNeo, setSelectedNeo] = useState(null);
  const [watchlist, setWatchlist] = useState([]);

  // Mock user data
  const user = {
    name: 'Space Explorer',
    email: 'explorer@skynetics.com',
    avatar: null,
  };

  useEffect(() => {
    // Load NEO data
    setNeoData(neoDataJson);
  }, []);

  const handleSelectNeo = (neo) => {
    setSelectedNeo(neo);
  };

  const handleCloseDetail = () => {
    setSelectedNeo(null);
  };

  const handleAddToWatchlist = (neo) => {
    setWatchlist(prev => {
      if (prev.find(n => n.id === neo.id)) {
        return prev; // Already in watchlist
      }
      return [...prev, neo];
    });
  };

  const handleRemoveFromWatchlist = (neoId) => {
    setWatchlist(prev => prev.filter(n => n.id !== neoId));
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'overview':
        return { title: 'Mission Control', subtitle: 'Real-time NEO monitoring dashboard' };
      case 'neo-feed':
        return { title: 'NEO Live Feed', subtitle: 'All tracked near-Earth objects' };
      case 'watchlist':
        return { title: 'Your Watchlist', subtitle: 'Asteroids you\'re tracking' };
      case 'alerts':
        return { title: 'Alerts Center', subtitle: 'Notifications and close approach warnings' };
      case '3d-viewer':
        return { title: '3D Orbit Viewer', subtitle: 'Interactive orbital visualization' };
      case 'community':
        return { title: 'Community', subtitle: 'Connect with other space enthusiasts' };
      default:
        return { title: 'Dashboard', subtitle: 'NEO Monitoring System' };
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <StatsCards neoData={neoData} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <NeoFeedTable
                  neoData={neoData}
                  onSelectNeo={handleSelectNeo}
                  onAddToWatchlist={handleAddToWatchlist}
                />
              </div>
              <div>
                <RiskAnalysisPanel neoData={neoData} />
              </div>
            </div>
          </div>
        );

      case 'neo-feed':
        return (
          <NeoFeedTable
            neoData={neoData}
            onSelectNeo={handleSelectNeo}
            onAddToWatchlist={handleAddToWatchlist}
          />
        );

      case 'watchlist':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Watchlist
              watchlist={watchlist}
              onView={handleSelectNeo}
              onRemove={handleRemoveFromWatchlist}
            />
            <RiskAnalysisPanel neoData={neoData} />
          </div>
        );

      case 'alerts':
        return <AlertsPanel />;

      case '3d-viewer':
        return <OrbitViewer />;

      case 'community':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CommunityChat />
            </div>
            <div>
              <Watchlist
                watchlist={watchlist}
                onView={handleSelectNeo}
                onRemove={handleRemoveFromWatchlist}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const viewInfo = getViewTitle();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background gradient effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        user={user}
      />

      {/* Main Content */}
      <main className="ml-[280px] relative z-10 transition-all duration-300">
        <DashboardHeader
          title={viewInfo.title}
          subtitle={viewInfo.subtitle}
          onOpenAlerts={() => setActiveView('alerts')}
          alertCount={3}
        />

        <div className="p-8">
          {renderContent()}
        </div>
      </main>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedNeo && (
          <NeoDetailPanel
            neo={selectedNeo}
            onClose={handleCloseDetail}
            onAddToWatchlist={handleAddToWatchlist}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
