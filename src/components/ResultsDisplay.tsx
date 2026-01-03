import { AlertCircle, CheckCircle, Database, Send } from "lucide-react";
import { ResultCard } from "./ResultCard";

interface ApiResponse {
  query?: {
    input_funker?: string;
  };
  result_count?: number;
  result?: Array<Record<string, unknown>>;
  error?: string;
}

interface ResultsDisplayProps {
  data: ApiResponse | null;
  linkedData?: ApiResponse | null;
  error: string | null;
  queriedNumber: string;
}

export const ResultsDisplay = ({ data, linkedData, error, queriedNumber }: ResultsDisplayProps) => {
  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8 animate-fade-in">
        <div className="card-gradient border border-destructive/30 rounded-xl p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Error</h3>
          </div>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const results = data.result || [];
  const resultCount = data.result_count || 0;
  const linkedResults = linkedData?.result || [];

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 space-y-6 animate-fade-in">
      {/* Query Info Header */}
      <div className="card-gradient border-glow rounded-xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono">Query Results</p>
              <p className="text-xl font-mono text-foreground">{queriedNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span className="text-accent font-mono text-sm">
              {resultCount} {resultCount === 1 ? 'Record' : 'Records'} Found
            </span>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div className="grid gap-4">
          {results.map((result, index) => (
            <ResultCard key={index} result={result} index={index} />
          ))}
        </div>
      ) : (
        <div className="card-gradient border-glow rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No detailed records available for this number.</p>
        </div>
      )}

      {/* Linked Identity Section */}
      {linkedResults.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 mb-4 mt-8 px-2">
            <div className="h-px bg-primary/20 flex-1"></div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Send className="w-3 h-3 rotate-45" />
              Linked Intelligence
            </span>
            <div className="h-px bg-primary/20 flex-1"></div>
          </div>

          <div className="grid gap-4">
            {linkedResults.map((result, index) => (
              <ResultCard key={`linked-${index}`} result={result} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Telegram Community Links */}
      <div className="card-gradient border-glow rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Join our Community</p>
        <div className="flex flex-wrap justify-center gap-6">
          <a
            href="https://t.me/dev_eviil"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all group"
          >
            <Send className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-mono text-sm font-bold uppercase tracking-wider">Join Channel</span>
          </a>
          <a
            href="https://t.me/dev_eviil_group"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary-foreground hover:bg-secondary/20 transition-all group"
          >
            <Send className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="font-mono text-sm font-bold uppercase tracking-wider">Join Group</span>
          </a>
        </div>
      </div>
    </div>
  );
};
