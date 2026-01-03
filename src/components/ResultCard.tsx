import { User, MapPin, Building, Phone, Hash, Calendar } from "lucide-react";

interface ResultData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  carrier?: string;
  type?: string;
  [key: string]: unknown;
}

interface ResultCardProps {
  result: ResultData;
  index: number;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => {
  if (!value || value === "N/A") return null;
  
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0 animate-slide-in" style={{ animationDelay: `${Math.random() * 0.3}s` }}>
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{label}</p>
        <p className="text-foreground font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
};

export const ResultCard = ({ result, index }: ResultCardProps) => {
  const formatAddress = () => {
    const parts = [result.address, result.city, result.state, result.zip].filter(Boolean);
    return parts.join(", ") || null;
  };

  return (
    <div 
      className="card-gradient border-glow rounded-xl p-6 animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-mono font-bold">
          {index + 1}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {result.name || "Unknown"}
          </h3>
          <p className="text-xs text-muted-foreground font-mono">Record #{index + 1}</p>
        </div>
      </div>

      <div className="space-y-1">
        <InfoRow icon={User} label="Full Name" value={result.name || ""} />
        <InfoRow icon={MapPin} label="Address" value={formatAddress() || ""} />
        <InfoRow icon={Building} label="Carrier" value={result.carrier || ""} />
        <InfoRow icon={Phone} label="Line Type" value={result.type || ""} />
        
        {/* Display any additional fields */}
        {Object.entries(result).map(([key, value]) => {
          if (['name', 'address', 'city', 'state', 'zip', 'carrier', 'type'].includes(key)) return null;
          if (!value || typeof value === 'object') return null;
          
          return (
            <InfoRow 
              key={key} 
              icon={Hash} 
              label={key.replace(/_/g, ' ').toUpperCase()} 
              value={String(value)} 
            />
          );
        })}
      </div>
    </div>
  );
};
