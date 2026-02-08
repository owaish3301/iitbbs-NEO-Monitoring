import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe2, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { fetchNeoLookup, fetchNeoFeed } from '@/services/api';

// ─── Orbital math ───────────────────────────────────────────

const DEG2RAD = Math.PI / 180;
const AU_SCALE = 10; // 1 AU = 10 scene units

const computeOrbitPoints = (od, segments = 200) => {
    const a = parseFloat(od.semi_major_axis);
    const e = parseFloat(od.eccentricity);
    const I = parseFloat(od.inclination) * DEG2RAD;
    const omega = parseFloat(od.perihelion_argument) * DEG2RAD;
    const Omega = parseFloat(od.ascending_node_longitude) * DEG2RAD;

    const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
    const cosI = Math.cos(I), sinI = Math.sin(I);
    const cosW = Math.cos(omega), sinW = Math.sin(omega);

    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
        const xO = r * Math.cos(theta);
        const yO = r * Math.sin(theta);

        const x = (cosO * cosW - sinO * sinW * cosI) * xO + (-cosO * sinW - sinO * cosW * cosI) * yO;
        const y = (sinO * cosW + cosO * sinW * cosI) * xO + (-sinO * sinW + cosO * cosW * cosI) * yO;
        const z = (sinW * sinI) * xO + (cosW * sinI) * yO;

        pts.push(new THREE.Vector3(x * AU_SCALE, z * AU_SCALE, -y * AU_SCALE));
    }
    return pts;
};

const solvePosition = (od) => {
    const a = parseFloat(od.semi_major_axis);
    const e = parseFloat(od.eccentricity);
    const I = parseFloat(od.inclination) * DEG2RAD;
    const omega = parseFloat(od.perihelion_argument) * DEG2RAD;
    const Omega = parseFloat(od.ascending_node_longitude) * DEG2RAD;
    const M = parseFloat(od.mean_anomaly) * DEG2RAD;

    let E = M;
    for (let i = 0; i < 20; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));

    const theta = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));

    const xO = r * Math.cos(theta);
    const yO = r * Math.sin(theta);

    const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
    const cosI = Math.cos(I), sinI = Math.sin(I);
    const cosW = Math.cos(omega), sinW = Math.sin(omega);

    const x = (cosO * cosW - sinO * sinW * cosI) * xO + (-cosO * sinW - sinO * cosW * cosI) * yO;
    const y = (sinO * cosW + cosO * sinW * cosI) * xO + (-sinO * sinW + cosO * cosW * cosI) * yO;
    const z = (sinW * sinI) * xO + (cosW * sinI) * yO;

    return [x * AU_SCALE, z * AU_SCALE, -y * AU_SCALE];
};

// ─── Earth orbit (circular reference at 1 AU) ──────────────

const earthOrbitPts = (() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
        const t = (i / 128) * 2 * Math.PI;
        pts.push(new THREE.Vector3(Math.cos(t) * AU_SCALE, 0, -Math.sin(t) * AU_SCALE));
    }
    return pts;
})();

// ─── Scene objects ──────────────────────────────────────────

const Sun = () => (
    <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2} />
    </mesh>
);

const EarthMarker = () => (
    <group position={[AU_SCALE, 0, 0]}>
        <mesh>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00acc1" emissiveIntensity={0.6} />
        </mesh>
        {/* Glow ring around Earth */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.45, 32]} />
            <meshBasicMaterial color="#00e5ff" opacity={0.2} transparent side={THREE.DoubleSide} />
        </mesh>
        <Html center style={{ pointerEvents: 'none' }}>
            <span className="text-[10px] text-cyan-300 font-semibold -translate-y-5 block drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]">Earth</span>
        </Html>
    </group>
);

const EarthOrbit = memo(() => {
    const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(earthOrbitPts), []);
    return (
        <line geometry={geom}>
            <lineBasicMaterial color="#00e5ff" opacity={0.35} transparent />
        </line>
    );
});
EarthOrbit.displayName = 'EarthOrbit';

// ─── Single asteroid (orbit trail + marker) ─────────────────

const ORBIT_COLORS = ['#f59e0b', '#fb923c', '#facc15', '#d97706', '#fbbf24', '#f97316', '#eab308', '#fcd34d'];

const AsteroidOrbit = memo(({ orbitalData, color, opacity }) => {
    const geom = useMemo(() => {
        const pts = computeOrbitPoints(orbitalData);
        return new THREE.BufferGeometry().setFromPoints(pts);
    }, [orbitalData]);

    return (
        <line geometry={geom}>
            <lineBasicMaterial color={color} opacity={opacity} transparent />
        </line>
    );
});
AsteroidOrbit.displayName = 'AsteroidOrbit';

const AsteroidDot = ({ position, isHazardous, name, onClick, hovered, onHover }) => {
    const meshRef = useRef();
    const size = isHazardous ? 0.2 : 0.15;

    useFrame((_, delta) => {
        if (meshRef.current) meshRef.current.rotation.y += delta * 1.5;
    });

    return (
        <group position={position}>
            <mesh
                ref={meshRef}
                onClick={onClick}
                onPointerOver={onHover}
                onPointerOut={() => onHover(null)}
                scale={hovered ? 1.6 : 1}
            >
                <octahedronGeometry args={[size, 0]} />
                <meshStandardMaterial
                    color={isHazardous ? '#ef4444' : '#f59e0b'}
                    emissive={isHazardous ? '#ef4444' : '#f59e0b'}
                    emissiveIntensity={hovered ? 1 : 0.4}
                    wireframe
                />
            </mesh>
            {hovered && (
                <Html center style={{ pointerEvents: 'none', transform: 'translateY(-24px)' }}>
                    <div className="bg-black/80 border border-white/20 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap backdrop-blur-md">
                        {name}
                    </div>
                </Html>
            )}
        </group>
    );
};

// ─── Full scene ─────────────────────────────────────────────

const AllAsteroidsScene = ({ asteroids, onSelectNeo, showOrbits, showLabels }) => {
    const [hoveredId, setHoveredId] = useState(null);

    return (
        <>
            <ambientLight intensity={0.25} />
            <pointLight position={[0, 0, 0]} intensity={2.5} color="#fbbf24" />

            <Sun />
            <EarthMarker />
            <EarthOrbit />

            {asteroids.map((ast, idx) => {
                const color = ast.isHazardous ? '#ef4444' : ORBIT_COLORS[idx % ORBIT_COLORS.length];
                return (
                    <group key={ast.id}>
                        {showOrbits && (
                            <AsteroidOrbit
                                orbitalData={ast.orbitalData}
                                color={color}
                                opacity={hoveredId === ast.id ? 0.8 : 0.25}
                            />
                        )}
                        <AsteroidDot
                            position={ast.position}
                            isHazardous={ast.isHazardous}
                            name={ast.name}
                            hovered={hoveredId === ast.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectNeo?.(ast.raw);
                            }}
                            onHover={(e) => setHoveredId(e ? ast.id : null)}
                        />
                        {showLabels && (
                            <Html position={ast.position} center style={{ pointerEvents: 'none', transform: 'translateY(-20px)' }}>
                                <span className={`text-[8px] font-medium whitespace-nowrap ${ast.isHazardous ? 'text-red-400' : 'text-amber-300'}`}>
                                    {ast.name}
                                </span>
                            </Html>
                        )}
                    </group>
                );
            })}

            <Stars radius={120} depth={60} count={2000} factor={3} saturation={0} />
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

// ─── Main component ─────────────────────────────────────────

const getDateRange = () => {
    const today = new Date();
    const start = today.toISOString().split('T')[0];
    const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { start, end };
};

const OrbitViewer = ({ neoData, onSelectNeo }) => {
    const [allNeos, setAllNeos] = useState([]);
    const [orbitalCache, setOrbitalCache] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadedCount, setLoadedCount] = useState(0);
    const [totalToLoad, setTotalToLoad] = useState(0);
    const [showOrbits, setShowOrbits] = useState(true);
    const [showLabels, setShowLabels] = useState(true);

    // Step 1: Fetch ALL NEOs (limit=100) instead of using paginated prop
    useEffect(() => {
        let cancelled = false;

        const fetchAllNeos = async () => {
            try {
                const { start, end } = getDateRange();
                const data = await fetchNeoFeed(start, end, { page: 1, limit: 100 });
                if (!cancelled) {
                    setAllNeos(data?.neo_objects || []);
                }
            } catch (err) {
                console.error('OrbitViewer: failed to fetch full NEO list', err);
                // Fallback to paginated data from prop
                if (!cancelled) {
                    setAllNeos(neoData?.neo_objects || []);
                }
            }
        };

        fetchAllNeos();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Step 2: Fetch orbital data for every NEO in batches
    useEffect(() => {
        if (allNeos.length === 0) return;

        let cancelled = false;
        const idsToFetch = allNeos.map(n => n.id).filter(id => !orbitalCache[id]);
        if (idsToFetch.length === 0) return;

        setLoading(true);
        setLoadedCount(0);
        setTotalToLoad(idsToFetch.length);

        const fetchAll = async () => {
            const batchSize = 5;
            const newCache = {};

            for (let i = 0; i < idsToFetch.length; i += batchSize) {
                if (cancelled) return;
                const batch = idsToFetch.slice(i, i + batchSize);

                const results = await Promise.allSettled(
                    batch.map(id => fetchNeoLookup(id))
                );

                results.forEach((result, idx) => {
                    const id = batch[idx];
                    if (result.status === 'fulfilled' && result.value?.raw?.orbital_data?.semi_major_axis) {
                        newCache[id] = result.value.raw.orbital_data;
                    }
                });

                if (!cancelled) setLoadedCount(prev => prev + batch.length);
            }

            if (!cancelled) {
                setOrbitalCache(prev => ({ ...prev, ...newCache }));
                setLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allNeos.map(n => n.id).join(',')]);

    // Build scene-ready asteroid list
    const asteroids = useMemo(() => {
        return allNeos
            .filter(neo => orbitalCache[neo.id])
            .map(neo => {
                const od = orbitalCache[neo.id];
                return {
                    id: neo.id,
                    name: neo.name.replace(/[()]/g, ''),
                    isHazardous: neo.is_potentially_hazardous,
                    orbitalData: od,
                    position: solvePosition(od),
                    raw: neo,
                };
            });
    }, [allNeos, orbitalCache]);

    const hazardousCount = asteroids.filter(a => a.isHazardous).length;
    const totalReady = asteroids.length;

    return (
        <Card className="bg-white/5 border-white/10 backdrop-blur-md h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Globe2 className="w-5 h-5 text-purple-400" />
                        3D Orbit Visualization
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {hazardousCount > 0 && (
                            <Badge className="bg-red-500/20 border-red-500/50 text-red-400 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {hazardousCount} Hazardous
                            </Badge>
                        )}
                        <Badge variant="outline" className="bg-purple-500/20 border-purple-500/50 text-purple-400 text-xs">
                            {totalReady} Asteroids
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* 3D Canvas */}
                <div className="aspect-[16/10] rounded-xl border border-white/10 overflow-hidden relative bg-black">
                    {loading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-spin" />
                                <p className="text-gray-400 text-sm">
                                    Loading orbital data... {loadedCount}/{totalToLoad}
                                </p>
                            </div>
                        </div>
                    )}
                    {asteroids.length > 0 ? (
                        <Canvas
                            camera={{ position: [0, 18, 30], fov: 50 }}
                            gl={{ antialias: true }}
                            style={{ background: 'black' }}
                        >
                            <AllAsteroidsScene
                                asteroids={asteroids}
                                onSelectNeo={onSelectNeo}
                                showOrbits={showOrbits}
                                showLabels={showLabels}
                            />
                        </Canvas>
                    ) : !loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-gray-500 text-sm">No orbital data available</p>
                        </div>
                    ) : null}

                    {/* Legend */}
                    <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] text-gray-500 pointer-events-none">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-0.5 bg-cyan-400 inline-block rounded" /> Earth
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-0.5 bg-amber-400 inline-block rounded" /> Safe
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-0.5 bg-red-500 inline-block rounded" /> Hazardous
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowOrbits(v => !v)}
                        className={`border-white/10 cursor-pointer text-xs ${showOrbits ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400'} hover:text-white hover:bg-white/10`}
                    >
                        {showOrbits ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
                        Orbits
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLabels(v => !v)}
                        className={`border-white/10 cursor-pointer text-xs ${showLabels ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400'} hover:text-white hover:bg-white/10`}
                    >
                        {showLabels ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : <EyeOff className="w-3.5 h-3.5 mr-1.5" />}
                        Labels
                    </Button>
                </div>

                <p className="text-center text-gray-600 text-xs">
                    Click an asteroid to view details &bull; Drag to rotate &bull; Scroll to zoom
                </p>
            </CardContent>
        </Card>
    );
};

export default OrbitViewer;
