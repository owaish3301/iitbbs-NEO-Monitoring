import { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { fetchNeoFeed, fetchAlerts } from '@/services/api';

const getDateRange = () => {
  const today = new Date();
  const start = today.toISOString().split('T')[0];
  const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  return { start, end };
};

const DashboardLayout = () => {
  const [activeView, setActiveView] = useState('overview');
  const [neoData, setNeoData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedNeo, setSelectedNeo] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { session } = useAuth();

  // Derive user info from Supabase session
  const user = session?.user
    ? {
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Explorer',
        email: session.user.email,
        avatar: session.user.user_metadata?.avatar_url || null,
      }
    : { name: 'Space Explorer', email: 'explorer@skynetics.com', avatar: null };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { start, end } = getDateRange();

      const [feedData, alertsData] = await Promise.all([
        fetchNeoFeed(start, end),
        fetchAlerts(start, end),
      ]);

      setNeoData(feedData);
      setAlerts(alertsData.alerts || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectNeo = (neo) => {
    setSelectedNeo(neo);
  };

  const handleCloseDetail = () => {
    setSelectedNeo(null);
  };

  const handleAddToWatchlist = (neo) => {
    setWatchlist(prev => {
      if (prev.find(n => n.id === neo.id)) {
        return prev;
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
    if (loading && !neoData) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading NEO data from NASA...</p>
          </div>
        </div>
      );
    }

    if (error && !neoData) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-400 mb-4">Failed to load data: {error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

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
        return <AlertsPanel alerts={alerts} setAlerts={setAlerts} />;

      case '3d-viewer':
        return <OrbitViewer />;

      case 'community':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CommunityChat />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const viewInfo = getViewTitle();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Background gradient effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-150 h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setIsMobileMenuOpen(false);
        }}
        user={user}
        collapsed={isSidebarCollapsed}
        setCollapsed={setIsSidebarCollapsed}
        mobileOpen={isMobileMenuOpen}
        setMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content */}
      <main
        className={`relative z-10 transition-all duration-300 ml-0 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-[280px]'
          }`}
      >
        <DashboardHeader
          title={viewInfo.title}
          subtitle={viewInfo.subtitle}
          onOpenAlerts={() => setActiveView('alerts')}
          alertCount={alerts.filter(a => !a.read).length}
          onRefresh={loadData}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          sidebarCollapsed={isSidebarCollapsed}
        />

        <div className="p-4 md:p-8 overflow-x-hidden max-w-full">
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
