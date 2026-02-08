import { useState, useMemo, memo } from 'react';
import {
    Search,
    Filter,
    Eye,
    Star,
    AlertTriangle,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWatchlist } from '@/context/WatchlistContext';

const NeoFeedTable = memo(({ neoData, onSelectNeo, onAddToWatchlist, page, onPageChange, loading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterHazardous, setFilterHazardous] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'distance', direction: 'asc' });
    const { isInWatchlist } = useWatchlist();

    const neos = neoData?.neo_objects || [];

    const filteredAndSortedNeos = useMemo(() => {
        let result = [...neos];

        // Filter by search term
        if (searchTerm) {
            result = result.filter(neo =>
                neo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                neo.id.includes(searchTerm)
            );
        }

        // Filter by hazardous status
        if (filterHazardous === 'hazardous') {
            result = result.filter(neo => neo.is_potentially_hazardous);
        } else if (filterHazardous === 'safe') {
            result = result.filter(neo => !neo.is_potentially_hazardous);
        }

        // Sort
        result.sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                case 'name':
                    aVal = a.name;
                    bVal = b.name;
                    break;
                case 'diameter':
                    aVal = a.estimated_diameter.max_m;
                    bVal = b.estimated_diameter.max_m;
                    break;
                case 'velocity':
                    aVal = a.close_approach_data[0]?.relative_velocity?.km_per_sec || 0;
                    bVal = b.close_approach_data[0]?.relative_velocity?.km_per_sec || 0;
                    break;
                case 'distance':
                default:
                    aVal = a.close_approach_data[0]?.miss_distance?.lunar || Infinity;
                    bVal = b.close_approach_data[0]?.miss_distance?.lunar || Infinity;
            }

            if (sortConfig.direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return result;
    }, [neos, searchTerm, filterHazardous, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return null;
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />;
    };

    return (
        <Card className="bg-white/5 border-white/10 overflow-hidden max-w-full relative">
            {/* Page loading overlay */}
            {loading && (
                <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-300">Loading page…</p>
                    </div>
                </div>
            )}
            <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        NEO Live Feed
                    </CardTitle>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[140px] max-w-[250px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                            />
                        </div>

                        {/* Filter */}
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                            <Button
                                size="sm"
                                variant={filterHazardous === 'all' ? 'default' : 'ghost'}
                                onClick={() => setFilterHazardous('all')}
                                className={`cursor-pointer transition-all duration-200 ${filterHazardous === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                All
                            </Button>
                            <Button
                                size="sm"
                                variant={filterHazardous === 'hazardous' ? 'default' : 'ghost'}
                                onClick={() => setFilterHazardous('hazardous')}
                                className={`cursor-pointer transition-all duration-200 ${filterHazardous === 'hazardous' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                            >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Hazardous
                            </Button>
                            <Button
                                size="sm"
                                variant={filterHazardous === 'safe' ? 'default' : 'ghost'}
                                onClick={() => setFilterHazardous('safe')}
                                className={`cursor-pointer transition-all duration-200 ${filterHazardous === 'safe' ? 'bg-green-500/20 text-green-400' : 'text-gray-400 hover:text-green-400'}`}
                            >
                                Safe
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th
                                    className="text-left py-3 px-4 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Name <SortIcon column="name" />
                                    </div>
                                </th>
                                <th
                                    className="text-left py-3 px-4 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                                    onClick={() => handleSort('diameter')}
                                >
                                    <div className="flex items-center gap-1">
                                        Diameter (m) <SortIcon column="diameter" />
                                    </div>
                                </th>
                                <th
                                    className="text-left py-3 px-4 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                                    onClick={() => handleSort('velocity')}
                                >
                                    <div className="flex items-center gap-1">
                                        Velocity (km/s) <SortIcon column="velocity" />
                                    </div>
                                </th>
                                <th
                                    className="text-left py-3 px-4 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                                    onClick={() => handleSort('distance')}
                                >
                                    <div className="flex items-center gap-1">
                                        Miss Distance <SortIcon column="distance" />
                                    </div>
                                </th>
                                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedNeos.map((neo, index) => {
                                const approach = neo.close_approach_data[0];
                                const isHazardous = neo.is_potentially_hazardous;

                                return (
                                    <tr
                                        key={neo.id}
                                        className={`
                                            border-b border-white/5 
                                            transition-all duration-300 ease-out
                                            hover:bg-gradient-to-r hover:from-white/10 hover:to-transparent
                                            hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]
                                            hover:border-l-2 hover:border-l-cyan-400
                                            hover:scale-[1.01] hover:-translate-y-[1px]
                                            cursor-pointer
                                            ${isHazardous
                                                ? 'bg-red-500/5 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:border-l-red-400'
                                                : ''
                                            }
                                        `}
                                    >
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                {isHazardous && (
                                                    <span className="relative flex h-3 w-3 flex-shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                    </span>
                                                )}
                                                <div>
                                                    <p className="text-white font-medium text-sm">
                                                        {neo.name.replace(/[()]/g, '')}
                                                    </p>
                                                    <p className="text-gray-500 text-xs">ID: {neo.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-gray-300 text-sm">
                                                {neo.estimated_diameter.min_m.toFixed(0)} - {neo.estimated_diameter.max_m.toFixed(0)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-gray-300 text-sm">
                                                {approach?.relative_velocity?.km_per_sec?.toFixed(2) || '—'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div>
                                                <span className="text-gray-300 text-sm">
                                                    {approach?.miss_distance?.lunar?.toFixed(2)} LD
                                                </span>
                                                <p className="text-gray-500 text-xs">
                                                    {(approach?.miss_distance?.kilometers / 1000000)?.toFixed(2)}M km
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Badge
                                                variant="outline"
                                                className={isHazardous
                                                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                                                    : 'bg-green-500/20 border-green-500/50 text-green-400'
                                                }
                                            >
                                                {isHazardous ? 'Hazardous' : 'Safe'}
                                            </Badge>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onSelectNeo?.(neo)}
                                                    className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer transition-all duration-200 hover:scale-110"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onAddToWatchlist?.(neo)}
                                                    className={`cursor-pointer transition-all duration-200 hover:scale-110 ${isInWatchlist(neo.id)
                                                        ? 'text-yellow-400 bg-yellow-500/10 hover:text-yellow-300 hover:bg-yellow-500/20'
                                                        : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                                                    }`}
                                                >
                                                    <Star className={`w-4 h-4 ${isInWatchlist(neo.id) ? 'fill-yellow-400' : ''}`} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    asChild
                                                    className="text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200 hover:scale-110"
                                                >
                                                    <a href={neo.nasa_jpl_url} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-gray-500 text-sm">
                        Showing {filteredAndSortedNeos.length} of {neoData?.element_count || 0} asteroids
                        {neoData?.total_pages > 1 && ` — Page ${page || 1} of ${neoData.total_pages}`}
                    </p>

                    {neoData?.total_pages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!neoData?.has_prev}
                                onClick={() => onPageChange?.(page - 1)}
                                className="cursor-pointer text-gray-600 border-white/10 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Prev
                            </Button>

                            {/* Page number buttons */}
                            {Array.from({ length: neoData.total_pages }, (_, i) => i + 1)
                                .filter((p) => {
                                    // Show first, last, current, and neighbors
                                    return p === 1 || p === neoData.total_pages || Math.abs(p - page) <= 1;
                                })
                                .reduce((acc, p, idx, arr) => {
                                    // Insert ellipsis markers between non-consecutive pages
                                    if (idx > 0 && p - arr[idx - 1] > 1) {
                                        acc.push('...' + p);
                                    }
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((item) => {
                                    if (typeof item === 'string') {
                                        return (
                                            <span key={item} className="text-gray-600 text-sm px-1">…</span>
                                        );
                                    }
                                    return (
                                        <Button
                                            key={item}
                                            size="sm"
                                            variant={item === page ? 'default' : 'outline'}
                                            onClick={() => onPageChange?.(item)}
                                            className={
                                                item === page
                                                    ? 'cursor-pointer bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                                                    : 'cursor-pointer text-gray-600 border-white/10 hover:bg-white/5 hover:text-white'
                                            }
                                        >
                                            {item}
                                        </Button>
                                    );
                                })}

                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!neoData?.has_next}
                                onClick={() => onPageChange?.(page + 1)}
                                className="cursor-pointer text-gray-600 border-white/10 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});

NeoFeedTable.displayName = 'NeoFeedTable';
export default NeoFeedTable;
