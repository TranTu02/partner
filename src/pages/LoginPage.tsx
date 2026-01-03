import { useState } from "react";
import { LogIn, UserCircle } from "lucide-react";
import { useAuth, mockUsers } from "../contexts/AuthContext";
import LogoFull from "@/assets/LOGO-FULL.png";

export function LoginPage() {
    const { login, loginAsGuest } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showUserList, setShowUserList] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!username || !password) {
            setError("Vui lòng nhập tên đăng nhập và mật khẩu");
            return;
        }

        const success = login(username, password);
        if (!success) {
            setError("Tên đăng nhập hoặc mật khẩu không đúng");
        }
    };

    const handleSkip = () => {
        loginAsGuest();
    };

    const handleQuickLogin = (username: string, password: string) => {
        setUsername(username);
        setPassword(password);
        login(username, password);
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
                            />
                        </div>

                        {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded text-sm">{error}</div>}

                        <button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded flex items-center justify-center gap-2 transition-colors text-sm font-semibold"
                        >
                            <LogIn className="w-4 h-4" />
                            Đăng nhập
                        </button>

                        <button
                            type="button"
                            onClick={handleSkip}
                            className="w-full bg-card hover:bg-muted/50 text-foreground py-2.5 rounded border border-border flex items-center justify-center gap-2 transition-colors text-sm font-semibold"
                        >
                            <UserCircle className="w-4 h-4" />
                            Tiếp tục với tư cách khách
                        </button>
                    </form>

                    {/* Test Accounts Toggle */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <button onClick={() => setShowUserList(!showUserList)} className="text-primary hover:underline mx-auto block text-sm">
                            {showUserList ? "Ẩn tài khoản test" : "Xem tài khoản test"}
                        </button>

                        {showUserList && (
                            <div className="mt-4 space-y-2 fixed -translate-y-[100%] translate-x-[100%] w-[30%]">
                                <p className="text-xs text-muted-foreground mb-3">Click để đăng nhập nhanh (tất cả mật khẩu: 123456)</p>
                                {mockUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleQuickLogin(user.username, user.password)}
                                        className="w-full text-left px-4 py-3 border border-border rounded hover:border-primary hover:bg-primary/10 transition-colors bg-card"
                                    >
                                        <div className="text-sm font-semibold mb-0.5 text-foreground">{user.fullName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {user.username} • {getRoleLabel(user.role)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="text-center mt-6 text-xs text-muted-foreground">
                    <p>© 2025 CRM LIMS. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}

function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
        Collaborator: "CTV",
        CustomerService: "CSKH/KD",
        Accountant: "Kế toán",
        Client: "Khách hàng",
    };
    return labels[role] || role;
}
