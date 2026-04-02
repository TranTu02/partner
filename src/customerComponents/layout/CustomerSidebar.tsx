import { LayoutDashboard, FileText, ShoppingCart, FlaskConical, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import LogoFull from "@/assets/LOGO-FULL.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { customerLogout, CUSTOMER_TOKEN_KEY, CUSTOMER_DATA_KEY } from "@/api/customer";

interface CustomerSidebarProps {
    activeMenu: string;
}

export function CustomerSidebar({ activeMenu }: CustomerSidebarProps) {
    const navigate = useNavigate();

    const menuItems = [
        { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard, path: "/customer/dashboard" },
        { id: "quotes", label: "Báo giá", icon: FileText, path: "/customer/quotes" },
        { id: "orders", label: "Đơn hàng", icon: ShoppingCart, path: "/customer/orders" },
        { id: "parameters", label: "Chỉ tiêu", icon: FlaskConical, path: "/customer/parameters" },
    ];

    const customerInfo = (() => {
        try {
            const raw = localStorage.getItem("customer");
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    })();

    const handleLogout = async () => {
        try {
            await customerLogout({});
        } catch {
            // Ignore network errors — still clear local session
        } finally {
            Cookies.remove(CUSTOMER_TOKEN_KEY);  // Clear customer token only
            localStorage.removeItem(CUSTOMER_DATA_KEY);
            navigate("/customer/login");
        }
    };

    return (
        <div className="w-64 bg-card border-r border-border flex flex-col h-full overflow-y-auto shrink-0">
            {/* Organization Section */}
            <div className="p-6 border-b border-border flex justify-center">
                <img src={LogoFull} alt="Logo" className="h-12 w-auto object-contain" />
            </div>

            {/* Menu Items */}
            <nav className="flex-1 py-4">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors text-sm ${
                                isActive 
                                    ? "bg-primary/10 text-primary border-r-4 border-primary font-semibold" 
                                    : "text-muted-foreground hover:bg-muted/50 font-medium"
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Footer Section */}
            <div className="border-t border-border">
                <div className="px-6 py-4 bg-muted/30 border-b border-border">
                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Mã KH: {customerInfo?.clientId}</div>
                        <div className="text-sm font-semibold text-foreground truncate" title={customerInfo?.clientName}>
                            {customerInfo?.clientName || "Khách hàng"}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-4 space-y-2">
                    <div className="flex justify-end">
                        <ThemeToggle />
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-destructive hover:bg-destructive/10 rounded transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        Thoát
                    </button>
                </div>
            </div>
        </div>
    );
}
