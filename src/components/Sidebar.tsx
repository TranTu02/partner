import { FileText, Users, FileSpreadsheet, Settings, LayoutDashboard, ShoppingCart, DollarSign, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSwitcher } from "./common/LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import LogoFull from "@/assets/LOGO-FULL.png";

interface SidebarProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function Sidebar({ activeMenu, onMenuClick }: SidebarProps) {
    const { t } = useTranslation();
    const { user, isGuest, logout, hasAccess } = useAuth();

    const allMenuItems = [
        { id: "dashboard", label: t("sidebar.dashboard"), icon: LayoutDashboard },
        { id: "clients", label: t("sidebar.clients"), icon: Users },
        { id: "quotes", label: t("sidebar.quotes"), icon: FileText },
        { id: "orders", label: t("sidebar.orders"), icon: ShoppingCart },
        { id: "parameters", label: t("sidebar.parameters"), icon: FileSpreadsheet },
        { id: "accounting", label: t("sidebar.accounting"), icon: DollarSign },
        { id: "admin", label: t("sidebar.admin"), icon: Settings }, // Added for admin access
        { id: "settings", label: t("sidebar.settings"), icon: Settings },
    ];

    // Filter menu items based on central hasAccess logic from context
    const menuItems = allMenuItems.filter((item) => hasAccess(item.id));

    const getRoleLabel = (): string => {
        if (isGuest) return t("sidebar.guest");
        if (!user) return "";

        // Use the mapped roles object from AuthContext for display
        const sourceRoles = user.roles || {};

        const activeRoles = Object.entries(sourceRoles)
            .filter(([_, isActive]) => isActive)
            .map(([roleKey]) => t(`roles.${roleKey}`, roleKey));

        if (activeRoles.length > 0) return activeRoles.join(", ");
        
        // Fallback to raw identityRoles if mapping is empty but we have data
        if (user.identityRoles && user.identityRoles.length > 0) {
            return user.identityRoles.join(", ");
        }
        
        return "";
    };

    return (
        <div className="w-64 bg-card border-r border-border flex flex-col h-screen overflow-y-auto">
            {/* Organization Section */}
            <div className="p-6 border-b border-border flex justify-center">
                <img src={LogoFull} alt="Organization Logo" className="h-12 w-auto object-contain" />
            </div>

            {/* Menu Items */}
            <nav className="flex-1 py-4">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeMenu === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onMenuClick(item.id)}
                            className={`w-full flex items-center gap-3 px-6 py-3 transition-colors text-sm ${
                                isActive ? "bg-primary/10 text-primary border-r-4 border-primary font-semibold" : "text-muted-foreground hover:bg-muted/50 font-medium"
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Footer Section - User Info + Controls */}
            {(user || isGuest) && (
                <div className="border-t border-border">
                    {/* User Info */}
                    <div className="px-6 py-4 bg-muted/30 border-b border-border">
                        {isGuest ? (
                            <div>
                                <div className="text-sm font-semibold mb-1 text-foreground">{t("sidebar.guest")}</div>
                                <div className="text-xs text-muted-foreground">{t("sidebar.limitedAccess")}</div>
                            </div>
                        ) : (
                            user && (
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">ID: {user.identityId}</div>
                                    <div className="text-sm font-semibold text-foreground">{user.identityName}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-2" title={getRoleLabel()}>
                                        {getRoleLabel()}
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    {/* Controls */}
                    <div className="p-4 space-y-2">
                        <div className="flex justify-between gap-2">
                            <LanguageSwitcher />
                            <ThemeToggle />
                        </div>
                        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-destructive hover:bg-destructive/10 rounded transition-colors text-sm font-medium">
                            <LogOut className="w-5 h-5" />
                            {t("sidebar.logout")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
