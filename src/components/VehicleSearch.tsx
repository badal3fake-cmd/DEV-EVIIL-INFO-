import { useState } from "react";
import { Search, Car } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface VehicleSearchProps {
    onSearch: (vehicleNumber: string) => void;
    isLoading: boolean;
}

export const VehicleSearch = ({ onSearch, isLoading }: VehicleSearchProps) => {
    const [vehicleNumber, setVehicleNumber] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (vehicleNumber.trim()) {
            onSearch(vehicleNumber.trim());
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto animate-fade-in">
            <div className="card-gradient border-glow rounded-xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Car className="w-24 h-24 text-primary" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                    <div className="space-y-2">
                        <label className="text-sm font-mono text-muted-foreground ml-1">
                            Vehicle Registration Number
                        </label>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Ex: MH12AB1234"
                                value={vehicleNumber}
                                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                className="bg-background/50 border-border/50 h-14 pl-4 pr-12 text-lg font-mono tracking-wider focus:ring-primary/50 transition-all uppercase"
                                disabled={isLoading}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                <Car className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-[1.01] active:scale-[0.99] glow-primary"
                        disabled={isLoading || !vehicleNumber.trim()}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-transparent rounded-full animate-spin" />
                                Scanning Registry...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                Fetch Vehicle Intel
                            </span>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
};
