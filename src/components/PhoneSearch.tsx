import { useState } from "react";
import { Search, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PhoneSearchProps {
  onSearch: (number: string) => void;
  isLoading: boolean;
}

export const PhoneSearch = ({ onSearch, isLoading }: PhoneSearchProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim()) {
      onSearch(phoneNumber.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Phone className="w-5 h-5" />
        </div>
        <Input
          type="tel"
          placeholder="Enter phone number..."
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="pl-12 h-14 text-lg border-glow bg-card/50 backdrop-blur-sm"
        />
      </div>
      <Button
        type="submit"
        variant="scan"
        size="lg"
        disabled={isLoading || !phoneNumber.trim()}
        className="w-full h-12"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span>Scanning</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Investigate</span>
          </div>
        )}
      </Button>
    </form>
  );
};
