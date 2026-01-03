import { useState, useEffect } from "react";
import { Fingerprint, Shield, Zap, Phone, Car, Send } from "lucide-react";
import { PhoneSearch } from "@/components/PhoneSearch";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { VehicleSearch } from "@/components/VehicleSearch";
import { VehicleResults } from "@/components/VehicleResults";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApiResponse {
  query?: {
    input_funker?: string;
  };
  result_count?: number;
  result?: Array<Record<string, unknown>>;
  error?: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVehicleLoading, setIsVehicleLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [vehicleData, setVehicleData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [queriedNumber, setQueriedNumber] = useState("");
  const [queriedVehicle, setQueriedVehicle] = useState("");
  const [clientIp, setClientIp] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch client IP on mount
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setClientIp(data.ip);
        console.log("Client IP:", data.ip);
      } catch (e) {
        console.error("Failed to fetch IP", e);
      }
    };
    fetchIp();
  }, []);

  const checkLimit = async (): Promise<boolean> => {
    if (!clientIp) return true; // Fail open if IP lookup fails, or block? Let's fail open for better UX if IP service is down, or maybe block. User said "work through ip", so if no IP, maybe can't track. use Fail Open for now but warn.

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('ip_usage')
        .select('*')
        .eq('ip_address', clientIp)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error("Error checking limit:", error);
        return true; // Let them pass if DB error to avoid blocking valid users during outage
      }

      if (!data) {
        // No record yet, user is fine
        return true;
      }

      // Check dates
      if (data.last_reset_date !== today) {
        // New day, reset logic will happen during increment, so allow.
        return true;
      }

      if (data.search_count >= 3) {
        toast({
          title: "Daily Limit Reached",
          description: "You have reached your daily limit of 3 searches.",
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
    if (!clientIp) return;
    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('ip_usage')
        .select('*')
        .eq('ip_address', clientIp)
        .single();

      if (!data) {
        // Insert new
        await supabase.from('ip_usage').insert({
          ip_address: clientIp,
          search_count: 1,
          last_reset_date: today
        });
      } else {
        // Update
        const isNewDay = data.last_reset_date !== today;
        const newCount = isNewDay ? 1 : data.search_count + 1;
        
        await supabase
          .from('ip_usage')
          .update({
            search_count: newCount,
            last_reset_date: today
          })
          .eq('ip_address', clientIp);
      }
    } catch (e) {
      console.error("Failed to increment limit", e);
    }
  };

  const handleSearch = async (phoneNumber: string) => {
    // 1. Check limit
    const allowed = await checkLimit();
    if (!allowed) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
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
      
      toast({
        title: "Scan Complete",
        description: `Found ${data.result_count || 0} records for this number.`,
      });
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
    // 1. Check limit
    const allowed = await checkLimit();
    if (!allowed) return;

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Fingerprint className="w-6 h-6 text-primary" />
            </div>
            <span className="font-mono font-bold text-lg gradient-text">Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Shield className="w-4 h-4 text-accent" />
            <span>Secure Lookup</span>
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
                <ResultsDisplay data={results} error={error} queriedNumber={queriedNumber} />
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
