import { useState, useEffect, useCallback } from "react";
import { Shield, Users, Activity, Settings, Search, Lock, UserCheck, ShieldAlert, Zap, Clock, History, Globe, X, ExternalLink, ShieldOff, Ban, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Fingerprint, Eye, EyeOff, ShieldCheck } from "lucide-react";

const Admin = () => {
    interface UserProfile {
        ip_address: string;
        username: string | null;
        daily_limit: number | null;
        search_count: number;
        last_reset_date: string;
        created_at?: string;
    }

    interface HistoryEntry {
        id: string;
        created_at: string;
        username: string | null;
        ip_address: string | null;
        query: string | null;
        type: string | null;
    }

    interface BlacklistEntry {
        id: string;
        created_at: string;
        value: string;
        type: 'phone' | 'vehicle';
        reason: string | null;
    }

    const [stats, setStats] = useState({ totalUsers: 0, activeToday: 0 });
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [historySearchTerm, setHistorySearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
    const [blacklistInput, setBlacklistInput] = useState("");
    const [blacklistType, setBlacklistType] = useState<'phone' | 'vehicle'>('phone');
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email === 'devil01hzb@gmail.com') {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.email === 'devil01hzb@gmail.com') {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        fetchAdminData();
        fetchHistory();

        const histChannel = supabase
            .channel('global_intelligence')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'search_history' },
                (payload: { new: HistoryEntry; old: HistoryEntry; eventType: 'INSERT' | 'UPDATE' | 'DELETE' }) => {
                    console.log('Intelligence update received:', payload);
                    if (payload.eventType === 'INSERT') {
                        setHistory(prev => [payload.new, ...prev].slice(0, 100));
                    } else if (payload.eventType === 'DELETE') {
                        setHistory(prev => prev.filter(h => h.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        setHistory(prev => prev.map(h => h.id === payload.new.id ? payload.new : h));
                    }
                }
            )
            .subscribe();

        // 2. Subscribe to USER updates (Operative Database)
        const userChannel = supabase
            .channel('operative_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ip_usage' },
                (payload: { new: UserProfile; eventType: 'INSERT' | 'UPDATE' }) => {
                    console.log('Operative DB event intercepted:', payload);
                    if (payload.eventType === 'INSERT') {
                        setUsers(prev => [payload.new, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setUsers(prev => prev.map(u =>
                            u.ip_address === payload.new.ip_address ? payload.new : u
                        ));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(histChannel);
            supabase.removeChannel(userChannel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchBlacklist();

        const blacklistChannel = supabase
            .channel('blacklist_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'blacklist' },
                () => fetchBlacklist()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(blacklistChannel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAdminData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('ip_usage')
                .select('*')
                .order('last_reset_date', { ascending: false });

            if (error) throw error;

            setUsers(data || []);

            const today = new Date().toISOString().split('T')[0];
            const activeToday = data?.filter(u => u.last_reset_date === today)?.length || 0;

            setStats({
                totalUsers: data?.length || 0,
                activeToday
            });
        } catch (e) {
            console.error("Admin fetch error:", e);
            toast({ title: "Access Error", description: "Failed to load admin telemetry.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const fetchBlacklist = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('blacklist')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setBlacklist(data || []);
        } catch (e) {
            console.error("Blacklist fetch error:", e);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('search_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error("History fetch error:", e);
        }
    }, []);

    const handleIncreaseLimit = async (ip: string, currentLimit: number = 3) => {
        try {
            const newLimit = currentLimit + 1;
            const { error } = await supabase
                .from('ip_usage')
                .update({ daily_limit: newLimit })
                .eq('ip_address', ip);

            if (error) throw error;

            toast({ title: "Limit Increased", description: `User ${ip} limit is now ${newLimit}.` });
            fetchAdminData();
        } catch (e) {
            console.error(e);
            toast({ title: "Update Failed", description: "Could not increase user limit.", variant: "destructive" });
        }
    };

    const handleAddToBlacklist = async () => {
        if (!blacklistInput.trim()) return;
        try {
            const { error } = await supabase
                .from('blacklist')
                .insert({
                    value: blacklistInput.trim(),
                    type: blacklistType,
                    reason: "Manual Admin Interdiction"
                });
            if (error) {
                if (error.code === '23505') {
                    toast({ title: "Already Interdicted", description: "This target is already on the blacklist.", variant: "destructive" });
                } else {
                    throw error;
                }
            } else {
                toast({ title: "Target Interdicted", description: `${blacklistInput} has been added to the security protocols.` });
                setBlacklistInput("");
                fetchBlacklist();
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Interdiction Failed", description: "Failed to update security parameters.", variant: "destructive" });
        }
    };

    const handleRemoveFromBlacklist = async (id: string) => {
        try {
            const { error } = await supabase
                .from('blacklist')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast({ title: "Interdiction Lifted", description: "The target has been removed from the blacklist." });
            fetchBlacklist();
        } catch (e) {
            console.error(e);
            toast({ title: "Protocol Failure", description: "Failed to lift search restriction.", variant: "destructive" });
        }
    };

    const handleDecreaseLimit = async (ip: string, currentLimit: number = 3) => {
        try {
            const newLimit = Math.max(0, currentLimit - 1);
            const { error } = await supabase
                .from('ip_usage')
                .update({ daily_limit: newLimit })
                .eq('ip_address', ip);

            if (error) throw error;

            toast({ title: "Limit Decreased", description: `User ${ip} limit is now ${newLimit}.` });
            fetchAdminData();
        } catch (e) {
            console.error(e);
            toast({ title: "Update Failed", description: "Could not decrease user limit.", variant: "destructive" });
        }
    };

    const handleGlobalReset = async () => {
        if (!confirm("Are you sure you want to reset search counts for ALL users?")) return;

        try {
            const { error } = await supabase
                .from('ip_usage')
                .update({ search_count: 0 });

            if (error) throw error;

            toast({ title: "Global Reset Complete", description: "All search counts have been zeroed." });
            fetchAdminData();
        } catch (e) {
            console.error(e);
            toast({ title: "Reset Failed", description: "System failure during global reset.", variant: "destructive" });
        }
    };

    const handleDeleteHistoryEntry = async (id: string) => {
        if (!confirm("Permanently erase this intelligence record?")) return;
        try {
            const { error } = await supabase
                .from('search_history')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast({ title: "Record Purged", description: "Intelligence entry has been successfully erased." });
            setHistory(prev => prev.filter(h => h.id !== id));
        } catch (e) {
            console.error(e);
            toast({ title: "Erasure Failed", description: "Failed to delete record from system memory.", variant: "destructive" });
        }
    };

    const handleGlobalUpgrade = async () => {
        if (!confirm("INCREASE daily limit for ALL users by 1 unit?")) return;

        try {
            const { data: currentUsers } = await supabase.from('ip_usage').select('ip_address, daily_limit');
            if (!currentUsers) return;

            const updates = currentUsers.map(u =>
                supabase.from('ip_usage').update({ daily_limit: (u.daily_limit || 3) + 1 }).eq('ip_address', u.ip_address)
            );

            await Promise.all(updates);
            toast({ title: "Global Upgrade Success", description: "All operatives received +1 Fuel capacity." });
            fetchAdminData();
        } catch (e) {
            console.error(e);
            toast({ title: "Upgrade Failed", description: "Critical failure during bulk upgrade.", variant: "destructive" });
        }
    };

    const handleGlobalDowngrade = async () => {
        if (!confirm("DECREASE daily limit for ALL users by 1 unit?")) return;

        try {
            const { data: currentUsers } = await supabase.from('ip_usage').select('ip_address, daily_limit');
            if (!currentUsers) return;

            const updates = currentUsers.map(u =>
                supabase.from('ip_usage').update({ daily_limit: Math.max(0, (u.daily_limit || 3) - 1) }).eq('ip_address', u.ip_address)
            );

            await Promise.all(updates);
            toast({ title: "Global Downgrade Success", description: "All operatives system capacity reduced by 1." });
            fetchAdminData();
        } catch (e) {
            console.error(e);
            toast({ title: "Downgrade Failed", description: "Critical failure during bulk downgrade.", variant: "destructive" });
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: loginPassword,
            });

            if (error) throw error;

            if (loginEmail !== 'devil01hzb@gmail.com') {
                await supabase.auth.signOut();
                toast({ title: "Authorization Denied", description: "This identity is not recognized as a Level 7 Administrator.", variant: "destructive" });
                return;
            }

            toast({ title: "Authorization Successful", description: "Welcome back, Administrator." });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid credentials provided.";
            toast({ title: "Access Denied", description: message, variant: "destructive" });
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast({ title: "Session Terminated", description: "You have been securely logged out." });
    };

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Authorization Gate...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-mono">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] animate-pulse"></div>
                </div>

                <div className="w-full max-w-md relative">
                    <div className="bg-black/60 backdrop-blur-3xl border border-primary/20 rounded-3xl p-8 space-y-8 shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)]">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                                <Shield className="w-8 h-8 text-primary" />
                                <div className="absolute inset-0 rounded-full border border-primary/50 animate-ping"></div>
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Authorization Required</h1>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Administrative Access Only</p>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-4">Registry Identity</label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="email"
                                            required
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-all text-white placeholder:text-white/10"
                                            placeholder="administrator@eviil.platform"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-4">Access Key</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:border-primary/50 transition-all text-white placeholder:text-white/10"
                                            placeholder="••••••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isAuthenticating}
                                className="w-full group relative overflow-hidden bg-primary text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                    {isAuthenticating ? (
                                        <Activity className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Fingerprint className="w-4 h-4" />
                                            Establish Session
                                        </>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            </button>
                        </form>

                        <div className="flex items-center justify-center gap-4 text-[8px] uppercase font-bold tracking-[0.2em] text-muted-foreground">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-green-500" /> AES-256 Encrypted</span>
                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-primary" /> Live Monitoring</span>
                        </div>
                    </div>

                    <div className="mt-8 text-center bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <p className="text-[10px] text-red-500 uppercase font-bold tracking-widest leading-relaxed">
                            UNAUTHORIZED ACCESS TO THIS TERMINAL IS A VIOLATION OF PROTOCOL. ALL ATTEMPTS ARE LOGGED.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const filteredUsers = users.filter(user =>
        (user.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (user.ip_address || "").includes(searchTerm)
    );

    const filteredHistory = history.filter(entry =>
        (entry.username?.toLowerCase() || "").includes(historySearchTerm.toLowerCase()) ||
        (entry.ip_address || "").includes(historySearchTerm) ||
        (entry.query || "").includes(historySearchTerm)
    );

    return (
        <div className="min-h-screen bg-background text-foreground font-mono">
            {/* Admin Header */}
            <header className="border-b border-primary/20 bg-black/40 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-primary animate-pulse" />
                        <span className="font-bold tracking-tighter text-xl uppercase">
                            Control <span className="text-primary italic">Center</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGlobalUpgrade}
                            className="bg-primary/5 border border-primary/20 rounded-full px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest hover:bg-primary/20 hover:border-primary/50 transition-all text-primary flex items-center gap-2"
                        >
                            <Shield className="w-3 h-3" />
                            Global +1
                        </button>
                        <button
                            onClick={handleGlobalDowngrade}
                            className="bg-orange-500/5 border border-orange-500/20 rounded-full px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest hover:bg-orange-500/20 hover:border-orange-500/50 transition-all text-orange-500 flex items-center gap-2"
                        >
                            <ShieldAlert className="w-3 h-3 text-orange-500" />
                            Global -1
                        </button>
                        <button
                            onClick={handleGlobalReset}
                            className="bg-red-500/5 border border-red-500/20 rounded-full px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest hover:bg-red-500/20 hover:border-red-500/50 transition-all text-red-500 flex items-center gap-2"
                        >
                            <Zap className="w-3 h-3 text-red-500" />
                            Reset
                        </button>
                        <button
                            onClick={fetchAdminData}
                            disabled={isLoading}
                            className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 border-l border-white/10 pl-4"
                        >
                            <Activity className={`w-3 h-3 ${isLoading ? 'animate-spin' : 'text-green-500'}`} />
                            {isLoading ? 'Sync' : 'Live'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="text-[9px] uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center gap-2 border-l border-white/10 pl-4 ml-2"
                        >
                            <LogOut className="w-3 h-3" />
                            Secure Exit
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-6xl space-y-8 text-white">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-gradient border-glow p-6 rounded-2xl space-y-2 bg-black/40">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs uppercase tracking-wider font-bold">Total Operatives</span>
                            <Users className="w-4 h-4" />
                        </div>
                        <p className="text-4xl font-black">{stats.totalUsers}</p>
                    </div>
                    <div className="card-gradient border-glow p-6 rounded-2xl space-y-2 bg-black/40">
                        <div className="flex items-center justify-between text-muted-foreground focus-within:text-primary">
                            <span className="text-xs uppercase tracking-wider font-bold">Active Today</span>
                            <UserCheck className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-4xl font-black text-primary">{stats.activeToday}</p>
                    </div>
                    <div className="card-gradient border-glow p-6 rounded-2xl space-y-2 bg-black/40">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs uppercase tracking-wider font-bold">System Status</span>
                            <Shield className="w-4 h-4 text-accent" />
                        </div>
                        <p className="text-4xl font-black text-accent uppercase italic tracking-tighter">Operational</p>
                    </div>
                </div>

                <Tabs defaultValue="operatives" className="w-full">
                    <TabsList className="bg-black/40 border border-white/5 p-1 mb-6 self-start">
                        <TabsTrigger value="operatives" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-[10px] font-bold tracking-widest px-6 py-2">
                            <Users className="w-3.5 h-3.5 mr-2" />
                            Operative Database
                        </TabsTrigger>
                        <TabsTrigger value="feed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-[10px] font-bold tracking-widest px-6 py-2">
                            <Globe className="w-3.5 h-3.5 mr-2" />
                            Global Intelligence Feed
                        </TabsTrigger>
                        <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground uppercase text-[10px] font-bold tracking-widest px-6 py-2">
                            <ShieldOff className="w-3.5 h-3.5 mr-2" />
                            System Security
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="operatives" className="space-y-6">
                        {/* User Table */}
                        <div className="card-gradient border border-white/5 rounded-2xl overflow-hidden bg-black/20">
                            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-primary" />
                                    User Intelligence Logs
                                </h2>
                                <div className="relative group min-w-[300px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <input
                                        placeholder="Search identity or IP address..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] uppercase text-muted-foreground border-b border-white/5 bg-black/40">
                                            <th className="px-6 py-4 font-bold tracking-widest">Identity</th>
                                            <th className="px-6 py-4 font-bold tracking-widest">Access Endpoint (IP)</th>
                                            <th className="px-6 py-4 font-bold tracking-widest text-center">Fuel Consumption</th>
                                            <th className="px-6 py-4 font-bold tracking-widest text-center">Actions</th>
                                            <th className="px-6 py-4 font-bold tracking-widest text-right">Last Heartbeat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.length > 0 ? filteredUsers.map((user, i) => (
                                            <tr
                                                key={i}
                                                onClick={() => setSelectedUser(user)}
                                                className="hover:bg-white/[0.04] transition-all group cursor-pointer border-l-2 border-transparent hover:border-primary/50"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                                            {(user.username || "U")[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-primary font-bold tracking-tight">{user.username || "Unknown Operative"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <code className="text-[11px] text-muted-foreground bg-white/5 px-2 py-1 rounded">
                                                        {user.ip_address}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {Array.from({ length: Math.max(3, user.daily_limit || 3) }).map((_, dot) => (
                                                                <div
                                                                    key={dot}
                                                                    className={`w-2 h-2 rounded-full transition-all duration-500 ${dot < user.search_count
                                                                        ? user.search_count >= (user.daily_limit || 3) ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-primary shadow-[0_0_10px_var(--primary)]'
                                                                        : 'bg-white/10'
                                                                        }`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className={`text-[9px] font-bold uppercase tracking-tighter ${user.search_count >= (user.daily_limit || 3) ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                            {user.search_count}/{user.daily_limit || 3} Units
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleIncreaseLimit(user.ip_address, user.daily_limit || 3)}
                                                            className="bg-primary/10 border border-primary/30 rounded px-2 py-1 text-[8px] font-extrabold uppercase tracking-tight hover:bg-primary/30 transition-all text-primary"
                                                        >
                                                            Add Fuel
                                                        </button>
                                                        <button
                                                            onClick={() => handleDecreaseLimit(user.ip_address, user.daily_limit || 3)}
                                                            className="bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1 text-[8px] font-extrabold uppercase tracking-tight hover:bg-orange-500/30 transition-all text-orange-500"
                                                        >
                                                            Drain
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="text-xs tabular-nums text-muted-foreground block">
                                                        {new Date(user.last_reset_date).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic text-sm">
                                                    No operatives found matching your query.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="feed">
                        {/* Intelligence Feed Table */}
                        <div className="card-gradient border border-white/5 rounded-2xl overflow-hidden bg-black/20">
                            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    Real-time Activity Feed
                                </h2>
                                <div className="flex items-center gap-4">
                                    <div className="relative group min-w-[300px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <input
                                            placeholder="Audit interception data..."
                                            value={historySearchTerm}
                                            onChange={(e) => setHistorySearchTerm(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse flex items-center gap-2 whitespace-nowrap">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Intercepting Live Data
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] uppercase text-muted-foreground border-b border-white/5 bg-black/40">
                                            <th className="px-6 py-4 font-bold tracking-widest">Time</th>
                                            <th className="px-6 py-4 font-bold tracking-widest">Operative</th>
                                            <th className="px-6 py-4 font-bold tracking-widest">Type</th>
                                            <th className="px-6 py-4 font-bold tracking-widest">Intercepted Query</th>
                                            <th className="px-6 py-4 font-bold tracking-widest text-right">Endpoint (IP)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredHistory.length > 0 ? filteredHistory.map((entry, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] tabular-nums text-primary/70 font-bold">
                                                        {new Date(entry.created_at).toLocaleTimeString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                                            {(entry.username || "A")[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-bold text-white/80">{entry.username || "Anonymous"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${entry.type === 'phone'
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                        : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                                        }`}>
                                                        {entry.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-[11px] text-primary font-bold tracking-wider">
                                                        {entry.query}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                                    <code className="text-[10px] text-muted-foreground opacity-50">
                                                        {entry.ip_address}
                                                    </code>
                                                    <button
                                                        onClick={() => handleDeleteHistoryEntry(entry.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all group-hover:opacity-100 opacity-0"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic text-sm">
                                                    {historySearchTerm ? "No intercepted data matches your audit query." : "Waiting for incoming intelligence..."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6">
                        {/* Security Interdiction Interface */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Add Interdiction Card */}
                            <div className="card-gradient border border-primary/20 rounded-2xl p-6 bg-black/40 space-y-4">
                                <div className="flex items-center gap-3 text-primary mb-2">
                                    <Ban className="w-5 h-5" />
                                    <h3 className="font-bold uppercase tracking-widest text-xs">New Target Interdiction</h3>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-tighter">
                                    Adding a target to the interdiction list will immediately block all operative search attempts globally.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex bg-black/50 rounded-lg p-1 border border-white/5">
                                        <button
                                            onClick={() => setBlacklistType('phone')}
                                            className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded ${blacklistType === 'phone' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                                        >
                                            Phone
                                        </button>
                                        <button
                                            onClick={() => setBlacklistType('vehicle')}
                                            className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded ${blacklistType === 'vehicle' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                                        >
                                            Vehicle
                                        </button>
                                    </div>
                                    <input
                                        placeholder={blacklistType === 'phone' ? "Enter phone number..." : "Enter vehicle plate..."}
                                        value={blacklistInput}
                                        onChange={(e) => setBlacklistInput(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-xs focus:border-primary/50 outline-none transition-all placeholder:text-white/10"
                                    />
                                    <button
                                        onClick={handleAddToBlacklist}
                                        className="w-full bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShieldOff className="w-3.5 h-3.5" />
                                        Initialize Interdiction
                                    </button>
                                </div>
                            </div>

                            {/* Active Interdictions List */}
                            <div className="lg:col-span-2 card-gradient border border-white/5 rounded-2xl overflow-hidden bg-black/20 flex flex-col">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        Active Security Interdictions
                                    </h2>
                                    <span className="text-[9px] text-muted-foreground font-bold">
                                        {blacklist.length} Targets Restricted
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[9px] uppercase text-muted-foreground border-b border-white/5 bg-black/40">
                                                <th className="px-6 py-4 font-bold tracking-widest">Target Value</th>
                                                <th className="px-6 py-4 font-bold tracking-widest">Category</th>
                                                <th className="px-6 py-4 font-bold tracking-widest">Protocol Date</th>
                                                <th className="px-6 py-4 font-bold tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {blacklist.length > 0 ? blacklist.map((item, i) => (
                                                <tr key={i} className="hover:bg-red-500/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <code className="text-xs font-black text-red-400 tracking-widest">{item.value}</code>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[8px] uppercase font-black px-2 py-0.5 rounded border ${item.type === 'phone' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                                            }`}>
                                                            {item.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                            {new Date(item.created_at).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleRemoveFromBlacklist(item.id)}
                                                            className="bg-white/5 border border-white/10 rounded px-3 py-1 text-[8px] uppercase font-bold hover:bg-green-500/20 hover:border-green-500/50 hover:text-green-500 transition-all text-muted-foreground"
                                                        >
                                                            Lift Restriction
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-20 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-20">
                                                        No active interdictions in system memory.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Operative Dossier Overlay */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        onClick={() => setSelectedUser(null)}
                    ></div>

                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#050505] border border-primary/30 rounded-3xl shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)] overflow-hidden flex flex-col">
                        {/* Dossier Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-black text-primary">
                                    {(selectedUser.username || "U")[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        Operative Dossier: {selectedUser.username || "Unknown"}
                                        <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">TOP SECRET</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Globe className="w-3 h-3" />
                                        Network Endpoint: <span className="font-mono text-white/50">{selectedUser.ip_address}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-500 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Dossier Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Total Consumption</span>
                                    <span className="text-xl font-black text-primary">{selectedUser.search_count} Units</span>
                                </div>
                                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Daily Capacity</span>
                                    <span className="text-xl font-black text-white">{selectedUser.daily_limit || 3} Units</span>
                                </div>
                                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Account Standing</span>
                                    <span className={`text-xl font-black ${selectedUser.search_count >= (selectedUser.daily_limit || 3) ? 'text-red-500' : 'text-green-500'}`}>
                                        {selectedUser.search_count >= (selectedUser.daily_limit || 3) ? 'EXHAUSTED' : 'CLEAR'}
                                    </span>
                                </div>
                                <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Last Heartbeat</span>
                                    <span className="text-xs font-bold text-white/70">
                                        {new Date(selectedUser.last_reset_date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Interception History */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Intercepted Activity Logs
                                </h4>

                                <div className="border border-white/10 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[9px] uppercase text-muted-foreground border-b border-white/10 bg-white/[0.03]">
                                                <th className="px-5 py-3 font-bold">Timestamp</th>
                                                <th className="px-5 py-3 font-bold">Mode</th>
                                                <th className="px-5 py-3 font-bold">Query Data</th>
                                                <th className="px-5 py-3 font-bold text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {history.filter(h => h.ip_address === selectedUser.ip_address).length > 0 ? (
                                                history.filter(h => h.ip_address === selectedUser.ip_address).map((h, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                                        <td className="px-5 py-4 text-[10px] tabular-nums text-white/60">
                                                            {new Date(h.created_at).toLocaleString()}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span className={`text-[8px] uppercase font-black px-2 py-0.5 rounded-full ${h.type === 'phone' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
                                                                }`}>
                                                                {h.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <code className="text-xs font-bold text-primary tracking-wider">{h.query}</code>
                                                        </td>
                                                        <td className="px-5 py-4 text-right flex items-center justify-end gap-3">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteHistoryEntry(h.id);
                                                                }}
                                                                className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic text-xs">
                                                        No historical intelligence found for this endpoint.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Dossier Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
                            <span className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">
                                EVIIL-INC DATA CLASSIFICATION: TOP SECRET
                            </span>
                            <div className="flex items-center gap-2">
                                <button className="bg-primary/20 border border-primary/30 rounded px-3 py-1.5 text-[9px] font-bold uppercase tracking-tight text-primary hover:bg-primary/30 flex items-center gap-2">
                                    <ExternalLink className="w-3 h-3" />
                                    Export Intel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
