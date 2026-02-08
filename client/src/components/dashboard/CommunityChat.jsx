import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Wifi, WifiOff, Smile, Rocket, ChevronDown, Copy, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// Quick emoji list
const EMOJI_LIST = ['🚀', '🛸', '🌍', '🌙', '⭐', '✨', '☄️', '🔭', '👨‍🚀', '😀', '😂', '😊', '😎', '🤔', '👍', '👏', '🔥', '💯', '❤️', '💙', '🎉', '⚡', '💪', '🙌'];

// Animated star component
const Star = ({ delay, duration, size, top, left }) => (
    <motion.div
        className="absolute rounded-full bg-white"
        style={{ width: size, height: size, top: `${top}%`, left: `${left}%` }}
        animate={{
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.2, 1],
        }}
        transition={{
            duration: duration,
            delay: delay,
            repeat: Infinity,
            ease: "easeInOut"
        }}
    />
);

// Generate random stars
const generateStars = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 3,
        size: Math.random() * 2 + 1,
        top: Math.random() * 100,
        left: Math.random() * 100,
    }));
};

const STARS = generateStars(50);

// Memoized message component
const MessageItem = memo(({ msg, isCurrentUser, avatarColor, formatTime, onCopy, onDelete }) => {
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopy?.();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className={`group flex gap-2.5 py-1.5 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5 ring-2 ring-white/10 shadow-lg">
                <AvatarFallback className={`${avatarColor} text-white text-xs font-bold`}>
                    {msg.user_email.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>

            <div className={`flex flex-col max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <span className={`text-xs font-semibold ${isCurrentUser ? 'text-cyan-300' : 'text-gray-300'}`}>
                        {isCurrentUser ? 'You' : msg.user_email.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-gray-500">{formatTime(msg.created_at)}</span>
                </div>

                <div className="relative flex items-center gap-1.5">
                    <AnimatePresence>
                        {showActions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`flex items-center gap-0.5 ${isCurrentUser ? 'order-first' : 'order-last'}`}
                            >
                                <button
                                    onClick={handleCopy}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                                    title="Copy"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                {isCurrentUser && (
                                    <button
                                        onClick={() => onDelete?.(msg.id)}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words backdrop-blur-sm ${isCurrentUser
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-tr-sm shadow-xl shadow-cyan-500/20'
                        : 'bg-white/10 text-gray-100 rounded-tl-sm border border-white/10 hover:bg-white/15 transition-colors'
                        }`}>
                        {msg.content}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

MessageItem.displayName = 'MessageItem';

const CommunityChat = () => {
    const { session } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [onlineCount] = useState(() => Math.floor(Math.random() * 20) + 5);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const scrollToBottom = useCallback((smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    const handleScroll = useCallback(() => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }, []);

    useEffect(() => {
        scrollToBottom(false);
    }, [messages, scrollToBottom]);

    useEffect(() => {
        let isSubscribed = true;
        let channel = null;

        const fetchMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(100);

                if (error) throw error;
                if (isSubscribed) setMessages(data || []);
            } catch (error) {
                if (isSubscribed) toast.error('Failed to load messages');
            } finally {
                if (isSubscribed) setLoading(false);
            }
        };

        fetchMessages();

        const setupRealtimeSubscription = () => {
            if (!isSubscribed) return;
            channel = supabase
                .channel('messages-realtime-' + Date.now())
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
                    (payload) => {
                        if (!isSubscribed) return;
                        setMessages((prev) => {
                            if (prev.some(msg => msg.id === payload.new.id)) return prev;
                            return [...prev, payload.new];
                        });
                    }
                )
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' },
                    (payload) => {
                        if (!isSubscribed) return;
                        setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
                    }
                )
                .subscribe((status) => {
                    if (!isSubscribed) return;
                    setIsConnected(status === 'SUBSCRIBED');
                });
        };

        const timeoutId = setTimeout(setupRealtimeSubscription, 100);
        return () => {
            isSubscribed = false;
            clearTimeout(timeoutId);
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        const trimmedMessage = newMessage.trim();
        if (!trimmedMessage || !session?.user || sending) return;

        setSending(true);
        const optimisticId = `temp-${Date.now()}`;

        const optimisticMessage = {
            id: optimisticId,
            content: trimmedMessage,
            user_id: session.user.id,
            user_email: session.user.email,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage('');

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([{ content: trimmedMessage, user_id: session.user.id, user_email: session.user.email }])
                .select()
                .single();

            if (error) throw error;
            setMessages((prev) => prev.map(msg => msg.id === optimisticId ? data : msg));
            inputRef.current?.focus();
        } catch (error) {
            setMessages((prev) => prev.filter(msg => msg.id !== optimisticId));
            setNewMessage(trimmedMessage);
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            const { error } = await supabase.from('messages').delete().eq('id', messageId);
            if (error) throw error;
            setMessages((prev) => prev.filter(msg => msg.id !== messageId));
            toast.success('Message deleted');
        } catch (error) {
            toast.error('Failed to delete message');
        }
    };

    const handleEmojiSelect = (emoji) => {
        setNewMessage((prev) => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
        if (e.key === 'Escape') setShowEmojiPicker(false);
    };

    const formatTime = useCallback((timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' +
            date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const getAvatarColor = useCallback((email) => {
        const colors = [
            'bg-gradient-to-br from-cyan-400 to-blue-600',
            'bg-gradient-to-br from-purple-400 to-pink-600',
            'bg-gradient-to-br from-emerald-400 to-teal-600',
            'bg-gradient-to-br from-amber-400 to-orange-600',
            'bg-gradient-to-br from-rose-400 to-red-600',
            'bg-gradient-to-br from-indigo-400 to-violet-600',
        ];
        let hash = 0;
        for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }, []);

    const groupedMessages = (() => {
        const groups = [];
        let currentDate = null;
        messages.forEach((msg) => {
            const msgDate = new Date(msg.created_at).toDateString();
            if (msgDate !== currentDate) {
                groups.push({ type: 'date', date: msgDate, id: `date-${msgDate}` });
                currentDate = msgDate;
            }
            groups.push({ type: 'message', ...msg });
        });
        return groups;
    })();

    const formatDateDivider = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === now.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden">
            {/* ===== STUNNING SPACE BACKGROUND ===== */}
            <div className="absolute inset-0 bg-[#0a0a0f]">
                {/* Deep space gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0d1033] via-[#0a0a0f] to-[#0f0a1a]" />

                {/* Nebula effects */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] opacity-50" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] opacity-40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[200px] opacity-30" />

                {/* Accent glow orbs */}
                <div className="absolute top-20 right-1/4 w-32 h-32 bg-pink-500/20 rounded-full blur-[60px] animate-pulse" />
                <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-cyan-400/20 rounded-full blur-[50px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/3 left-20 w-20 h-20 bg-purple-400/15 rounded-full blur-[40px] animate-pulse" style={{ animationDelay: '2s' }} />

                {/* Animated stars */}
                {STARS.map((star) => (
                    <Star key={star.id} {...star} />
                ))}

                {/* Grid overlay for depth */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}
                />

                {/* Radial vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
            </div>

            {/* ===== HEADER ===== */}
            <header className="relative z-10 flex-shrink-0 flex items-center justify-between h-14 px-5 border-b border-white/[0.08] bg-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                        <Rocket className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white tracking-tight">Mission Control</h1>
                        <p className="text-[11px] text-gray-500">
                            {onlineCount} observers online • {messages.length} transmissions
                        </p>
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                    <span className="relative flex h-2 w-2">
                        {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </span>
                    {isConnected ? <><Wifi className="w-3.5 h-3.5" /> LIVE</> : <><WifiOff className="w-3.5 h-3.5" /> OFFLINE</>}
                </div>
            </header>

            {/* ===== MESSAGES AREA ===== */}
            <main
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="relative z-10 flex-1 overflow-y-auto px-5 md:px-8 lg:px-16 py-4"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
            >
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-2xl animate-pulse" />
                                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin relative" />
                            </div>
                            <span className="text-sm text-gray-400 font-medium">Establishing secure connection...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-5 shadow-2xl">
                                <Rocket className="w-10 h-10 text-cyan-400/70" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Transmissions Yet</h3>
                            <p className="text-sm text-gray-400 max-w-[250px]">Be the first to broadcast a message to the NEO observer network</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {groupedMessages.map((item) => {
                                if (item.type === 'date') {
                                    return (
                                        <div key={item.id} className="flex items-center gap-4 py-5 my-2">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                                {formatDateDivider(item.date)}
                                            </span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                        </div>
                                    );
                                }

                                const msg = item;
                                const isCurrentUser = session?.user?.id === msg.user_id;

                                return (
                                    <MessageItem
                                        key={msg.id}
                                        msg={msg}
                                        isCurrentUser={isCurrentUser}
                                        avatarColor={getAvatarColor(msg.user_email)}
                                        formatTime={formatTime}
                                        onCopy={() => toast.success('Copied!')}
                                        onDelete={handleDeleteMessage}
                                    />
                                );
                            })}
                        </AnimatePresence>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </main>

            {/* Scroll to bottom */}
            <AnimatePresence>
                {showScrollButton && (
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onClick={() => scrollToBottom()}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-4 py-2 rounded-full bg-cyan-500 text-white text-sm font-medium shadow-xl shadow-cyan-500/40 hover:bg-cyan-400 transition-colors"
                    >
                        <ChevronDown className="w-4 h-4" />
                        New messages
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ===== INPUT AREA ===== */}
            <footer className="relative z-10 flex-shrink-0 p-4 border-t border-white/[0.08] bg-black/30 backdrop-blur-xl">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 relative">
                        {/* Emoji Picker */}
                        <div className="relative" ref={emojiPickerRef}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`h-10 w-10 p-0 flex-shrink-0 rounded-xl transition-all ${showEmojiPicker
                                    ? 'text-yellow-400 bg-yellow-400/15'
                                    : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
                                    }`}
                            >
                                <Smile className="w-5 h-5" />
                            </Button>

                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute bottom-14 left-0 p-3 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl z-30"
                                    >
                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10 px-1">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Quick Emojis</span>
                                            <button
                                                type="button"
                                                onClick={() => setShowEmojiPicker(false)}
                                                className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-8 gap-1 w-[220px]">
                                            {EMOJI_LIST.map((emoji, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => handleEmojiSelect(emoji)}
                                                    className="w-7 h-7 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-all hover:scale-125"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Broadcast your message to the cosmos..."
                                className="w-full h-11 bg-white/[0.05] border-white/[0.1] rounded-xl text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all pr-12"
                                disabled={sending}
                                maxLength={1000}
                            />
                            {newMessage.length > 800 && (
                                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-medium ${newMessage.length > 950 ? 'text-red-400' : 'text-gray-500'}`}>
                                    {1000 - newMessage.length}
                                </span>
                            )}
                        </div>

                        <Button
                            type="submit"
                            size="sm"
                            disabled={!newMessage.trim() || sending}
                            className={`h-10 w-10 p-0 flex-shrink-0 rounded-xl transition-all duration-200 ${newMessage.trim()
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 active:scale-95'
                                : 'bg-white/[0.05] text-gray-500 border border-white/10'
                                }`}
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </form>
            </footer>
        </div>
    );
};

export default CommunityChat;
