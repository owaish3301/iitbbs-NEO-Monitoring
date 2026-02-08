import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Radar,
    Star,
    Bell,
    Globe2,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Rocket,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';

const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'neo-feed', label: 'NEO Feed', icon: Radar },
    { id: 'watchlist', label: 'Watchlist', icon: Star },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: '3d-viewer', label: '3D Viewer', icon: Globe2 },
    { id: 'community', label: 'Community', icon: MessageSquare },
];

const Sidebar = memo(({ activeView, setActiveView, user, collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
    // Determine visibility based on breakpoint and state
    // Mobile: visible only when mobileOpen is true
    // Desktop (md+): always visible

    return (
        <>
            {/* Mobile Sidebar - Only renders on mobile */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-[280px]
                    bg-black/95 border-r border-white/10 flex flex-col
                    transform transition-transform duration-300 ease-in-out
                    md:hidden
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <SidebarContent
                    activeView={activeView}
                    setActiveView={setActiveView}
                    user={user}
                    collapsed={false}
                    setMobileOpen={setMobileOpen}
                    isMobile={true}
                />
            </aside>

            {/* Desktop Sidebar - Only renders on desktop */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-40
                    bg-black/95 border-r border-white/10 flex-col
                    transition-all duration-300 ease-in-out
                    hidden md:flex
                    ${collapsed ? 'w-20' : 'w-[280px]'}
                `}
            >
                <SidebarContent
                    activeView={activeView}
                    setActiveView={setActiveView}
                    user={user}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    isMobile={false}
                />
            </aside>
        </>
    );
});

const SidebarContent = ({ activeView, setActiveView, user, collapsed, setCollapsed, setMobileOpen, isMobile }) => {
    const navigate = useNavigate();
    const { signout } = useAuth();

    const handleLogout = async () => {
        const result = await signout();
        if (result.success) {
            navigate('/', { replace: true });
        }
    };

    return (
        <>
            {/* Logo Header */}
            <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-3`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
                        <Rocket className="w-6 h-6 text-white" />
                    </div>

                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 whitespace-nowrap"
                            >
                                SkyNetics
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile Close Button */}
                {isMobile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileOpen(false)}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                )}
            </div>

            <Separator className="bg-white/10" />

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;

                    return (
                        <Button
                            key={item.id}
                            variant="ghost"
                            onClick={() => setActiveView(item.id)}
                            className={`
                                w-full h-12 rounded-xl transition-all duration-200 group relative overflow-hidden cursor-pointer
                                ${collapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3'}
                                ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/10'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 hover:shadow-md hover:shadow-white/5 hover:translate-x-1'
                                }
                            `}
                            title={collapsed ? item.label : ''}
                        >
                            {isActive && (
                                <div className="absolute inset-y-0 left-0 w-1 bg-cyan-500 rounded-r-full" />
                            )}

                            <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'group-hover:text-white'}`} />

                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="font-medium whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {isActive && !collapsed && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="ml-auto w-2 h-2 rounded-full bg-cyan-400"
                                />
                            )}
                        </Button>
                    );
                })}
            </nav>

            <Separator className="bg-white/10" />

            {/* User Profile */}
            <div className="p-3">
                <div
                    onClick={() => navigate('/profile')}
                    title="View Profile"
                    className={`
                        flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5
                        cursor-pointer transition-all duration-200
                        hover:bg-white/10 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5
                        ${collapsed ? 'justify-center' : ''}
                    `}
                >
                    <Avatar className="w-9 h-9 border border-cyan-500/30 transition-shadow duration-200 group-hover:shadow-md">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-purple-600 text-white font-bold text-xs">
                            {user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>

                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user?.name || 'Astronaut'}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                                {user?.email || 'user@skynetics.com'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <div className="mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className={`w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-8 ${collapsed ? 'justify-center px-0' : ''}`}
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                        {!collapsed && <span className="ml-2 text-xs">Logout</span>}
                    </Button>
                </div>
            </div>

            {/* Collapse Toggle - Desktop Only */}
            {!isMobile && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black border border-white/20 text-gray-400 hover:text-white hover:bg-white/10 z-50 shadow-xl"
                >
                    {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                </Button>
            )}
        </>
    );
};

Sidebar.displayName = 'Sidebar';
export default Sidebar;
