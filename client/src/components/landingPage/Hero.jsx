import { motion } from 'framer-motion';
import { ArrowRight, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const Hero = () => {
  return (
    <div className="relative z-10 w-full min-h-screen flex items-center justify-center text-white px-4 pt-16">
      {/* Decorative gradient glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[96px] -z-10 pointer-events-none" />

      <div className="max-w-5xl w-full flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <Badge variant="outline" className="mb-8 px-4 py-1.5 rounded-full bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-md cursor-pointer group text-sm font-medium gap-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </div>
            <span className="text-gray-300 group-hover:text-white transition-colors">
              Impact Alert: Asteroid 2024 XR Passed Safely
            </span>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
          </Badge>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight leading-tight">
            Watch The <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
              Skies Above
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The most advanced real-time Near-Earth Object monitoring platform.
            Translate complex NASA data into actionable insights for safety and science.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              asChild
              className="group relative bg-white text-black px-8 py-4 rounded-xl font-bold text-lg h-auto hover:bg-gray-200 cursor-pointer"
            >
              <Link to="/auth">
                Launch Tracker
                <RocketIcon className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="outline" className="bg-white/5 border-white/10 hover:shadow-[8px_0_30px_rgba(0,80,175,0.9)]
 hover:bg-black text-white px-8 py-4 rounded-xl font-bold text-lg h-auto backdrop-blur-md hover:text-blue-300 transition-all duration-300 ease-in-out">
              <Globe className="w-5 h-5" />
              Interactive Map
            </Button>
          </div>

          <Separator className="mt-16 bg-white/10" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center pt-8 w-full">
            <StatItem number="25,000+" label="NEOs Tracked" />
            <StatItem number="1.2M" label="Data Points/Day" />
            <StatItem number="0.05s" label="Latency" />
            <StatItem number="24/7" label="Monitoring" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const StatItem = ({ number, label }) => (
  <div className="flex flex-col">
    <span className="text-2xl md:text-3xl font-bold text-white mb-1">{number}</span>
    <span className="text-xs md:text-sm text-gray-500 uppercase tracking-widest">{label}</span>
  </div>
);

const RocketIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

export default Hero;
