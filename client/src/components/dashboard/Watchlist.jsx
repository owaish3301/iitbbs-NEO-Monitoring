import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Eye, Bell, BellOff, Trash2, AlertTriangle, Rocket, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWatchlist } from '@/context/WatchlistContext';
import { fetchNeoLookup } from '@/services/api';

const Watchlist = ({ onView, onViewAll3D, neoData }) => {
    const { watchlistItems, removeFromWatchlist, loading, hasAlert, toggleAlert } = useWatchlist();
    const [lookedUpNeos, setLookedUpNeos] = useState({});
    const [lookupLoading, setLookupLoading] = useState(false);

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
            // Fetch in parallel batches of 5
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
    }, [watchlistItems, feedNeoIds]); // intentionally omit lookedUpNeos to avoid loops

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
            // Use looked-up data if available
            const looked = lookedUpNeos[id];
            if (looked) {
                return { ...looked, _watchlistDbId: item.id, _addedAt: item.added_at };
            }
            // Fallback — still loading or lookup failed
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

    const isEmpty = enrichedWatchlist.length === 0;

    return (
        <Card className="bg-white/5 border-white/10 backdrop-blur-md h-full">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        Your Watchlist
                    </div>
                    <div className="flex items-center gap-2">
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
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {enrichedWatchlist.map((neo, index) => {
                                const approach = neo.close_approach_data?.[0];
                                const isHazardous = neo.is_potentially_hazardous;

                                return (
                                    <motion.div
                                        key={neo.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, x: -100 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`p-4 rounded-xl ${isHazardous
                                                ? 'bg-red-500/10 border border-red-500/20'
                                                : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                {isHazardous && (
                                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                                )}
                                                <div>
                                                    <h4 className="text-white font-medium text-sm">
                                                        {(neo.name || '').replace(/[()]/g, '')}
                                                    </h4>
                                                    <p className="text-gray-500 text-xs">
                                                        {approach?.close_approach_date
                                                            || (neo._noLiveData && lookupLoading ? 'Loading...'
                                                            : neo._noLiveData ? 'No upcoming close approach'
                                                            : neo._fromLookup ? 'Next: ' + (approach?.close_approach_date || 'N/A')
                                                            : 'Unknown date')}
                                                    </p>
                                                    {neo._fromLookup && (
                                                        <p className="text-gray-600 text-[10px] mt-0.5">via NASA lookup</p>
                                                    )}
                                                </div>
                                            </div>
                                            {(!neo._noLiveData || neo._fromLookup) && (
                                                <Badge
                                                    variant="outline"
                                                    className={isHazardous
                                                        ? 'bg-red-500/20 border-red-500/50 text-red-400 text-xs'
                                                        : 'bg-green-500/20 border-green-500/50 text-green-400 text-xs'
                                                    }
                                                >
                                                    {isHazardous ? 'Hazardous' : 'Safe'}
                                                </Badge>
                                            )}
                                        </div>

                                        {approach?.miss_distance?.lunar != null && (
                                            <div className="flex items-center justify-between text-sm mb-3">
                                                <span className="text-gray-400">Distance:</span>
                                                <span className="text-white font-medium">
                                                    {approach.miss_distance.lunar.toFixed(2)} LD
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            {(!neo._noLiveData || neo._fromLookup) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onView?.(neo)}
                                                    className="flex-1 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 h-8"
                                                >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    View
                                                </Button>
                                            )}
                                            {(!neo._noLiveData || neo._fromLookup) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleAlert(neo).catch(() => {})}
                                                    className={`flex-1 h-8 ${
                                                        hasAlert(neo.id)
                                                            ? 'text-purple-400 bg-purple-500/15 hover:text-purple-300 hover:bg-purple-500/20'
                                                            : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
                                                    }`}
                                                >
                                                    {hasAlert(neo.id)
                                                        ? <><BellOff className="w-3 h-3 mr-1" /> Alerted</>
                                                        : <><Bell className="w-3 h-3 mr-1" /> Alert</>
                                                    }
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removeFromWatchlist(neo.id).catch(() => {})}
                                                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-8 px-2"
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
