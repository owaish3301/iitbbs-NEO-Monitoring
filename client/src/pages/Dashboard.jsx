import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsCards from '@/components/dashboard/StatsCards';
import NeoFeedTable from '@/components/dashboard/NeoFeedTable';
import RiskAnalysisPanel from '@/components/dashboard/RiskAnalysisPanel';
import NeoDetailPanel from '@/components/dashboard/NeoDetailPanel';
import Watchlist from '@/components/dashboard/Watchlist';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import { useAuth } from '@/context/AuthContext';
import { useWatchlist } from '@/context/WatchlistContext';
import { fetchNeoFeed, fetchAlerts, fetchNeoSummary } from '@/services/api';

// ─── Lazy-load watchlist 3D viewer ───────────────────────
const WatchlistOrbitViewer3D = lazy(() => import('@/components/dashboard/WatchlistOrbitViewer3D'));

// ─── Lazy-load heavy dashboard views ─────────────────────
const OrbitViewer = lazy(() => import('@/components/dashboard/OrbitViewer'));
const CommunityChat = lazy(() => import('@/components/dashboard/CommunityChat'));

// ─── Inline loading fallback for lazy panels ─────────────
const PanelLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

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
  const [riskSummary, setRiskSummary] = useState(null);
  const [selectedNeo, setSelectedNeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const { session } = useAuth();
  const { watchlistItems, addToWatchlist, removeFromWatchlist, toggleWatchlist, isInWatchlist } = useWatchlist();

  // Derive user info from Supabase session — memoised to keep stable reference
  const user = useMemo(() => {
    if (session?.user) {
      return {
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Explorer',
        email: session.user.email,
        avatar: session.user.user_metadata?.avatar_url || null,
      };
    }
    return { name: 'Space Explorer', email: 'explorer@skynetics.com', avatar: null };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, session?.user?.email, session?.user?.user_metadata?.full_name, session?.user?.user_metadata?.avatar_url]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [watchlist3DItems, setWatchlist3DItems] = useState(null);

  const loadData = useCallback(async (isPageChange = false) => {
    try {
      if (isPageChange) {
        setPageLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const { start, end } = getDateRange();

      const [feedData, alertsData, summaryData] = await Promise.all([
        fetchNeoFeed(start, end, { page, limit: pageSize }),
        fetchAlerts(start, end),
        fetchNeoSummary(start, end),
      ]);

      setNeoData(feedData);
      setAlerts(alertsData.alerts || []);
      setRiskSummary(summaryData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [page, pageSize]);

  // Only run initial load once on mount
  useEffect(() => {
    loadData(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track whether this is a page change vs initial load
  const isFirstLoad = !neoData;

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // When page changes (but not initial mount), trigger a page-change load
  useEffect(() => {
    if (!isFirstLoad) {
      loadData(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSelectNeo = useCallback((neo) => {
    setSelectedNeo(neo);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedNeo(null);
  }, []);

  const handleAddToWatchlist = useCallback((neo) => {
    toggleWatchlist(neo).catch(() => {});
  }, [toggleWatchlist]);

  const handleRemoveFromWatchlist = useCallback((neoId) => {
    removeFromWatchlist(neoId).catch(() => {});
  }, [removeFromWatchlist]);

  // Stable callback for Sidebar — avoids recreating on every render
  const handleSetActiveView = useCallback((view) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  }, []);

  const handleOpenAlerts = useCallback(() => setActiveView('alerts'), []);
  const handleMenuClick = useCallback(() => setIsMobileMenuOpen(true), []);

  const handleViewAllWatchlist3D = useCallback((enrichedItems) => {
    setWatchlist3DItems(enrichedItems);
  }, []);

  const handleCloseWatchlist3D = useCallback(() => {
    setWatchlist3DItems(null);
  }, []);

  // Memoised view title — only recalculated when activeView changes
  const viewInfo = useMemo(() => {
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
  }, [activeView]);

  // Memoised unread count — avoids .filter() on every render
  const unreadAlertCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);

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
                  page={page}
                  onPageChange={handlePageChange}
                  loading={pageLoading}
                />
              </div>
              <div>
                <RiskAnalysisPanel neoData={neoData} riskSummary={riskSummary} />
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
            page={page}
            onPageChange={handlePageChange}
            loading={pageLoading}
          />
        );

      case 'watchlist':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Watchlist
              onView={handleSelectNeo}
              onViewAll3D={handleViewAllWatchlist3D}
              neoData={neoData}
            />
            <RiskAnalysisPanel neoData={neoData} riskSummary={riskSummary} />
          </div>
        );

      case 'alerts':
        return <AlertsPanel alerts={alerts} setAlerts={setAlerts} />;

      case '3d-viewer':
        return (
          <Suspense fallback={<PanelLoader />}>
            <OrbitViewer neoData={neoData} onSelectNeo={handleSelectNeo} />
          </Suspense>
        );

      case 'community':
        return (
          <Suspense fallback={<PanelLoader />}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CommunityChat />
              </div>
            </div>
          </Suspense>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Background gradient effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-150 h-[600px] bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-3xl" />
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={handleSetActiveView}
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
          onOpenAlerts={handleOpenAlerts}
          alertCount={unreadAlertCount}
          onRefresh={loadData}
          onMenuClick={handleMenuClick}
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

      {/* Watchlist 3D Viewer Overlay */}
      <AnimatePresence>
        {watchlist3DItems && (
          <Suspense fallback={<PanelLoader />}>
            <WatchlistOrbitViewer3D
              watchlistNeos={watchlist3DItems}
              onClose={handleCloseWatchlist3D}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
