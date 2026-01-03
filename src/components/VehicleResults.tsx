import { Car, User, Calendar, Droplets, ShieldCheck, Info, MapPin, Send } from "lucide-react";

interface VehicleResultsProps {
    data: any | null;
    error: string | null;
    registrationNumber: string;
}

export const VehicleResults = ({ data, error, registrationNumber }: VehicleResultsProps) => {
    if (error) {
        return (
            <div className="w-full max-w-xl mx-auto mt-8 animate-fade-in">
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
                    <p className="text-destructive font-mono text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (!data || (data.status !== "success" && !data.details)) return null;

    const details = data.details || {};

    // Helper to render info items matching the photo style
    const InfoItem = ({ icon: Icon, label, value, color = "text-primary" }: any) => (
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#0F172A]/40 border border-white/5 hover:border-primary/20 transition-all duration-300 group">
            <div className={`p-3 rounded-xl bg-[#1E293B]/50 border border-white/5 ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground/60 mb-1.5">{label}</p>
                <p className="text-base font-bold text-foreground tracking-tight truncate">{value || "N/A"}</p>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-3xl mx-auto mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[#0B1224] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/5">
                {/* Header Section from Photo */}
                <div className="bg-gradient-to-r from-[#131C31] to-[#0B1224] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_50%,rgba(20,184,166,0.1),transparent_50%)]" />

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="p-4 rounded-full bg-[#131C31] border-2 border-primary/20 relative shadow-[0_0_30px_rgba(20,184,166,0.15)]">
                            <div className="absolute inset-0 rounded-full animate-pulse bg-primary/10" />
                            <Car className="w-8 h-8 text-primary relative z-10" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black font-mono tracking-[-0.05em] text-white uppercase">
                                {registrationNumber}
                            </h2>
                            <p className="text-xs text-primary/60 font-mono tracking-wider mt-1">Vehicle Intelligence Report</p>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <div className="px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            Verified Source
                        </div>
                    </div>
                </div>

                {/* Info Grid Matching Photo */}
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <InfoItem
                            icon={User}
                            label="Registered Owner"
                            value={details["Owner Name"]}
                        />
                        <InfoItem
                            icon={User}
                            label="Father's Name"
                            value={details["Father's Name"] || details["Father Name"] || "NA"}
                        />
                        <InfoItem
                            icon={Car}
                            label="Make & Model"
                            value={details["Maker Model"] || details["Model Name"]}
                        />
                        <InfoItem
                            icon={Droplets}
                            label="Fuel Type"
                            value={details["Fuel Type"]}
                        />
                        <InfoItem
                            icon={Calendar}
                            label="Registration Date"
                            value={details["Registration Date"]}
                        />
                        <InfoItem
                            icon={ShieldCheck}
                            label="Insurance Status"
                            value={details["Insurance Upto"] || details["Insurance Expiry"]}
                            color="text-emerald-400"
                        />
                        <InfoItem
                            icon={Info}
                            label="Vehicle Class"
                            value={details["Vehicle Class"]}
                            color="text-sky-400"
                        />
                    </div>

                    {/* Additional Records Section */}
                    <div className="pt-8 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary/50 mb-4">
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">Location Data</span>
                                </div>
                                <div className="p-5 rounded-2xl bg-[#0F172A]/20 border border-white/5 space-y-4">
                                    <div>
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">RTO</p>
                                        <p className="text-sm font-medium">{details["Registered RTO"]}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Address</p>
                                        <p className="text-sm font-medium leading-relaxed opacity-80">{details["Address"]}</p>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Phone</p>
                                        <p className="text-sm font-mono text-primary">{details["Phone"] || "NA"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary/50 mb-4">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest">Compliance & Registry</span>
                                </div>
                                <div className="p-5 rounded-2xl bg-[#0F172A]/20 border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Owner Serial No</p>
                                        <p className="text-sm font-mono text-white">{details["Owner Serial No"] || "01"}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Fitness Upto</p>
                                        <p className="text-sm font-mono text-primary">{details["Fitness Upto"]}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">PUC Upto</p>
                                        <p className="text-sm font-mono text-primary">{details["PUC Upto"] || details["PUC_Upto"]}</p>
                                    </div>
                                    <div className="pt-2 border-t border-white/5 space-y-3">
                                        <div>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Insurance No</p>
                                            <p className="text-xs font-mono opacity-80 truncate">{details["Insurance No"] || "NA"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-1">PUC No</p>
                                            <p className="text-xs font-mono opacity-80 truncate">{details["PUC No"] || "NA"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Telegram Community Links */}
            <div className="bg-[#0B1224] border border-white/10 rounded-[2rem] p-8 text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.05),transparent_70%)]" />

                <div className="relative z-10 space-y-4">
                    <p className="text-xs font-black tracking-[0.2em] text-primary/60 uppercase">Official Channels</p>
                    <div className="flex flex-wrap justify-center gap-6">
                        <a
                            href="https://t.me/dev_eviil"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-[#0F172A] border border-primary/20 hover:border-primary/50 text-white hover:text-primary transition-all duration-300 group shadow-lg shadow-black/20"
                        >
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <Send className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                            <span className="font-mono text-sm font-bold uppercase tracking-wider">Join Channel</span>
                        </a>
                        <a
                            href="https://t.me/dev_eviil_group"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-[#0F172A] border border-white/10 hover:border-white/30 text-muted-foreground hover:text-white transition-all duration-300 group shadow-lg shadow-black/20"
                        >
                            <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                                <Send className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                            <span className="font-mono text-sm font-bold uppercase tracking-wider">Join Group</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
