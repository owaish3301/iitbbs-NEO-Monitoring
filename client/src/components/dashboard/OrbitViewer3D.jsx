import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * Compute points along a Keplerian orbit ellipse.
 * All angular inputs in degrees; distances in AU.
 */
const computeOrbitPoints = (orbitalData, segments = 256) => {
    const a = parseFloat(orbitalData.semi_major_axis);         // AU
    const e = parseFloat(orbitalData.eccentricity);
    const I = parseFloat(orbitalData.inclination) * (Math.PI / 180);
    const omega = parseFloat(orbitalData.perihelion_argument) * (Math.PI / 180);
    const Omega = parseFloat(orbitalData.ascending_node_longitude) * (Math.PI / 180);

    const points = [];
    const scale = 10; // 1 AU = 10 units in scene

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI; // true anomaly
        const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));

        // Position in orbital plane
        const xOrbital = r * Math.cos(theta);
        const yOrbital = r * Math.sin(theta);

        // Rotate to 3D ecliptic coordinates
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

    // Solve Kepler's equation: E - e*sin(E) = M (Newton's method)
    let E = M;
    for (let i = 0; i < 20; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    // True anomaly from eccentric anomaly
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

/** Earth's approximate orbit (circular at 1 AU for reference) */
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
const AsteroidMarker = ({ position, isHazardous }) => {
    const meshRef = useRef();
    useFrame((_, delta) => {
        if (meshRef.current) meshRef.current.rotation.y += delta * 2;
    });

    return (
        <mesh ref={meshRef} position={position}>
            <octahedronGeometry args={[0.25, 0]} />
            <meshStandardMaterial
                color={isHazardous ? '#ef4444' : '#facc15'}
                emissive={isHazardous ? '#ef4444' : '#facc15'}
                emissiveIntensity={0.5}
                wireframe
            />
        </mesh>
    );
};

/** Earth at ~[10, 0, 0] (approximate) */
const Earth = () => (
    <mesh position={[10, 0, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#4da6ff" emissive="#1e60a0" emissiveIntensity={0.3} />
    </mesh>
);

/** Sun at origin */
const Sun = () => (
    <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} />
    </mesh>
);

const OrbitScene = ({ orbitalData, isHazardous, name }) => {
    const neoOrbitPoints = useMemo(
        () => computeOrbitPoints(orbitalData),
        [orbitalData]
    );
    const asteroidPos = useMemo(
        () => getAsteroidPosition(orbitalData),
        [orbitalData]
    );

    const neoLineGeom = useMemo(() => {
        const geom = new THREE.BufferGeometry().setFromPoints(neoOrbitPoints);
        return geom;
    }, [neoOrbitPoints]);

    const earthLineGeom = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints(earthOrbitPoints);
    }, []);

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

            {/* NEO orbit */}
            <line geometry={neoLineGeom}>
                <lineBasicMaterial
                    color={isHazardous ? '#ef4444' : '#a855f7'}
                    opacity={0.7}
                    transparent
                />
            </line>

            {/* Asteroid current position */}
            <AsteroidMarker position={asteroidPos} isHazardous={isHazardous} />

            {/* Labels */}
            <Html position={[10, 0.6, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="text-[10px] text-blue-400 font-medium whitespace-nowrap">Earth</span>
            </Html>
            <Html position={[0, 0.9, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="text-[10px] text-yellow-400 font-medium">Sun</span>
            </Html>
            <Html position={asteroidPos} center style={{ pointerEvents: 'none', transform: 'translateY(-20px)' }}>
                <span className={`text-[10px] font-medium whitespace-nowrap ${isHazardous ? 'text-red-400' : 'text-purple-400'}`}>
                    {name}
                </span>
            </Html>

            <Stars radius={100} depth={50} count={1500} factor={3} saturation={0} />
            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate
                autoRotateSpeed={0.5}
                minDistance={3}
                maxDistance={60}
            />
        </>
    );
};

const OrbitViewer3D = ({ orbitalData, isHazardous, name }) => {
    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }, []);

    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    if (!orbitalData?.semi_major_axis) {
        return (
            <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-xl border border-white/10 flex items-center justify-center">
                <p className="text-gray-500 text-sm">No orbital data available</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`rounded-xl border border-white/10 overflow-hidden relative bg-black ${isFullscreen ? 'w-screen h-screen' : 'aspect-video'}`}
        >
            <Canvas
                camera={{ position: [0, 15, 25], fov: 50 }}
                gl={{ antialias: true }}
                style={{ background: 'black', position: 'absolute', inset: 0, zIndex: 0 }}
            >
                <OrbitScene
                    orbitalData={orbitalData}
                    isHazardous={isHazardous}
                    name={name?.replace(/[()]/g, '') || 'Asteroid'}
                />
            </Canvas>
            {/* Maximize / Minimize button */}
            <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors backdrop-blur-sm border border-white/10 cursor-pointer"
                style={{ zIndex: 50 }}
            >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] text-gray-500 pointer-events-none" style={{ zIndex: 50 }}>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-0.5 bg-blue-500 inline-block rounded" /> Earth orbit
                </span>
                <span className="flex items-center gap-1">
                    <span className={`w-2 h-0.5 inline-block rounded ${isHazardous ? 'bg-red-500' : 'bg-purple-500'}`} /> NEO orbit
                </span>
            </div>
        </div>
    );
};

export default OrbitViewer3D;
