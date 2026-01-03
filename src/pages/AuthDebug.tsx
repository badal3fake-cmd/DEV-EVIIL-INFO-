import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AuthDebug = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [email, setEmail] = useState("devil01hzb@gmail.com");
    const [password, setPassword] = useState("JH02BL402087");

    const log = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const checkSession = async () => {
        log("Checking session...");
        const { data, error } = await supabase.auth.getSession();
        if (error) log(`Session Error: ${error.message}`);
        else log(`Session Data: ${JSON.stringify(data.session?.user || 'No Active Session')}`);
    };

    const tryLogin = async () => {
        log(`Attempting login for ${email}...`);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            log(`LOGIN FAILED: ${error.message} (Code: ${error.status})`);
            console.error(error);
        } else {
            log(`LOGIN SUCCESS: User ID ${data.user.id}`);
        }
    };

    const trySignUp = async () => {
        log(`Attempting signup for ${email}...`);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username: "Admin" }
            }
        });
        if (error) {
            log(`SIGNUP FAILED: ${error.message} (Code: ${error.status})`);
        } else {
            log(`SIGNUP RESULT: User ID ${data.user?.id} (Identities: ${data.user?.identities?.length})`);
            if (data.user?.identities?.length === 0) {
                log("WARNING: User already exists but identities is empty (likely email/password login linked to existing account or limitation).");
            }
        }
    };

    return (
        <div className="min-h-screen bg-black text-green-400 p-8 font-mono text-xs">
            <h1 className="text-xl font-bold mb-4 text-white">Auth Debugger</h1>

            <div className="flex gap-4 mb-8">
                <button onClick={checkSession} className="bg-blue-900/50 border border-blue-500 px-4 py-2 rounded hover:bg-blue-800">Check Session</button>
                <button onClick={tryLogin} className="bg-green-900/50 border border-green-500 px-4 py-2 rounded hover:bg-green-800">Try Login</button>
                <button onClick={trySignUp} className="bg-red-900/50 border border-red-500 px-4 py-2 rounded hover:bg-red-800">Force Signup</button>
            </div>

            <div className="bg-gray-900 p-4 rounded border border-gray-700 h-96 overflow-y-auto">
                {logs.map((l, i) => <div key={i} className="mb-1 border-b border-gray-800 pb-1">{l}</div>)}
            </div>
        </div>
    );
};

export default AuthDebug;
