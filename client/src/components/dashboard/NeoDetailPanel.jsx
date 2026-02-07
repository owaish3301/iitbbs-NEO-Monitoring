import { motion } from 'framer-motion';
import {
    X,
    ExternalLink,
    Star,
    Bell,
    AlertTriangle,
    Ruler,
    Zap,
    Target,
    Calendar,
    Globe2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const NeoDetailPanel = ({ neo, onClose, onAddToWatchlist, onSetAlert }) => {
    if (!neo) return null;

    const approach = neo.close_approach_data[0];
    const isHazardous = neo.is_potentially_hazardous;

    const details = [
        {
            label: 'Diameter',
            value: `${neo.estimated_diameter.min_m.toFixed(0)} - ${neo.estimated_diameter.max_m.toFixed(0)} m`,
            icon: Ruler,
        },
        {
            label: 'Velocity',
            value: `${approach?.relative_velocity?.km_per_sec?.toFixed(2)} km/s`,
            icon: Zap,
        },
        {
            label: 'Miss Distance',
            value: `${approach?.miss_distance?.lunar?.toFixed(2)} LD`,
            subValue: `${(approach?.miss_distance?.kilometers / 1000000)?.toFixed(2)}M km`,
            icon: Target,
        },
        {
            label: 'Close Approach Date',
            value: approach?.close_approach_date_full?.replace(' ', ' at ') || approach?.close_approach_date,
            icon: Calendar,
        },
        {
            label: 'Orbiting Body',
            value: approach?.orbiting_body || 'Earth',
            icon: Globe2,
        },
        {
            label: 'Absolute Magnitude',
            value: neo.absolute_magnitude_h?.toFixed(2) + ' H',
            icon: Star,
        },
    ];

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 z-50"
            />

            {/* Panel */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 h-full w-full max-w-md bg-black/95 border-l border-white/10 z-50 overflow-y-auto"
            >
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                {isHazardous && (
                                    <Badge className="bg-red-500/20 border-red-500/50 text-red-400">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Hazardous
                                    </Badge>
                                )}
                                {neo.is_sentry_object && (
                                    <Badge className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400">
                                        Sentry
                                    </Badge>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                {neo.name.replace(/[()]/g, '')}
                            </h2>
                            <p className="text-gray-500 text-sm">ID: {neo.id}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Orbital Preview Placeholder */}
                    <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-xl border border-white/10 mb-6 flex items-center justify-center">
                        <div className="text-center">
                            <Globe2 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">3D Orbit Visualization</p>
                            <p className="text-gray-600 text-xs">Coming Soon</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mb-6">
                        <Button
                            onClick={() => onAddToWatchlist?.(neo)}
                            className="flex-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                        >
                            <Star className="w-4 h-4 mr-2" />
                            Add to Watchlist
                        </Button>
                        <Button
                            onClick={() => onSetAlert?.(neo)}
                            className="flex-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30"
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Set Alert
                        </Button>
                    </div>

                    <Separator className="bg-white/10 mb-6" />

                    {/* Details */}
                    <h3 className="text-lg font-semibold text-white mb-4">Orbital Data</h3>
                    <div className="space-y-4">
                        {details.map((detail, index) => {
                            const Icon = detail.icon;
                            return (
                                <motion.div
                                    key={detail.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-start gap-4 p-3 rounded-lg bg-white/5"
                                >
                                    <div className="p-2 rounded-lg bg-white/10">
                                        <Icon className="w-4 h-4 text-cyan-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-400 text-sm">{detail.label}</p>
                                        <p className="text-white font-medium">{detail.value}</p>
                                        {detail.subValue && (
                                            <p className="text-gray-500 text-xs">{detail.subValue}</p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <Separator className="bg-white/10 my-6" />

                    {/* NASA Link */}
                    <Button
                        variant="outline"
                        asChild
                        className="w-full border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                    >
                        <a href={neo.nasa_jpl_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on NASA JPL
                        </a>
                    </Button>
                </div>
            </motion.div>
        </>
    );
};

export default NeoDetailPanel;
