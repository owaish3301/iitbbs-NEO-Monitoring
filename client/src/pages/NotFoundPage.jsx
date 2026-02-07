import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home } from 'lucide-react'

function NotFoundPage() {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center px-4">
            {/* Decorative gradient glowing orbs - matching Hero */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[96px] -z-10 pointer-events-none" />

            {/* Animated Stars */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            opacity: Math.random() * 0.5 + 0.2
                        }}
                    />
                ))}
            </div>

            <div className="text-center relative z-10">
                {/* 404 Number */}
                <h1 className="text-[150px] md:text-[200px] font-bold leading-none tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">
                        404
                    </span>
                </h1>

                {/* Message */}
                <div className="mt-4 mb-10">
                    <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
                        Lost in Space
                    </h2>
                    <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
                        The page you're looking for has drifted into the unknown cosmos.
                        Let's get you back on track.
                    </p>
                </div>

                {/* Navigation Buttons - matching Hero button styles */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link to="/">
                        <Button className="group relative bg-white text-black px-8 py-4 rounded-xl font-bold text-lg h-auto hover:bg-gray-200">
                            <Home className="w-5 h-5" />
                            Return Home
                        </Button>
                    </Link>
                    <Link to="/home">
                        <Button
                            variant="outline"
                            className="bg-white/5 border-white/10 hover:bg-white/20 hover:text-white text-white px-8 py-4 rounded-xl font-bold text-lg h-auto backdrop-blur-md transition-all duration-300"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Go to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Rocket Icon */}
                <div className="mt-16 animate-bounce">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-12 h-12 mx-auto text-gray-500"
                    >
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                    </svg>
                </div>
            </div>
        </div>
    )
}

export default NotFoundPage
