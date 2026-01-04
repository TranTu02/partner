import { useState } from "react";
import { LogIn, UserCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LogoFull from "@/assets/LOGO-FULL.png";

export function LoginPage() {
    const { login, loginAsGuest } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!username || !password) {
            setError("Vui lòng nhập tên đăng nhập và mật khẩu");
            return;
        }

        setIsLoading(true);
        try {
            const success = await login(username, password);
            if (!success) {
                setError("Tên đăng nhập hoặc mật khẩu không đúng, hoặc đã xảy ra lỗi.");
            }
        } catch (err) {
            setError("Đã xảy ra lỗi kết nối.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        loginAsGuest();
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-8 flex justify-center">
                    <img src={LogoFull} alt="CRM Logo" className="h-24 w-auto object-contain" />
                </div>

                {/* Login Card */}
                <div className="bg-card rounded-lg shadow-md p-8 border border-border">
                    <h2 className="text-2xl font-bold mb-2 text-center text-foreground">Đăng nhập hệ thống</h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2 text-foreground">Tên đăng nhập</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                placeholder="Nhập tên đăng nhập"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-2 text-foreground">Mật khẩu</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                placeholder="Nhập mật khẩu"
                                disabled={isLoading}
                            />
                        </div>

                        {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded text-sm">{error}</div>}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded flex items-center justify-center gap-2 transition-colors text-sm font-semibold disabled:opacity-50"
                        >
                            <LogIn className="w-4 h-4" />
                            {isLoading ? "Đang xử lý..." : "Đăng nhập"}
                        </button>

                        <button
                            type="button"
                            onClick={handleSkip}
                            disabled={isLoading}
                            className="w-full bg-card hover:bg-muted/50 text-foreground py-2.5 rounded border border-border flex items-center justify-center gap-2 transition-colors text-sm font-semibold"
                        >
                            <UserCircle className="w-4 h-4" />
                            Tiếp tục với tư cách khách
                        </button>
                    </form>
                </div>

                {/* Footer Info */}
                <div className="text-center mt-6 text-xs text-muted-foreground">
                    <p>© 2025 CRM LIMS. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
