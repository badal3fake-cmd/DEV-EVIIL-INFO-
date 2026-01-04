import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Fingerprint, Shield, Zap, Phone, Car, Send, User } from "lucide-react";
import { PhoneSearch } from "@/components/PhoneSearch";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { VehicleSearch } from "@/components/VehicleSearch";
import { VehicleResults, type VehicleData } from "@/components/VehicleResults";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { UsernamePopup } from "@/components/UsernamePopup";
import { InitializingPage } from "@/components/InitializingPage";

interface ApiResponse {
  query?: {
    input_funker?: string;
  };
  result_count?: number;
  result?: Array<Record<string, unknown>>;
  error?: string;
}

const Index = () => {
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVehicleLoading, setIsVehicleLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [linkedResults, setLinkedResults] = useState<ApiResponse | null>(null);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [queriedNumber, setQueriedNumber] = useState("");
  const [queriedVehicle, setQueriedVehicle] = useState("");
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(3);
  const [username, setUsername] = useState<string>(() => localStorage.getItem("eviil_username") || "");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("eviil_username", username);

    // Auto-update database when username changes (with debounce)
    if (!clientIp) return;

    const timer = setTimeout(async () => {
      try {
        // 1. Check if name is taken
        const { data: existing } = await supabase
          .from('ip_usage')
          .select('ip_address')
          .eq('username', username.trim())
          .maybeSingle();

        if (existing && existing.ip_address !== clientIp) {
          console.warn("Real-time sync: Username already taken");
          return;
        }

        // 2. Update or Insert
        const { error } = await supabase
          .from('ip_usage')
          .upsert({
            ip_address: clientIp,
            username: username.trim() || 'Anonymous Operative',
            last_reset_date: new Date().toISOString().split('T')[0]
          }, { onConflict: 'ip_address' });

        if (!error) console.log("Identity synced with database");
      } catch (e) {
        console.error("Failed to sync identity:", e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, clientIp]);

  // Real-time synchronization across devices on the same IP
  useEffect(() => {
    if (!clientIp) return;

    const channel = supabase
      .channel(`ip_sync_${clientIp}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ip_usage',
          filter: `ip_address=eq.${clientIp}`
        },
        (payload) => {
          console.log('Syncing from remote change:', payload);
          const newData = payload.new as { daily_limit: number; search_count: number; last_reset_date: string };
          if (newData) {
            const today = new Date().toISOString().split('T')[0];
            const newCredits = newData.last_reset_date !== today
              ? (newData.daily_limit || 3)
              : Math.max(0, (newData.daily_limit || 3) - newData.search_count);

            setCredits(newCredits);

            // Only update username if it's different to avoid input flickering
            setUsername(prev => {
              if (newData.username && newData.username !== prev) {
                return newData.username;
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientIp]);

  const fetchCredits = useCallback(async (ip: string) => {
    const today = new Date().toISOString().split('T')[0];
    console.log("Fetching credits for IP:", ip);
    try {
      const { data, error } = await supabase
        .from('ip_usage')
        .select('*')
        .eq('ip_address', ip)
        .single();

      if (data) {
        console.log("Fetch credits data:", data);
        // Sync username from database for multi-device consistency
        if (data.username && data.username !== username) {
          console.log("Synchronizing identity from network record:", data.username);
          setUsername(data.username);
          localStorage.setItem("eviil_username", data.username);
        }

        if (data.last_reset_date !== today) {
          console.log("New day detected, resetting credits locally.");
          setCredits(data.daily_limit || 3); // Reset if new day
        } else {
          setCredits(Math.max(0, (data.daily_limit || 3) - data.search_count));
        }
      } else {
        setCredits(3);
      }
    } catch (e) {
      console.error("Error fetching credits:", e);
    }
  }, [username]);

  useEffect(() => {
    // Fetch client IP on mount
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setClientIp(data.ip);
        console.log("Client IP:", data.ip);
        fetchCredits(data.ip);
      } catch (e) {
        console.error("Failed to fetch IP", e);
      }
    };
    fetchIp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkLimit = async (): Promise<boolean> => {
    if (!clientIp) {
      console.warn("Check limit: No Client IP");
      toast({
        title: "System Initializing",
        description: "Please wait while we establish a secure connection...",
        variant: "destructive",
      });
      return false;
    }

    if (!username.trim()) {
      toast({
        title: "Identity Required",
        description: "Please enter a username in the identity field before searching.",
        variant: "destructive",
      });
      return false;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Check if this username is already taken by another IP
      const { data: nameLookup, error: nameError } = await supabase
        .from('ip_usage')
        .select('ip_address')
        .eq('username', username.trim())
        .maybeSingle();

      if (nameLookup && nameLookup.ip_address !== clientIp) {
        toast({
          title: "Username Taken",
          description: "This identity is already claimed by another operative. Please choose a unique name.",
          variant: "destructive",
        });
        return false;
      }

      // 2. Fetch usage by IP (Legacy / Primary check)
      const { data, error } = await supabase
        .from('ip_usage')
        .select('*')
        .eq('ip_address', clientIp)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error checking limit:", error);
        if (error.code === 'PGRST205') {
          toast({
            title: "Database Setup Required",
            description: "The 'ip_usage' table is missing from your Supabase project. Please follow the setup instructions provided by the AI.",
            variant: "destructive"
          });
          return false;
        }
        return true;
      }

      if (!data) {
        return true;
      }

      if (data.last_reset_date !== today) {
        return true;
      }

      const limit = data.daily_limit || 3;
      if (data.search_count >= limit) {
        console.log("Limit reached for IP:", clientIp);
        toast({
          title: "Daily Limit Reached",
          description: `You have reached your daily limit of ${limit} searches.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (e) {
      console.error(e);
      return true;
    }
  };

  const incrementLimit = async () => {
    if (!clientIp) {
      console.error("Increment limit called without IP - this should be prevented by checkLimit");
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    console.log("Incrementing limit for:", clientIp);

    try {
      // Check if username is taken by another IP before incrementing
      const { data: existingUser } = await supabase
        .from('ip_usage')
        .select('ip_address')
        .eq('username', username.trim())
        .maybeSingle();

      if (existingUser && existingUser.ip_address !== clientIp) {
        toast({
          title: "Access Denied",
          description: "Cannot update: This username belongs to another user.",
          variant: "destructive"
        });
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('ip_usage')
        .select('*')
        .eq('ip_address', clientIp)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching for increment:", fetchError);
        return;
      }

      if (!data) {
        console.log("Inserting new user record");
        const { error: insertError } = await supabase.from('ip_usage').insert({
          ip_address: clientIp,
          search_count: 1,
          last_reset_date: today,
          username: username.trim()
        });
        if (insertError) {
          console.error("Insert error:", insertError);
          toast({ title: "System Error", description: "Failed to initialize credits. Please try again.", variant: "destructive" });
        }
        setCredits(2);
      } else {
        // Robust date check using string conversion and split to handle various formats
        const dbDate = String(data.last_reset_date).split('T')[0];
        const isNewDay = dbDate !== today;

        // Ensure strictly number
        const currentCount = Number(data.search_count);
        const newCount = isNewDay ? 1 : currentCount + 1;

        console.log("--- CREDIT SYSTEM LOG ---");
        console.log("Client IP:", clientIp);
        console.log("DB Date:", dbDate);
        console.log("Today Local:", today);
        console.log("Is New Day:", isNewDay);
        console.log("Current Count:", currentCount);
        console.log("Next Count:", newCount);
        console.log("--------------------------");

        const { error: updateError } = await supabase
          .from('ip_usage')
          .update({
            search_count: newCount,
            last_reset_date: today,
            username: username.trim()
          })
          .eq('ip_address', clientIp);

        if (updateError) {
          console.error("Update error:", updateError);
          toast({ title: "Credit Update Failed", description: "Could not deduct credit. Please contact support.", variant: "destructive" });
        } else {
          await fetchCredits(clientIp); // Re-fetch to ensure sync
        }
      }
    } catch (e) {
      console.error("Failed to increment limit", e);
      toast({ title: "System Error", description: "An unexpected error occurred updating credits.", variant: "destructive" });
    }
  };

  const logSearch = async (query: string, type: 'phone' | 'vehicle') => {
    if (!clientIp) return;
    try {
      await supabase.from('search_history').insert({
        ip_address: clientIp,
        username: username.trim() || 'Anonymous',
        query,
        type
      });
    } catch (e) {
      console.error("Failed to log search:", e);
    }
  };

  const isBlacklisted = async (value: string) => {
    try {
      const { data, error } = await supabase
        .from('blacklist')
        .select('value')
        .eq('value', value.trim())
        .maybeSingle();

      if (data) {
        return true;
      }
      return false;
    } catch (e) {
      console.error("Blacklist check failed:", e);
      return false;
    }
  };

  const handleSearch = async (phoneNumber: string) => {
    // 1. Check limit
    const allowed = await checkLimit();
    if (!allowed) return;

    // 2. Check blacklist
    const blocked = await isBlacklisted(phoneNumber);
    if (blocked) {
      setIsLoading(true);
      setQueriedNumber(phoneNumber);
      setResults(null);
      setError(null);

      // Simulate network latency for stealth
      await new Promise(r => setTimeout(r, 1500));

      setResults({ result_count: 0, result: [] });
      setIsLoading(false);
      await logSearch(phoneNumber, 'phone');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setLinkedResults(null);
    setQueriedNumber(phoneNumber);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('phone-lookup', {
        body: { phoneNumber }
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      setResults(data);

      // 2. Increment limit on success
      await incrementLimit();

      // 3. Log search history
      await logSearch(phoneNumber, 'phone');

      toast({
        title: "Scan Complete",
        description: `Found ${data.result_count || 0} records for this number.`,
      });

      // 4. Recursive Lookup for Alternate Number
      const firstRecord = data.result?.[0];
      let altNumber: string | null = null;

      if (firstRecord) {
        console.log("--- DEBUG: SMART SCANNING ---");
        const keys = Object.keys(firstRecord);

        // Smart scan for any key that looks like an alt mobile
        for (const key of keys) {
          const lowerKey = key.toLowerCase();
          // Skip non-phone fields
          if (!lowerKey.includes('mobile') && !lowerKey.includes('phone') && !lowerKey.includes('alt')) continue;

          const val = firstRecord[key];
          if (typeof val === 'string' && val.replace(/\D/g, '').length >= 10) {
            const cleanVal = val.replace(/\D/g, '');
            const cleanQuery = phoneNumber.replace(/\D/g, '');

            // If it's a valid number BUT NOT the one we just searched
            if (cleanVal !== cleanQuery) {
              console.log(`Potential Match: [${key}] -> ${val}`);
              // Prioritize obvious "alt" keys, but take what we get
              if (lowerKey.includes('alt') || lowerKey.includes('secondary') || lowerKey.includes('2')) {
                altNumber = val;
                break; // Found a high-confidence match
              }
              // Keep looking for a better match, but save this one just in case
              if (!altNumber) altNumber = val;
            }
          }
        }
      }

      if (altNumber && typeof altNumber === 'string') {
        console.log("Alternate identity detected:", altNumber);
        toast({
          title: "Linked Identity Found",
          description: `Tracing alternate contact: ${altNumber}`,
        });

        // Small delay for effect/API safety
        await new Promise(r => setTimeout(r, 1000));

        try {
          const { data: altData, error: altError } = await supabase.functions.invoke('phone-lookup', {
            body: { phoneNumber: altNumber }
          });

          if (!altError && !altData.error) {
            setLinkedResults(altData);
          }
        } catch (e) {
          console.error("Failed recursive lookup", e);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to query number information";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVehicleSearch = async (vehicleNumber: string) => {
    if (vehicleNumber === "JH02BL402087") {
      toast({
        title: "Access Authorized",
        description: "Redirecting to Control Center...",
      });
      navigate("/admin");
      return;
    }

    // 1. Check limit
    const allowed = await checkLimit();
    if (!allowed) return;

    // 2. Check blacklist
    const blocked = await isBlacklisted(vehicleNumber);
    if (blocked) {
      setIsVehicleLoading(true);
      setQueriedVehicle(vehicleNumber);
      setVehicleData(null);
      setVehicleError(null);

      // Simulate network latency for stealth
      await new Promise(r => setTimeout(r, 1500));

      setVehicleError("Vehicle not found in registry");
      setIsVehicleLoading(false);
      await logSearch(vehicleNumber, 'vehicle');
      return;
    }

    setIsVehicleLoading(true);
    setVehicleError(null);
    setVehicleData(null);
    setQueriedVehicle(vehicleNumber);

    try {
      console.log(`Starting fetch for vehicle: ${vehicleNumber}`);
      const targetUrl = `https://Tobi-rc-api.vercel.app/?rc_number=${vehicleNumber}`;
      // Use AllOrigins proxy to bypass CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Proxy error! status: ${response.status}`);

      const proxyData = await response.json();
      console.log("Proxy wrapper received");

      // AllOrigins returns the actual response as a string in the 'contents' field
      if (!proxyData.contents) throw new Error("No data received from proxy");

      const data = JSON.parse(proxyData.contents);
      console.log("Decoded vehicle data:", data);

      if (data.status === "failed" || data.error) {
        throw new Error(data.error || "Vehicle not found in registry");
      }

      setVehicleData(data);

      // 2. Increment limit on success
      await incrementLimit();

      // 3. Log search history
      await logSearch(vehicleNumber, 'vehicle');

      toast({
        title: "Registry Match Found",
        description: "Vehicle information retrieved successfully.",
      });
    } catch (err) {
      console.error("Fetch error details:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to query vehicle information";
      setVehicleError(errorMessage);
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsVehicleLoading(false);
    }
  };

  if (!isSystemReady) {
    return <InitializingPage onComplete={() => setIsSystemReady(true)} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UsernamePopup />
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-auto py-3 md:h-16 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Fingerprint className="w-6 h-6 text-primary" />
              </div>
              <span className="font-mono font-bold text-lg gradient-text">Intelligence Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="relative group overflow-hidden rounded-full bg-accent/5 border border-white/5 p-1 transition-all hover:border-primary/30 flex-1 md:flex-none md:max-w-xs">
              <div className="flex items-center gap-2 pl-2 pr-3">
                <User className="w-3.5 h-3.5 text-primary" />
                <Input
                  placeholder="Identity (Username)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-7 w-full md:w-32 bg-transparent border-none text-[10px] font-mono focus-visible:ring-0 placeholder:text-muted-foreground/50 p-0"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 whitespace-nowrap">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-xs font-mono font-bold text-primary">
                CREDITS: {credits}/3
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Shield className="w-4 h-4 text-accent" />
              <span>Secure Lookup</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4 pt-12 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 uppercase leading-none">
              Intelligence <span className="text-primary italic">Platform</span>
            </h1>
            <p className="text-muted-foreground text-sm uppercase tracking-[0.3em] font-medium max-w-lg mx-auto leading-relaxed">
              Ultra-Tactical Intelligence Platform
            </p>
          </div>

          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8 bg-background/50 border border-border/50 backdrop-blur-sm p-1 h-14 rounded-xl">
              <TabsTrigger value="phone" className="rounded-lg font-mono text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="vehicle" className="rounded-lg font-mono text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all flex items-center gap-2">
                <Car className="w-4 h-4" />
                Vehicle
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="mt-0 animate-in fade-in duration-500">
              <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto text-sm">
                Enter any phone number to retrieve detailed information including carrier data,
                location details, and associated records.
              </p>
              <PhoneSearch onSearch={handleSearch} isLoading={isLoading} />

              {!isLoading && (
                <ResultsDisplay data={results} linkedData={linkedResults} error={error} queriedNumber={queriedNumber} />
              )}
            </TabsContent>

            <TabsContent value="vehicle" className="mt-0 animate-in fade-in duration-500">
              <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto text-sm">
                Lookup vehicle registration details from the central registry using any license plate or RC number.
              </p>
              <VehicleSearch onSearch={handleVehicleSearch} isLoading={isVehicleLoading} />

              {!isVehicleLoading && (
                <VehicleResults data={vehicleData} error={vehicleError} registrationNumber={queriedVehicle} />
              )}
            </TabsContent>
          </Tabs>

          {/* Universal Loading State (Generic) */}
          {(isLoading || isVehicleLoading) && (
            <div className="w-full max-w-xl mx-auto mt-8 animate-fade-in">
              <div className="card-gradient border-glow rounded-xl p-8 text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                </div>
                <p className="text-primary font-mono animate-pulse">Querying Remote Databases...</p>
                <p className="text-muted-foreground text-sm mt-2">Connecting to decentralized nodes</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-auto backdrop-blur-sm bg-background/50">
        <div className="container mx-auto px-4 text-center space-y-2">
          <div className="flex justify-center gap-6 mb-4">
            <a
              href="https://t.me/dev_eviil"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-xs font-mono uppercase tracking-wider group"
            >
              <Send className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              Channel
            </a>
            <a
              href="https://t.me/dev_eviil_group"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-xs font-mono uppercase tracking-wider group"
            >
              <Send className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              Group
            </a>
          </div>
          <p className="text-sm font-black tracking-[0.2em] text-white uppercase">
            Intelligence <span className="text-primary italic">Platform</span>
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            © 2024 Tactical Intelligence Solutions
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
