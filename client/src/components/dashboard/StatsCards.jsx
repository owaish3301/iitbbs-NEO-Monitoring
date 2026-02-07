import { motion } from 'framer-motion';
import { Radar, AlertTriangle, Target, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const StatsCards = ({ neoData }) => {
    const totalNeos = neoData?.neo_objects?.length || 0;
    const hazardousCount = neoData?.neo_objects?.filter(n => n.is_potentially_hazardous)?.length || 0;

    // Find closest approach
    const closestNeo = neoData?.neo_objects?.[0];
    const closestDistance = closestNeo?.close_approach_data?.[0]?.miss_distance?.lunar?.toFixed(2) || '—';

    // Calculate average velocity
    const avgVelocity = neoData?.neo_objects?.length > 0
        ? (neoData.neo_objects.reduce((acc, neo) =>
            acc + (neo.close_approach_data?.[0]?.relative_velocity?.km_per_sec || 0), 0
        ) / neoData.neo_objects.length).toFixed(1)
        : '—';

    const stats = [
        {
            label: 'Hazardous Objects',
            value: hazardousCount,
            icon: AlertTriangle,
            color: 'red',
            gradient: 'from-red-500 to-orange-600',
            bgGlow: 'bg-red-500/20',
            description: hazardousCount > 0 ? 'Requires monitoring' : 'All clear',
            alert: hazardousCount > 0,
        },
        {
            label: 'Total NEOs Tracked',
            value: totalNeos,
            icon: Radar,
            color: 'cyan',
            gradient: 'from-cyan-500 to-blue-600',
            bgGlow: 'bg-cyan-500/20',
            description: 'This week',
        },

        {
            label: 'Closest Approach',
            value: `${closestDistance} LD`,
            icon: Target,
            color: 'purple',
            gradient: 'from-purple-500 to-pink-600',
            bgGlow: 'bg-purple-500/20',
            description: closestNeo?.name?.replace(/[()]/g, '') || 'No data',
        },
        {
            label: 'Avg. Velocity',
            value: `${avgVelocity} km/s`,
            icon: Zap,
            color: 'yellow',
            gradient: 'from-yellow-500 to-amber-600',
            bgGlow: 'bg-yellow-500/20',
            description: 'Relative to Earth',
        },
    ];

    return (
        <div className="space-y-4">
            {/* Section Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Mission Overview</h2>
                    <p className="text-sm text-gray-500">Real-time tracking statistics</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Data synced
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;

                    return (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="bg-white/5 border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 overflow-hidden relative group h-full">
                                {/* Glow Effect */}
                                <div className={`absolute inset-0 ${stat.bgGlow} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`} />

                                {/* Alert pulse for hazardous */}
                                {stat.alert && (
                                    <div className="absolute top-3 right-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    </div>
                                )}

                                <CardContent className="p-6 relative">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-3xl font-bold text-white">
                                            {stat.value}
                                        </p>
                                        <p className="text-sm text-gray-400">{stat.label}</p>
                                        <p className="text-xs text-gray-500">{stat.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatsCards;
