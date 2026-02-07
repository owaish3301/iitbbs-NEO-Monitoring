import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    BellRing,
    Check,
    Clock,
    AlertTriangle,
    Trash2,
    Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteAlertById, markAlertAsRead, markAllAlertsAsRead } from '@/services/api';

const AlertsPanel = ({ alerts: initialAlerts = [], setAlerts: setParentAlerts }) => {
    const [alerts, setLocalAlerts] = useState(initialAlerts);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        setLocalAlerts(initialAlerts);
    }, [initialAlerts]);

    const unreadCount = alerts.filter(a => !a.read).length;

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'unread') return !alert.read;
        if (filter === 'high') return alert.priority === 'high';
        return true;
    });

    const markAsRead = async (id) => {
        const existing = alerts.find(a => a.id === id);
        if (!existing || existing.read) return;

        const previous = alerts;
        const updated = alerts.map(a => a.id === id ? { ...a, read: true } : a);
        setLocalAlerts(updated);
        setParentAlerts?.(updated);

        try {
            await markAlertAsRead(id);
        } catch (err) {
            console.error('Failed to mark alert as read:', err);
            setLocalAlerts(previous);
            setParentAlerts?.(previous);
        }
    };

    const deleteAlert = async (id) => {
        const previous = alerts;
        const updated = alerts.filter(a => a.id !== id);
        setLocalAlerts(updated);
        setParentAlerts?.(updated);

        try {
            await deleteAlertById(id);
        } catch (err) {
            console.error('Failed to delete alert:', err);
            setLocalAlerts(previous);
            setParentAlerts?.(previous);
        }
    };

    const markAllRead = async () => {
        const unreadIds = alerts.filter(a => !a.read).map(a => a.id);
        if (unreadIds.length === 0) return;

        const previous = alerts;
        const updated = alerts.map(a => ({ ...a, read: true }));
        setLocalAlerts(updated);
        setParentAlerts?.(updated);

        try {
            await markAllAlertsAsRead(unreadIds);
        } catch (err) {
            console.error('Failed to mark all alerts as read:', err);
            setLocalAlerts(previous);
            setParentAlerts?.(previous);
        }
    };

    const getAlertIcon = (type) => {
        switch (type) {
            case 'close_approach':
                return <AlertTriangle className="w-4 h-4" />;
            case 'watchlist':
                return <Bell className="w-4 h-4" />;
            case 'hazardous':
                return <BellRing className="w-4 h-4" />;
            default:
                return <Bell className="w-4 h-4" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'text-red-400 bg-red-500/20';
            case 'medium':
                return 'text-yellow-400 bg-yellow-500/20';
            default:
                return 'text-gray-400 bg-gray-500/20';
        }
    };

    return (
        <Card className="bg-white/5 border-white/10 overflow-hidden max-w-full">
            <CardHeader className="pb-4 relative">
                {/* Title + Action */}
                <div className="flex items-start sm:items-center justify-between gap-2">
                    {/* Title */}
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                        <Bell className="w-5 h-5 text-cyan-400 shrink-0" />
                        <span className="whitespace-nowrap">Alerts & Notifications</span>
                        {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs">
                                {unreadCount} new
                            </Badge>
                        )}
                    </CardTitle>

                    {/* Mark all read */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={markAllRead}
                        className="
        text-gray-400 hover:text-white text-xs
        whitespace-nowrap
        sm:self-center
      "
                    >
                        <Check className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Mark all read</span>
                        <span className="sm:hidden">Mark read</span>
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <div className="flex flex-wrap gap-1 bg-white/5 rounded-lg p-1">
                        <Button
                            size="sm"
                            variant={filter === 'all' ? 'default' : 'ghost'}
                            onClick={() => setFilter('all')}
                            className={`h-7 px-3 ${filter === 'all' ? 'bg-white/10' : 'text-gray-400'
                                }`}
                        >
                            All
                        </Button>

                        <Button
                            size="sm"
                            variant={filter === 'unread' ? 'default' : 'ghost'}
                            onClick={() => setFilter('unread')}
                            className={`h-7 px-3 ${filter === 'unread' ? 'bg-white/10' : 'text-gray-400'
                                }`}
                        >
                            Unread
                        </Button>

                        <Button
                            size="sm"
                            variant={filter === 'high' ? 'default' : 'ghost'}
                            onClick={() => setFilter('high')}
                            className={`h-7 px-3 ${filter === 'high'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'text-gray-400'
                                }`}
                        >
                            High Priority
                        </Button>
                    </div>
                </div>
            </CardHeader>


            <CardContent>
                {filteredAlerts.length === 0 ? (
                    <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500">No alerts to show</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredAlerts.map((alert, index) => (
                                <motion.div
                                    key={alert.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`p-4 rounded-xl border transition-all ${alert.read
                                        ? 'bg-white/5 border-white/5'
                                        : 'bg-white/10 border-cyan-500/30'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${getPriorityColor(alert.priority)}`}>
                                            {getAlertIcon(alert.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`font-medium text-sm ${alert.read ? 'text-gray-400' : 'text-white'}`}>
                                                    {alert.title}
                                                </h4>
                                                {!alert.read && (
                                                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-sm mb-2">{alert.message}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                                <Clock className="w-3 h-3" />
                                                <span>{alert.date} at {alert.time}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {!alert.read && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => markAsRead(alert.id)}
                                                    className="text-gray-400 hover:text-green-400 h-8 px-2"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteAlert(alert.id)}
                                                className="text-gray-400 hover:text-red-400 h-8 px-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AlertsPanel;
