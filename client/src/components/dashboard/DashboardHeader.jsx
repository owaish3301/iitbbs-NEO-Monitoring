import { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DashboardHeader = ({ title, subtitle, onRefresh, onOpenAlerts, alertCount = 3 }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Real-time clock update every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

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
        second: '2-digit',
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
        <header className="flex items-center justify-between py-6 px-8 border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white">{title}</h1>
                    <Badge
                        variant="outline"
                        className="bg-green-500/20 border-green-500/50 text-green-400 gap-1.5"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        LIVE
                    </Badge>
                </div>
                <p className="text-gray-400 text-sm">{subtitle}</p>
            </div>

            <div className="flex items-center gap-6">
                {/* Date & Time Display */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-300">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-gray-300 tabular-nums">{timeStr}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-8 bg-white/10" />

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
};

export default DashboardHeader;
