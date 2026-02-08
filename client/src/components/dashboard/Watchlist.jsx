import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Eye, Bell, BellOff, Trash2, AlertTriangle, Rocket, Globe, GitCompare, X, Zap, Ruler, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWatchlist } from '@/context/WatchlistContext';
import { fetchNeoLookup } from '@/services/api';

const Watchlist = ({ onView, onViewAll3D, neoData }) => {
    const { watchlistItems, removeFromWatchlist, loading, hasAlert, toggleAlert } = useWatchlist();
    const [lookedUpNeos, setLookedUpNeos] = useState({});
    const [lookupLoading, setLookupLoading] = useState(false);
    const [compareIds, setCompareIds] = useState(new Set());
    const [showComparison, setShowComparison] = useState(false);

    // Toggle comparison selection
    const toggleCompare = (neoId) => {
        setCompareIds(prev => {
            const next = new Set(prev);
            if (next.has(neoId)) {
                next.delete(neoId);
            } else if (next.size < 3) {
                next.add(neoId);
            }
            return next;
        });
    };

    const clearComparison = () => {
        setCompareIds(new Set());
        setShowComparison(false);
    };

    // Build a set of NEO IDs present in the current feed
    const feedNeoIds = useMemo(() => {
        const ids = new Set();
        for (const neo of (neoData?.neo_objects || [])) {
            ids.add(String(neo.id));
        }
        return ids;
    }, [neoData]);

    // Fetch lookup data for watchlist NEOs that aren't in the live feed
    useEffect(() => {
        const missingIds = watchlistItems
            .map(item => String(item.neo_id))
            .filter(id => !feedNeoIds.has(id) && !lookedUpNeos[id]);

        if (missingIds.length === 0) return;

        let cancelled = false;
        setLookupLoading(true);

        const fetchMissing = async () => {
            const results = {};
            for (let i = 0; i < missingIds.length; i += 5) {
                const batch = missingIds.slice(i, i + 5);
                const settled = await Promise.allSettled(
                    batch.map(id => fetchNeoLookup(id))
                );
                for (let j = 0; j < batch.length; j++) {
                    const r = settled[j];
                    if (r.status === 'fulfilled' && r.value) {
                        const raw = r.value.raw || {};
                        const neoBasic = r.value.neo || {};
                        results[batch[j]] = {
                            id: raw.id || batch[j],
                            name: raw.name || neoBasic.name || batch[j],
                            is_potentially_hazardous: !!raw.is_potentially_hazardous_asteroid,
                            absolute_magnitude_h: raw.absolute_magnitude_h,
                            estimated_diameter: {
                                min_m: raw.estimated_diameter?.meters?.estimated_diameter_min || 0,
                                max_m: raw.estimated_diameter?.meters?.estimated_diameter_max || 0,
                            },
                            close_approach_data: (raw.close_approach_data || []).map(ca => ({
                                close_approach_date: ca.close_approach_date,
                                close_approach_date_full: ca.close_approach_date_full,
                                relative_velocity: {
                                    km_per_sec: Number(ca.relative_velocity?.kilometers_per_second) || 0,
                                },
                                miss_distance: {
                                    lunar: Number(ca.miss_distance?.lunar) || 0,
                                    kilometers: Number(ca.miss_distance?.kilometers) || 0,
                                },
                                orbiting_body: ca.orbiting_body || 'Earth',
                            })),
                            _fromLookup: true,
                        };
                    }
                }
            }
            if (!cancelled) {
                setLookedUpNeos(prev => ({ ...prev, ...results }));
                setLookupLoading(false);
            }
        };

        fetchMissing();
        return () => { cancelled = true; };
    }, [watchlistItems, feedNeoIds]);

    // Enrich watchlist items with live NEO data OR looked-up data
    const enrichedWatchlist = useMemo(() => {
        const neoMap = new Map();
        const neos = neoData?.neo_objects || [];
        for (const neo of neos) {
            neoMap.set(String(neo.id), neo);
        }

        return watchlistItems.map((item) => {
            const id = String(item.neo_id);
            const liveNeo = neoMap.get(id);
            if (liveNeo) {
                return { ...liveNeo, _watchlistDbId: item.id, _addedAt: item.added_at };
            }
            const looked = lookedUpNeos[id];
            if (looked) {
                return { ...looked, _watchlistDbId: item.id, _addedAt: item.added_at };
            }
            return {
                id: item.neo_id,
                name: item.neo_name,
                is_potentially_hazardous: false,
                close_approach_data: [],
                estimated_diameter: { min_m: 0, max_m: 0 },
                _watchlistDbId: item.id,
                _addedAt: item.added_at,
                _noLiveData: true,
            };
        });
    }, [watchlistItems, neoData, lookedUpNeos]);

    // Get NEOs selected for comparison
    const comparedNeos = useMemo(() => {
        return enrichedWatchlist.filter(neo => compareIds.has(neo.id));
    }, [enrichedWatchlist, compareIds]);

    const isEmpty = enrichedWatchlist.length === 0;

    // Comparison Panel Component
    const ComparisonPanel = () => {
        if (comparedNeos.length < 2) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-6 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <GitCompare className="w-4 h-4 text-cyan-400" />
                        Comparison Mode
                    </h3>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearComparison}
                        className="text-gray-400 hover:text-white h-7 px-2"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-2 px-3 text-gray-400 font-medium">Property</th>
                                {comparedNeos.map(neo => (
                                    <th key={neo.id} className="text-center py-2 px-3 text-white font-medium min-w-[120px]">
                                        {(neo.name || '').replace(/[()]/g, '').slice(0, 15)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Status */}
                            <tr className="border-b border-white/5">
                                <td className="py-2 px-3 text-gray-400 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" /> Status
                                </td>
                                {comparedNeos.map(neo => (
                                    <td key={neo.id} className="text-center py-2 px-3">
                                        <Badge
                                            variant="outline"
                                            className={neo.is_potentially_hazardous
                                                ? 'bg-red-500/20 border-red-500/50 text-red-400 text-xs'
                                                : 'bg-green-500/20 border-green-500/50 text-green-400 text-xs'
                                            }
                                        >
                                            {neo.is_potentially_hazardous ? 'Hazardous' : 'Safe'}
                                        </Badge>
                                    </td>
                                ))}
                            </tr>
                            {/* Diameter */}
                            <tr className="border-b border-white/5">
                                <td className="py-2 px-3 text-gray-400 flex items-center gap-2">
                                    <Ruler className="w-3 h-3" /> Diameter
                                </td>
                                {comparedNeos.map(neo => (
                                    <td key={neo.id} className="text-center py-2 px-3 text-white">
                                        {neo.estimated_diameter?.max_m
                                            ? `${neo.estimated_diameter.min_m.toFixed(0)}-${neo.estimated_diameter.max_m.toFixed(0)}m`
                                            : '—'}
                                    </td>
                                ))}
                            </tr>
                            {/* Velocity */}
                            <tr className="border-b border-white/5">
                                <td className="py-2 px-3 text-gray-400 flex items-center gap-2">
                                    <Zap className="w-3 h-3" /> Velocity
                                </td>
                                {comparedNeos.map(neo => {
                                    const vel = neo.close_approach_data?.[0]?.relative_velocity?.km_per_sec;
                                    return (
                                        <td key={neo.id} className="text-center py-2 px-3 text-white">
                                            {vel ? `${vel.toFixed(2)} km/s` : '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                            {/* Distance */}
                            <tr className="border-b border-white/5">
                                <td className="py-2 px-3 text-gray-400 flex items-center gap-2">
                                    <Navigation className="w-3 h-3" /> Distance
                                </td>
                                {comparedNeos.map(neo => {
                                    const dist = neo.close_approach_data?.[0]?.miss_distance?.lunar;
                                    return (
                                        <td key={neo.id} className="text-center py-2 px-3 text-white">
                                            {dist ? `${dist.toFixed(2)} LD` : '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                            {/* Approach Date */}
                            <tr>
                                <td className="py-2 px-3 text-gray-400">Approach</td>
                                {comparedNeos.map(neo => (
                                    <td key={neo.id} className="text-center py-2 px-3 text-cyan-400 text-xs">
                                        {neo.close_approach_data?.[0]?.close_approach_date || '—'}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </motion.div>
        );
    };

    return (
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        Your Watchlist
                    </div>
                    <div className="flex items-center gap-2">
                        {compareIds.size >= 2 && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowComparison(!showComparison)}
                                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2 text-xs"
                            >
                                <GitCompare className="w-3.5 h-3.5 mr-1" />
                                {showComparison ? 'Hide' : 'Compare'} ({compareIds.size})
                            </Button>
                        )}
                        {!isEmpty && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewAll3D?.(enrichedWatchlist)}
                                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2 text-xs"
                            >
                                <Globe className="w-3.5 h-3.5 mr-1" />
                                View All 3D
                            </Button>
                        )}
                        {!isEmpty && (
                            <Badge variant="outline" className="text-gray-400 border-white/10">
                                {enrichedWatchlist.length} tracked
                            </Badge>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent>
                {/* Comparison Panel */}
                <AnimatePresence>
                    {showComparison && <ComparisonPanel />}
                </AnimatePresence>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : isEmpty ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                    >
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <Rocket className="w-8 h-8 text-gray-600" />
                        </div>
                        <h3 className="text-white font-medium mb-2">No asteroids tracked</h3>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">
                            Start tracking asteroids by clicking the star icon on any NEO in the feed.
                        </p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                            {enrichedWatchlist.map((neo, index) => {
                                const approach = neo.close_approach_data?.[0];
                                const isHazardous = neo.is_potentially_hazardous;
                                const isSelected = compareIds.has(neo.id);
                                const hasData = !neo._noLiveData || neo._fromLookup;

                                return (
                                    <motion.div
                                        key={neo.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, x: -100 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`p-4 rounded-xl transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-white/5 hover:-translate-y-0.5 ${isHazardous
                                            ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/40 hover:shadow-red-500/10'
                                            : 'bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20'
                                            } ${isSelected ? 'ring-2 ring-cyan-400/50 bg-cyan-500/5' : ''}`}
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {isHazardous && (
                                                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <h4 className="text-white font-medium text-sm truncate">
                                                        {(neo.name || '').replace(/[()]/g, '')}
                                                    </h4>
                                                    <p className="text-gray-500 text-xs truncate">
                                                        {approach?.close_approach_date
                                                            || (neo._noLiveData && lookupLoading ? 'Loading...'
                                                                : neo._noLiveData ? 'No data'
                                                                    : 'Unknown')}
                                                    </p>
                                                </div>
                                            </div>
                                            {hasData && (
                                                <Badge
                                                    variant="outline"
                                                    className={`flex-shrink-0 text-[10px] px-1.5 ${isHazardous
                                                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                                        : 'bg-green-500/20 border-green-500/50 text-green-400'
                                                        }`}
                                                >
                                                    {isHazardous ? 'Hazard' : 'Safe'}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Stats Row */}
                                        {approach && (
                                            <div className="flex items-center gap-3 text-xs mb-3 text-gray-400">
                                                {approach.miss_distance?.lunar != null && (
                                                    <span className="flex items-center gap-1">
                                                        <Navigation className="w-3 h-3" />
                                                        {approach.miss_distance.lunar.toFixed(1)} LD
                                                    </span>
                                                )}
                                                {approach.relative_velocity?.km_per_sec && (
                                                    <span className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        {approach.relative_velocity.km_per_sec.toFixed(1)} km/s
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Buttons - Compact */}
                                        <div className="flex items-center gap-1">
                                            {/* Compare Toggle */}
                                            {hasData && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleCompare(neo.id)}
                                                    className={`h-7 px-2 cursor-pointer transition-all duration-200 hover:scale-110 ${isSelected
                                                        ? 'text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30'
                                                        : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                                                        }`}
                                                    title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
                                                >
                                                    <GitCompare className="w-3 h-3" />
                                                </Button>
                                            )}
                                            {/* View */}
                                            {hasData && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onView?.(neo)}
                                                    className="h-7 px-2 text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200 hover:scale-110"
                                                    title="View details"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            )}
                                            {/* Alert */}
                                            {hasData && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleAlert(neo).catch(() => { })}
                                                    className={`h-7 px-2 cursor-pointer transition-all duration-200 hover:scale-110 ${hasAlert(neo.id)
                                                        ? 'text-purple-400 bg-purple-500/20 hover:bg-purple-500/30'
                                                        : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
                                                        }`}
                                                    title={hasAlert(neo.id) ? 'Disable alert' : 'Enable alert'}
                                                >
                                                    {hasAlert(neo.id) ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                                </Button>
                                            )}
                                            {/* Delete */}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removeFromWatchlist(neo.id).catch(() => { })}
                                                className="h-7 px-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 ml-auto cursor-pointer transition-all duration-200 hover:scale-110"
                                                title="Remove from watchlist"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Watchlist;
