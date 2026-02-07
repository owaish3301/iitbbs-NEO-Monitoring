import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Hash, Loader2, Users, Sparkles, Wifi, WifiOff, Smile } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const CommunityChat = () => {
    const { session } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [typingIndicator, setTypingIndicator] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        let isSubscribed = true;
        let channel = null;

        // Fetch initial messages
        const fetchMessages = async () => {
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: true })
                    .limit(50);

                if (error) throw error;
                if (isSubscribed) {
                    setMessages(data || []);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
                if (isSubscribed) {
                    toast.error('Failed to load messages: ' + error.message);
                }
            } finally {
                if (isSubscribed) {
                    setLoading(false);
                }
            }
        };

        fetchMessages();

        // Subscribe to real-time changes with a small delay to avoid race conditions
        const setupRealtimeSubscription = () => {
            if (!isSubscribed) return;

            console.log('Setting up Supabase Realtime subscription...');
            channel = supabase
                .channel('messages-realtime-' + Date.now())
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                    },
                    (payload) => {
                        if (!isSubscribed) return;
                        console.log('New message received via realtime:', payload);
                        setMessages((prev) => {
                            // Prevent duplicates if we already added it optimistically
                            const exists = prev.some(msg => msg.id === payload.new.id);
                            if (exists) {
                                console.log('Message already exists, skipping duplicate');
                                return prev;
                            }
                            return [...prev, payload.new];
                        });
                    }
                )
                .subscribe((status, err) => {
                    if (!isSubscribed) return;
                    console.log('Subscription status:', status, err || '');
                    setIsConnected(status === 'SUBSCRIBED');

                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to messages channel');
                    }
                    if (status === 'CHANNEL_ERROR') {
                        console.error('Realtime channel error:', err);
                        toast.error('Realtime connection failed. Please check if Realtime is enabled in your Supabase project.');
                    }
                    if (status === 'TIMED_OUT') {
                        console.error('Realtime connection timed out - retrying...');
                        // Retry after timeout
                        setTimeout(() => {
                            if (isSubscribed && channel) {
                                supabase.removeChannel(channel);
                                setupRealtimeSubscription();
                            }
                        }, 2000);
                    }
                });
        };

        // Small delay to let React Strict Mode cleanup finish
        const timeoutId = setTimeout(setupRealtimeSubscription, 100);

        return () => {
            isSubscribed = false;
            clearTimeout(timeoutId);
            if (channel) {
                console.log('Cleaning up Supabase channel...');
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!newMessage.trim() || !session?.user) return;

        setSending(true);
        setTypingIndicator(true);

        try {
            const { data, error } = await supabase
                .from('messages')
                .insert([
                    {
                        content: newMessage.trim(),
                        user_id: session.user.id,
                        user_email: session.user.email,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            // Optimistically add message to UI
            setMessages((prev) => [...prev, data]);
            setNewMessage('');
            inputRef.current?.focus();
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send: ' + error.message);
        } finally {
            setSending(false);
            setTypingIndicator(false);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
            date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getAvatarGradient = (email) => {
        const gradients = [
            'from-cyan-400 to-blue-500',
            'from-purple-400 to-pink-500',
            'from-green-400 to-emerald-500',
            'from-amber-400 to-orange-500',
            'from-rose-400 to-red-500',
            'from-indigo-400 to-violet-500',
            'from-teal-400 to-cyan-500',
            'from-fuchsia-400 to-purple-500',
        ];
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
        }
        return gradients[Math.abs(hash) % gradients.length];
    };

    const groupMessagesByDate = (messages) => {
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
    };

    const formatDateDivider = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const groupedMessages = groupMessagesByDate(messages);

    return (
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-white/10 backdrop-blur-xl h-[calc(100vh-180px)] min-h-[500px] flex flex-col shadow-2xl shadow-cyan-500/5">
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Header */}
            <CardHeader className="relative z-10 pb-0 pt-4 px-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                                <MessageSquare className="w-5 h-5 text-cyan-400" />
                            </div>
                            <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-pulse" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-white tracking-tight">
                                Community Chat
                            </CardTitle>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <Users className="w-3 h-3" />
                                NEO Monitoring Network
                            </p>
                        </div>
                    </div>

                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${isConnected
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/15 border border-red-500/30 text-red-400'
                        }`}>
                        <span className="relative flex h-2 w-2">
                            {isConnected && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        </span>
                        {isConnected ? (
                            <span className="flex items-center gap-1">
                                <Wifi className="w-3 h-3" /> Live
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <WifiOff className="w-3 h-3" /> Offline
                            </span>
                        )}
                    </div>
                </div>

                {/* Channel Tabs */}
                <div className="flex gap-2 mt-4 pb-3 overflow-x-auto scrollbar-hide">
                    <Button
                        size="sm"
                        className="group relative overflow-hidden whitespace-nowrap bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg px-4 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <Hash className="w-3.5 h-3.5 mr-1.5" />
                        General
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="whitespace-nowrap text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg px-4 transition-all duration-300"
                    >
                        <Hash className="w-3.5 h-3.5 mr-1.5" />
                        Alerts
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="whitespace-nowrap text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg px-4 transition-all duration-300"
                    >
                        <Hash className="w-3.5 h-3.5 mr-1.5" />
                        Research
                    </Button>
                </div>
            </CardHeader>

            {/* Divider with glow */}
            <div className="relative mx-5">
                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            </div>

            <CardContent className="flex-1 flex flex-col min-h-0 p-5 pt-4">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-full gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
                                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin relative" />
                            </div>
                            <p className="text-sm text-gray-400 animate-pulse">Loading messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-2xl" />
                                <div className="relative p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/10">
                                    <MessageSquare className="w-10 h-10 text-cyan-400/50" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">No messages yet</h3>
                            <p className="text-sm text-gray-400 max-w-[200px]">
                                Be the first to start the conversation with the community!
                            </p>
                        </div>
                    ) : (
                        groupedMessages.map((item) => {
                            if (item.type === 'date') {
                                return (
                                    <div key={item.id} className="flex items-center gap-3 py-4">
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2">
                                            {formatDateDivider(item.date)}
                                        </span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    </div>
                                );
                            }

                            const msg = item;
                            const isCurrentUser = session?.user?.id === msg.user_id;
                            const avatarGradient = getAvatarGradient(msg.user_email);

                            return (
                                <div
                                    key={msg.id}
                                    className={`group flex items-end gap-2.5 py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isCurrentUser ? 'flex-row-reverse' : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <Avatar className="w-8 h-8 ring-2 ring-white/5 flex-shrink-0 mb-5">
                                        <AvatarFallback className={`bg-gradient-to-br ${avatarGradient} text-white text-xs font-bold shadow-lg`}>
                                            {msg.user_email.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Message Content */}
                                    <div className={`flex flex-col max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                        {/* Username & Time */}
                                        <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                            <span className={`text-xs font-semibold ${isCurrentUser ? 'text-cyan-300' : 'text-gray-300'}`}>
                                                {isCurrentUser ? 'You' : msg.user_email.split('@')[0]}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>

                                        {/* Message Bubble */}
                                        <div
                                            className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all duration-200 ${isCurrentUser
                                                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-md shadow-lg shadow-cyan-500/20'
                                                    : 'bg-white/[0.07] text-gray-200 rounded-bl-md border border-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Typing Indicator */}
                    {typingIndicator && (
                        <div className="flex items-center gap-2 py-2 animate-in fade-in duration-200">
                            <div className="flex gap-1 px-4 py-3 bg-white/5 rounded-2xl rounded-bl-md">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="relative mt-4">
                    <div className="relative group">
                        {/* Glow effect on focus */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/50 to-blue-500/50 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />

                        <div className="relative flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-xl p-1.5 group-focus-within:border-cyan-500/50 transition-colors duration-300">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all duration-200"
                            >
                                <Smile className="w-5 h-5" />
                            </Button>

                            <Input
                                ref={inputRef}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 bg-transparent border-0 text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                                disabled={sending}
                            />

                            <Button
                                type="submit"
                                size="sm"
                                disabled={!newMessage.trim() || sending}
                                className={`h-9 w-9 p-0 rounded-lg transition-all duration-300 ${newMessage.trim()
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25 scale-100'
                                        : 'bg-white/5 text-gray-500 scale-95'
                                    }`}
                            >
                                {sending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-[10px] text-gray-500 text-center mt-2">
                        Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-400 font-mono">Enter</kbd> to send
                    </p>
                </form>
            </CardContent>
        </Card>
    );
};

export default CommunityChat;
