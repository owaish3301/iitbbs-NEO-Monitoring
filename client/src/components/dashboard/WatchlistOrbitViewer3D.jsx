import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchNeoLookup } from '@/services/api';

// ─── Orbit colors for multiple NEOs (cycle through) ──────
const NEO_COLORS = [
    '#a855f7', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316', // orange
    '#22c55e', // green
    '#ec4899', // pink
    '#eab308', // yellow
    '#8b5cf6', // violet
    '#14b8a6', // teal
    '#f43f5e', // rose
];

/**
 * Compute points along a Keplerian orbit ellipse.
 */
const computeOrbitPoints = (orbitalData, segments = 256) => {
    const a = parseFloat(orbitalData.semi_major_axis);
    const e = parseFloat(orbitalData.eccentricity);
    const I = parseFloat(orbitalData.inclination) * (Math.PI / 180);
    const omega = parseFloat(orbitalData.perihelion_argument) * (Math.PI / 180);
    const Omega = parseFloat(orbitalData.ascending_node_longitude) * (Math.PI / 180);

    const points = [];
    const scale = 10;

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));

        const xOrbital = r * Math.cos(theta);
        const yOrbital = r * Math.sin(theta);

        const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
        const cosI = Math.cos(I), sinI = Math.sin(I);
        const cosW = Math.cos(omega), sinW = Math.sin(omega);

        const x = (cosO * cosW - sinO * sinW * cosI) * xOrbital +
                  (-cosO * sinW - sinO * cosW * cosI) * yOrbital;
        const y = (sinO * cosW + cosO * sinW * cosI) * xOrbital +
                  (-sinO * sinW + cosO * cosW * cosI) * yOrbital;
        const z = (sinW * sinI) * xOrbital + (cosW * sinI) * yOrbital;

        points.push(new THREE.Vector3(x * scale, z * scale, -y * scale));
    }

    return points;
};

/** Get asteroid's current position from mean anomaly */
const getAsteroidPosition = (orbitalData) => {
    const a = parseFloat(orbitalData.semi_major_axis);
    const e = parseFloat(orbitalData.eccentricity);
    const I = parseFloat(orbitalData.inclination) * (Math.PI / 180);
    const omega = parseFloat(orbitalData.perihelion_argument) * (Math.PI / 180);
    const Omega = parseFloat(orbitalData.ascending_node_longitude) * (Math.PI / 180);
    const M = parseFloat(orbitalData.mean_anomaly) * (Math.PI / 180);

    let E = M;
    for (let i = 0; i < 20; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    const theta = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const scale = 10;

    const xOrbital = r * Math.cos(theta);
    const yOrbital = r * Math.sin(theta);

    const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
    const cosI = Math.cos(I), sinI = Math.sin(I);
    const cosW = Math.cos(omega), sinW = Math.sin(omega);

    const x = (cosO * cosW - sinO * sinW * cosI) * xOrbital +
              (-cosO * sinW - sinO * cosW * cosI) * yOrbital;
    const y = (sinO * cosW + cosO * sinW * cosI) * xOrbital +
              (-sinO * sinW + cosO * cosW * cosI) * yOrbital;
    const z = (sinW * sinI) * xOrbital + (cosW * sinI) * yOrbital;

    return [x * scale, z * scale, -y * scale];
};

/** Earth's approximate orbit */
const earthOrbitPoints = (() => {
    const pts = [];
    const scale = 10;
    for (let i = 0; i <= 128; i++) {
        const theta = (i / 128) * 2 * Math.PI;
        pts.push(new THREE.Vector3(
            Math.cos(theta) * scale,
            0,
            -Math.sin(theta) * scale
        ));
    }
    return pts;
})();

/** Animated asteroid marker */
const AsteroidMarker = ({ position, color }) => {
    const meshRef = useRef();
    useFrame((_, delta) => {
        if (meshRef.current) meshRef.current.rotation.y += delta * 2;
    });

    return (
        <mesh ref={meshRef} position={position}>
            <octahedronGeometry args={[0.25, 0]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                wireframe
            />
        </mesh>
    );
};

/** Sun at origin */
const Sun = () => (
    <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} />
    </mesh>
);

/** Earth */
const Earth = () => (
    <mesh position={[10, 0, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#4da6ff" emissive="#1e60a0" emissiveIntensity={0.3} />
    </mesh>
);

/** Single NEO orbit + marker inside the scene */
const NeoOrbit = ({ orbitalData, color, name, visible }) => {
    const orbitPoints = useMemo(() => computeOrbitPoints(orbitalData), [orbitalData]);
    const asteroidPos = useMemo(() => getAsteroidPosition(orbitalData), [orbitalData]);
    const lineGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(orbitPoints), [orbitPoints]);

    if (!visible) return null;

    return (
        <>
            <line geometry={lineGeom}>
                <lineBasicMaterial color={color} opacity={0.7} transparent />
            </line>
            <AsteroidMarker position={asteroidPos} color={color} />
            <Html position={asteroidPos} center style={{ pointerEvents: 'none', transform: 'translateY(-20px)' }}>
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color }}>
                    {name}
                </span>
            </Html>
        </>
    );
};

/** Full 3D scene with all watchlisted NEOs */
const MultiOrbitScene = ({ neoOrbits, visibilityMap }) => {
    const earthLineGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(earthOrbitPoints), []);

    return (
        <>
            <ambientLight intensity={0.3} />
            <pointLight position={[0, 0, 0]} intensity={2} color="#fbbf24" />

            <Sun />
            <Earth />

            {/* Earth orbit */}
            <line geometry={earthLineGeom}>
                <lineBasicMaterial color="#3b82f6" opacity={0.3} transparent />
            </line>

            {/* All NEO orbits */}
            {neoOrbits.map((neo, index) => (
                <NeoOrbit
                    key={neo.id}
                    orbitalData={neo.orbitalData}
                    color={neo.color}
                    name={neo.name}
                    visible={visibilityMap[neo.id] !== false}
                />
            ))}

            {/* Labels */}
            <Html position={[10, 0.6, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="text-[10px] text-blue-400 font-medium whitespace-nowrap">Earth</span>
            </Html>
            <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="text-[10px] text-yellow-400 font-medium">Sun</span>
            </Html>

            <Stars radius={100} depth={50} count={1500} factor={3} saturation={0} />
            <OrbitControls
                enablePan
                enableZoom
                enableRotate
                autoRotate
                autoRotateSpeed={0.3}
                minDistance={3}
                maxDistance={80}
            />
        </>
    );
};

// ─── Main Component ──────────────────────────────────────────

const WatchlistOrbitViewer3D = ({ watchlistNeos, onClose }) => {
    const [neoOrbits, setNeoOrbits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
    const [visibilityMap, setVisibilityMap] = useState({});
    const [showLegend, setShowLegend] = useState(true);

    // Fetch orbital data for all watchlisted NEOs
    useEffect(() => {
        if (!watchlistNeos || watchlistNeos.length === 0) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        const total = watchlistNeos.filter(n => !n._noLiveData).length;
        setLoadProgress({ loaded: 0, total });

        const fetchAll = async () => {
            const results = [];
            let loaded = 0;

            const validNeos = watchlistNeos.filter(n => !n._noLiveData);

            // Fetch in parallel (batches of 5)
            for (let i = 0; i < validNeos.length; i += 5) {
                const batch = validNeos.slice(i, i + 5);
                const batchResults = await Promise.allSettled(
                    batch.map(neo => fetchNeoLookup(neo.id))
                );

                for (let j = 0; j < batch.length; j++) {
                    const result = batchResults[j];
                    if (result.status === 'fulfilled' && result.value?.raw?.orbital_data) {
                        const orbital = result.value.raw.orbital_data;
                        if (orbital.semi_major_axis) {
                            results.push({
                                id: batch[j].id,
                                name: (batch[j].name || '').replace(/[()]/g, ''),
                                isHazardous: batch[j].is_potentially_hazardous,
                                orbitalData: orbital,
                                color: batch[j].is_potentially_hazardous
                                    ? '#ef4444'
                                    : NEO_COLORS[results.length % NEO_COLORS.length],
                            });
                        }
                    }
                    loaded++;
                    if (!cancelled) setLoadProgress({ loaded, total });
                }
            }

            if (!cancelled) {
                setNeoOrbits(results);
                // Initialize all as visible
                const vis = {};
                results.forEach(n => { vis[n.id] = true; });
                setVisibilityMap(vis);
                setLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [watchlistNeos]);

    const toggleVisibility = (id) => {
        setVisibilityMap(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleAll = () => {
        const allVisible = Object.values(visibilityMap).every(Boolean);
        const newVis = {};
        neoOrbits.forEach(n => { newVis[n.id] = !allVisible; });
        setVisibilityMap(newVis);
    };

    const visibleCount = Object.values(visibilityMap).filter(Boolean).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <h2 className="text-white text-lg font-bold">Watchlist — 3D Orbit View</h2>
                    <Badge variant="outline" className="text-gray-400 border-white/10">
                        {neoOrbits.length} asteroid{neoOrbits.length !== 1 ? 's' : ''}
                    </Badge>
                    {!loading && (
                        <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                            {visibleCount} visible
                        </Badge>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                        <p className="text-gray-400">
                            Loading orbital data... ({loadProgress.loaded}/{loadProgress.total})
                        </p>
                        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-cyan-500 rounded-full transition-all"
                                style={{ width: `${loadProgress.total ? (loadProgress.loaded / loadProgress.total) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                ) : neoOrbits.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No orbital data available for watchlisted NEOs.</p>
                    </div>
                ) : (
                    <>
                        <Canvas
                            camera={{ position: [0, 20, 35], fov: 50 }}
                            gl={{ antialias: true }}
                            style={{ background: 'black', width: '100%', height: '100%' }}
                        >
                            <MultiOrbitScene neoOrbits={neoOrbits} visibilityMap={visibilityMap} />
                        </Canvas>

                        {/* Legend / Toggle panel */}
                        <div className="absolute top-4 right-4 max-h-[calc(100%-2rem)] overflow-y-auto">
                            <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-3 min-w-[200px]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                                        Legend
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={toggleAll}
                                            className="text-[10px] text-cyan-400 hover:text-cyan-300 transition px-1"
                                        >
                                            {Object.values(visibilityMap).every(Boolean) ? 'Hide All' : 'Show All'}
                                        </button>
                                        <button
                                            onClick={() => setShowLegend(prev => !prev)}
                                            className="text-gray-500 hover:text-gray-300 ml-1"
                                        >
                                            {showLegend ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                {showLegend && (
                                    <div className="space-y-1.5">
                                        {/* Fixed items */}
                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block shrink-0" />
                                            <span className="text-yellow-400">Sun</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className="w-3 h-3 rounded-full bg-blue-400 inline-block shrink-0" />
                                            <span className="text-blue-400">Earth</span>
                                        </div>
                                        <div className="h-px bg-white/10 my-1" />

                                        {/* NEO toggles */}
                                        {neoOrbits.map((neo) => (
                                            <button
                                                key={neo.id}
                                                onClick={() => toggleVisibility(neo.id)}
                                                className={`flex items-center gap-2 text-[11px] w-full text-left py-0.5 px-1 rounded transition hover:bg-white/5 ${
                                                    visibilityMap[neo.id] === false ? 'opacity-40' : ''
                                                }`}
                                            >
                                                <span
                                                    className="w-3 h-0.5 rounded inline-block shrink-0"
                                                    style={{ backgroundColor: neo.color }}
                                                />
                                                <span
                                                    className="truncate"
                                                    style={{ color: neo.color }}
                                                >
                                                    {neo.name}
                                                </span>
                                                {neo.isHazardous && (
                                                    <span className="text-[9px] text-red-400 ml-auto shrink-0">!</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom info bar */}
                        <div className="absolute bottom-3 left-3 flex gap-4 text-[10px] text-gray-500 pointer-events-none">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-0.5 bg-blue-500 inline-block rounded" /> Earth orbit
                            </span>
                            <span>Drag to rotate · Scroll to zoom · Click legend to toggle</span>
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default WatchlistOrbitViewer3D;
