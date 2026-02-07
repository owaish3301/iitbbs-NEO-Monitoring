import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Target } from 'lucide-react';

const RiskAnalysisPanel = ({ neoData }) => {
    const neos = neoData?.neo_objects || [];

    const stats = useMemo(() => {
        const hazardous = neos.filter(n => n.is_potentially_hazardous).length;
        const safe = neos.length - hazardous;

        // Calculate risk score based on hazardous ratio and proximity
        const closestDistance = neos[0]?.close_approach_data?.[0]?.miss_distance?.lunar || 100;
        const hazardousRatio = neos.length > 0 ? hazardous / neos.length : 0;
        const proximityScore = Math.max(0, 100 - closestDistance * 5);
        const riskScore = Math.min(100, Math.round(hazardousRatio * 50 + proximityScore * 0.5));

        return { hazardous, safe, riskScore };
    }, [neos]);

    const pieData = [
        { name: 'Hazardous', value: stats.hazardous, color: '#ef4444' },
        { name: 'Safe', value: stats.safe, color: '#22c55e' },
    ];

    // Top 3 closest approaches
    const closestApproaches = useMemo(() => {
        return neos.slice(0, 3).map(neo => ({
            name: neo.name.replace(/[()]/g, ''),
            distance: neo.close_approach_data[0]?.miss_distance?.lunar?.toFixed(2),
            isHazardous: neo.is_potentially_hazardous,
            date: neo.close_approach_data[0]?.close_approach_date,
        }));
    }, [neos]);

    const getRiskLevel = (score) => {
        if (score < 20) return { label: 'Very Low', color: 'text-green-400', bg: 'bg-green-500' };
        if (score < 40) return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500' };
        if (score < 60) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500' };
        if (score < 80) return { label: 'Elevated', color: 'text-orange-400', bg: 'bg-orange-500' };
        return { label: 'High', color: 'text-red-400', bg: 'bg-red-500' };
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 border border-white/20 p-2 rounded-lg backdrop-blur-md shadow-xl">
                    <p className="text-white font-medium text-sm">{payload[0].name}</p>
                    <p className="text-gray-400 text-xs">Count: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    const riskLevel = getRiskLevel(stats.riskScore);

    return (
        <Card className="bg-white/5 border-white/10 backdrop-blur-md h-[730px] flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    Risk Analysis
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-2">
                {/* Risk Score Gauge */}
                <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                            {/* Background circle */}
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="8"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="url(#riskGradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${stats.riskScore * 2.51} 251`}
                            />
                            <defs>
                                <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#22c55e" />
                                    <stop offset="50%" stopColor="#eab308" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white">{stats.riskScore}</span>
                            <span className="text-xs text-gray-500">/ 100</span>
                        </div>
                    </div>

                    <div className="flex-1">
                        <Badge
                            variant="outline"
                            className={`${riskLevel.color} border-current mb-2`}
                        >
                            {riskLevel.label} Risk
                        </Badge>
                        <p className="text-gray-400 text-sm">
                            Based on {neos.length} tracked objects and proximity analysis
                        </p>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="flex items-center gap-4">
                    <div className="w-28 h-28 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={30}
                                    outerRadius={45}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="text-gray-400 text-sm">Hazardous</span>
                            </div>
                            <span className="text-white font-medium">{stats.hazardous}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-gray-400 text-sm">Safe</span>
                            </div>
                            <span className="text-white font-medium">{stats.safe}</span>
                        </div>
                    </div>
                </div>

                {/* Top 3 Closest */}
                <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Closest Approaches
                    </h4>
                    <div className="space-y-3">
                        {closestApproaches.map((neo, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group"
                            >
                                <div className={`p-3 rounded-lg border transition-all duration-300 ${neo.isHazardous
                                    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${neo.isHazardous ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'}`}>
                                                #{index + 1}
                                            </span>
                                            <p className="text-white text-sm font-medium">
                                                {neo.name}
                                            </p>
                                        </div>
                                        {neo.isHazardous && (
                                            <div className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span>Distance</span>
                                        <span className="text-white">{neo.distance} LD</span>
                                    </div>

                                    {/* Distance Bar Visual */}
                                    <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${neo.isHazardous ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}
                                            style={{ width: `${Math.max(10, 100 - (parseFloat(neo.distance) * 2))}%` }}
                                        />
                                    </div>
                                    <p className="text-right text-[10px] text-gray-600 mt-1">{neo.date}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default RiskAnalysisPanel;
