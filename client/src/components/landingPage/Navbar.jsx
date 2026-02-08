import React from 'react';
import { Rocket, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';

const Navbar = () => {
  return (
    <nav className="fixed w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Rocket className="h-8 w-8 text-cyan-500 transition-transform duration-300 group-hover:scale-110" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-400 to-purple-500">
              SkyNetics
            </span>
          </Link>


          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Button variant="link" asChild className="relative text-white hover:text-cyan-300

    no-underline hover:no-underline underline-offset-0

    p-0 h-auto text-sm font-medium

    transform transition-all duration-300 ease-out
    hover:scale-110

    after:absolute after:left-0 after:-bottom-1
    after:h-[2px] after:w-0
    after:bg-cyan-400
    after:shadow-[0_0_10px_rgba(0,240,255,0.8)]
    after:transition-all after:duration-300
    hover:after:w-full" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <Link to='/' className='hover:scale-1'>Home</Link>
              </Button>
              <Button variant="link" asChild className="relative text-white hover:text-cyan-300

    no-underline hover:no-underline underline-offset-0

    p-0 h-auto text-sm font-medium

    transform transition-all duration-300 ease-out
    hover:scale-110

    after:absolute after:left-0 after:-bottom-1
    after:h-[2px] after:w-0
    after:bg-cyan-400
    after:shadow-[0_0_10px_rgba(0,240,255,0.8)]
    after:transition-all after:duration-300
    hover:after:w-full">
                <a href="#features">Features</a>
              </Button>
              <Button variant="link" asChild className="relative text-white hover:text-cyan-300

    no-underline hover:no-underline underline-offset-0

    p-0 h-auto text-sm font-medium

    transform transition-all duration-300 ease-out
    hover:scale-110

    after:absolute after:left-0 after:-bottom-1
    after:h-[2px] after:w-0
    after:bg-cyan-400
    after:shadow-[0_0_10px_rgba(0,240,255,0.8)]
    after:transition-all after:duration-300
    hover:after:w-full">
                <a href="#community">Community</a>
              </Button>
              <Button asChild className="bg-cyan-600/90 hover:bg-cyan-500 text-white px-5 py-2 rounded-full font-medium shadow-lg shadow-cyan-500/20 border border-cyan-400/20 transform hover:scale-105 transition-all h-auto cursor-pointer">
                <Link to="/auth">Login / Register</Link>
              </Button>
            </div>
          </div>

          {/* Mobile menu - Sheet */}
          <div className="-mr-2 flex md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-transparent">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-black/95 backdrop-blur-xl border-white/10 w-72">
                <SheetTitle className="text-white sr-only">Navigation</SheetTitle>
                <div className="flex flex-col space-y-2 mt-8">
                  <Button variant="ghost" asChild className="justify-start text-gray-300 hover:text-cyan-400 hover:bg-transparent text-base font-medium">
                    <a href="#">Home</a>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start text-gray-300 hover:text-cyan-400 hover:bg-transparent text-base font-medium">
                    <a href="#features">Features</a>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start text-gray-300 hover:text-cyan-400 hover:bg-transparent text-base font-medium">
                    <a href="#community">Community</a>
                  </Button>
                  <Button asChild className="mt-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-600/30 text-base font-medium justify-start h-auto py-2 cursor-pointer">
                    <Link to="/auth">Login</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
