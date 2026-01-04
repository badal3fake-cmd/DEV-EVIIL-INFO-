import { useEffect, useState } from "react";
import { Shield, Lock, Cpu, Database, Wifi } from "lucide-react";

export const InitializingPage = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [log, setLog] = useState<string[]>([]);
    const [accessGranted, setAccessGranted] = useState(false);
    const [hexString, setHexString] = useState("");

    const logs = [
        "INITIALIZING SECURE KERNEL...",
        "MOUNTING ENCRYPTED FILE SYSTEMS...",
        "VERIFYING CRYPTOGRAPHIC SIGNATURES...",
        "BYPASSING FIREWALL PROTCOLS...",
        "ESTABLISHING SECURE UPLINK NODE...",
        "SYNCHRONIZING WITH DECENTRALIZED MESH...",
        "INTERCEPTING DATA STREAMS...",
        "DECRYPTING PAYLOAD..."
    ];

    // Random Hex String Effect
    useEffect(() => {
        const chars = "0123456789ABCDEF";
        const interval = setInterval(() => {
            let str = "";
            for (let i = 0; i < 32; i++) {
                str += chars[Math.floor(Math.random() * chars.length)];
            }
            setHexString(str);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Main Logic
    useEffect(() => {
        // Progress bar animation
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + 1; // Slightly slower for dramatic effect
            });
        }, 30);

        // Log animation
        let i = 0;
        const logInterval = setInterval(() => {
            if (i < logs.length) {
                setLog((prev) => {
                    const newLogs = [...prev, logs[i]];
                    if (newLogs.length > 6) newLogs.shift(); // Keep only last 6 lines
                    return newLogs;
                });
                i++;
            }
        }, 400);

        // Completion sequence
        const timeout = setTimeout(() => {
            clearInterval(logInterval);
            clearInterval(progressInterval);
            setProgress(100);
            setAccessGranted(true);
            setTimeout(onComplete, 1500); // Wait for "Access Granted" flash
        }, 3500);

        return () => {
            clearInterval(progressInterval);
            clearInterval(logInterval);
            clearTimeout(timeout);
        };
    }, [onComplete]);

    if (accessGranted) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-green-500 font-mono p-4">
                <div className="animate-pulse text-center space-y-4">
                    <div className="border-4 border-green-500 rounded-full p-8 inline-block shadow-[0_0_50px_rgba(34,197,94,0.5)]">
                        <Shield className="w-24 h-24 text-green-500" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-widest text-white animate-glitch drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                        ACCESS GRANTED
                    </h1>
                    <p className="text-green-400 tracking-[0.5em] animate-blink">SYSTEM UNLOCKED</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black text-primary font-mono overflow-hidden flex flex-col items-center justify-center">
            {/* Matrix / Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none matrix-bg animate-pulse"></div>

            {/* Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[10] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>

            <div className="relative z-20 w-full max-w-2xl p-8 border-x border-primary/20 bg-black/80 backdrop-blur-sm">
                {/* Top Decoration */}
                <div className="flex justify-between items-center mb-8 border-b border-primary/30 pb-4">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-75"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-150"></div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                        SECURE_BOOT_SEQUENCE_V2.0.4
                    </div>
                </div>

                {/* Central Icon Cluster */}
                <div className="flex justify-center gap-8 mb-12">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                        <Shield className="w-16 h-16 text-primary relative z-10 animate-game-spin" />
                    </div>
                </div>

                {/* Title with Glitch Effect */}
                <h1 className="text-4xl font-black text-center text-white tracking-tighter mb-2 animate-glitch" data-text="SYSTEM INITIALIZING">
                    SYSTEM INITIALIZING
                </h1>
                <p className="text-center text-primary/60 text-xs tracking-[0.3em] mb-12">
                    ESTABLISHING NEURAL LINK...
                </p>

                {/* Loading Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-[10px] text-primary/70 mb-1 uppercase tracking-wider">
                        <span>Loading Modules</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-primary/10 border border-primary/30 relative overflow-hidden">
                        <div
                            className="h-full bg-primary shadow-[0_0_15px_rgba(45,212,191,0.6)] transition-all duration-100 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50"></div>
                        </div>
                    </div>
                </div>

                {/* Terminal Logs & Hex Dump */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-32">
                    {/* Logs */}
                    <div className="font-mono text-[10px] text-primary/80 space-y-1">
                        {log.map((line, idx) => (
                            <div key={idx} className="flex gap-2 animate-fade-in">
                                <span className="text-primary">{">"}</span>
                                <span className="opacity-80">{line}</span>
                            </div>
                        ))}
                        <span className="animate-blink text-primary">_</span>
                    </div>

                    {/* Hex Dump decoration */}
                    <div className="hidden md:block font-mono text-[10px] text-primary/30 text-right overflow-hidden border-l border-primary/10 pl-4">
                        <div className="opacity-50 blur-[0.5px] whitespace-pre-wrap break-all">
                            {hexString}
                            {hexString}
                        </div>
                    </div>
                </div>

                {/* Footer Status */}
                <div className="mt-8 pt-4 border-t border-primary/30 flex justify-between items-center text-[10px] text-primary/50 uppercase">
                    <div className="flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        <span>Encrypted Connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Wifi className="w-3 h-3 animate-pulse" />
                        <span>Uplink Stable</span>
                    </div>
                </div>

            </div>
        </div>
    );
};
