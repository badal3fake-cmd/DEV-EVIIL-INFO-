import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const UsernamePopup = () => {
    const [open, setOpen] = useState(false);
    const [username, setUsername] = useState("");

    useEffect(() => {
        const storedUsername = localStorage.getItem("eviil_username");
        if (!storedUsername) {
            setOpen(true);
        }
    }, []);

    const handleSubmit = () => {
        if (username.trim()) {
            localStorage.setItem("eviil_username", username.trim());
            setOpen(false);
            window.location.reload(); // Optional: Reload to reflect changes if needed, but for now just close
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            // Prevent closing if no username is set
            if (!val && !localStorage.getItem("eviil_username")) {
                return;
            }
            setOpen(val);
        }}>
            <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Welcome!</DialogTitle>
                    <DialogDescription>
                        Please enter your username to get started.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 py-4">
                    <Input
                        id="username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSubmit();
                            }
                        }}
                    />
                </div>
                <DialogFooter className="">
                    <Button type="button" onClick={handleSubmit} className="w-full" disabled={!username.trim()}>
                        Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
