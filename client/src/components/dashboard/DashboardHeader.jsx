import { useState, useEffect, memo } from 'react';
import { Bell, Clock, Calendar, RefreshCw, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DashboardHeader = memo(({ title, subtitle, onRefresh, onOpenAlerts, alertCount = 3, onMenuClick, sidebarCollapsed = false }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Scroll detection for sticky header
    useEffect(() => {
        const handleScroll = () => {
            const scrollThreshold = 50; // pixels to scroll before header becomes sticky
            setIsScrolled(window.scrollY > scrollThreshold);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Real-time clock update every 10 seconds (second-precision unnecessary)
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 10_000);

        return () => clearInterval(timer);
    }, []);

    const dateStr = currentTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const timeStr = currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (onRefresh) {
            await onRefresh();
        }
        // Simulate refresh delay if no handler
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleNotificationClick = () => {
        if (onOpenAlerts) {
            onOpenAlerts();
        }
    };

    return (
        <header className={`flex items-center justify-between py-4 px-4 md:py-6 md:px-8 border-b border-white/10 backdrop-blur-sm top-0 z-20 transition-all duration-300 right-0 ${isScrolled
                ? `fixed bg-black/95 shadow-lg shadow-black/30 left-0 ${sidebarCollapsed ? 'md:left-20' : 'md:left-[280px]'}`
                : 'bg-black/20'
            }`}>
            <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="md:hidden text-gray-400 hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </Button>

                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
                        <Badge
                            variant="outline"
                            className="bg-green-500/20 border-green-500/50 text-green-400 gap-1.5 hidden sm:flex"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            LIVE
                        </Badge>
                    </div>
                    <p className="text-gray-400 text-xs md:text-sm">{subtitle}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-6">
                {/* Date & Time Display */}
                <div className="hidden lg:flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-300">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono cursor-pointer hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-gray-300 tabular-nums">{timeStr}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px h-8 bg-white/10" />

                {/* Refresh Data Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="hidden sm:flex gap-2 border-white/10 text-gray-900 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 disabled:opacity-50 cursor-pointer transition-all duration-300 ease-in"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>

                {/* Notifications */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNotificationClick}
                    className="relative text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all duration-200"
                >
                    <Bell className="w-5 h-5" />
                    {alertCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold animate-pulse">
                            {alertCount}
                        </span>
                    )}
                </Button>
            </div>
        </header>
    );
});

DashboardHeader.displayName = 'DashboardHeader';
export default DashboardHeader;
