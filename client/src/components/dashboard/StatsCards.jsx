import { motion } from 'framer-motion';
import { Radar, AlertTriangle, Target, Zap, TrendingUp } from 'lucide-react';
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
            label: 'Hazardous',
            value: hazardousCount,
            icon: AlertTriangle,
            color: 'red',
            gradient: 'from-red-500 via-orange-500 to-red-500',
            iconColor: 'text-red-400',
            bgHighlight: 'bg-red-500/10',
            description: hazardousCount > 0 ? 'Action Required' : 'Safe',
            alert: hazardousCount > 0,
            shineGradient: 'bg-gradient-to-r from-transparent via-red-500 to-transparent',
            borderColor: 'group-hover:border-red-500/50'
        },
        {
            label: 'Total NEOs',
            value: totalNeos,
            icon: Radar,
            color: 'cyan',
            gradient: 'from-cyan-500 via-blue-500 to-cyan-500',
            iconColor: 'text-cyan-400',
            bgHighlight: 'bg-cyan-500/10',
            description: 'Tracked Today',
            shineGradient: 'bg-gradient-to-r from-transparent via-cyan-500 to-transparent',
            borderColor: 'group-hover:border-cyan-500/50'
        },
        {
            label: 'Closest',
            value: `${closestDistance} LD`,
            icon: Target,
            color: 'purple',
            gradient: 'from-purple-500 via-pink-500 to-purple-500',
            iconColor: 'text-purple-400',
            bgHighlight: 'bg-purple-500/10',
            description: closestNeo?.name?.replace(/[()]/g, '') || '—',
            shineGradient: 'bg-gradient-to-r from-transparent via-purple-500 to-transparent',
            borderColor: 'group-hover:border-purple-500/50'
        },
        {
            label: 'Velocity',
            value: `${avgVelocity} km/s`,
            icon: Zap,
            color: 'yellow',
            gradient: 'from-yellow-500 via-amber-500 to-yellow-500',
            iconColor: 'text-yellow-400',
            bgHighlight: 'bg-yellow-500/10',
            description: 'Average Speed',
            shineGradient: 'bg-gradient-to-r from-transparent via-yellow-500 to-transparent',
            borderColor: 'group-hover:border-yellow-500/50'
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Mission Overview</h2>
                    <p className="text-sm text-gray-500">System Status: Nominal</p>
                </div>
                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-gray-400 font-mono">
                    SYNCED
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden">
                {stats.map((stat, index) => (
                    <BorderBeamCard key={stat.label} stat={stat} index={index} />
                ))}
            </div>
        </div>
    );
};

const BorderBeamCard = ({ stat, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="group relative h-full"
        >
            {/* Moving Border Gradient Container */}
            <div className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} animate-gradient-xy opacity-50 blur-sm top-0 left-0 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2`} />
            </div>

            <div className={`absolute inset-0 rounded-xl border border-white/10 ${stat.borderColor} transition-colors duration-300 pointer-events-none`} />

            {/* Main Card Content */}
            <div className="relative h-full bg-black/40 backdrop-blur-xl rounded-xl p-5 flex flex-col justify-between overflow-hidden">

                {/* Subtle Background Gradient for Depth */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bgHighlight} blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-20 transition-opacity duration-700`} />

                {/* Icon & Label */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className={`p-2.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors ${stat.iconColor}`}>
                        <stat.icon className="w-5 h-5" />
                    </div>
                    {stat.alert && (
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Data */}
                <div className="relative z-10">
                    <div className="text-2xl font-bold text-white tracking-tight mb-1 group-hover:scale-105 transition-transform duration-300 origin-left">
                        {stat.value}
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                            {stat.label}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-600 group-hover:text-gray-500 font-mono transition-colors">
                            {stat.description}
                        </p>
                    </div>
                </div>

                {/* Bottom Shine Line */}
                <div className={`absolute bottom-0 left-0 h-[1px] w-0 group-hover:w-full ${stat.shineGradient} transition-all duration-700 ease-out opacity-70`} />
            </div>
        </motion.div>
    );
};

export default StatsCards;
