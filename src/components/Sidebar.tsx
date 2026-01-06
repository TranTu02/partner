import { FileText, Users, FileSpreadsheet, Settings, LayoutDashboard, ShoppingCart, DollarSign, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSwitcher } from "./common/LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import LogoFull from "@/assets/LOGO-FULL.png";
import { useEffect, useState } from "react";
import { checkSessionStatus } from "@/api/index";

interface SidebarProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function Sidebar({ activeMenu, onMenuClick }: SidebarProps) {
    const { t } = useTranslation();
    const { user, isGuest, logout } = useAuth();
    // Use 'any' or Partial<UserRole> for local state to avoid strict initialization issues,
    // though ideally we import UserRole. For now, Record<string, boolean> is compatible with the object structure.
    const [roles, setRoles] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchRoles = async () => {
            // Use checkSessionStatus to get the latest roles.
            // Ideally useAuth already has this data, but the prompt specifically asks
            // the sidebar to send to api check-status each load.
            // Note: In a real app, optimize this to not spam the API on every sidebar render if possible,
            // but we will follow instructions.
            try {
                // If we don't have a session ID locally, useAuth usually handles it.
                // Assuming checkAuth or checkSessionStatus uses cookie/stored token internally or we just call it.
                // The client.ts usually handles attaching headers/cookies.
                const res = await checkSessionStatus({});
                if (res.success && res.data?.identity?.roles) {
                    setRoles(res.data.identity.roles);
                }
            } catch (error) {
                console.error("Failed to fetch roles", error);
            }
        };

        if (!isGuest) {
            fetchRoles();
        }
    }, [isGuest]); // Simple dependency, mount-based fetch

    // Determine access based on fetched roles (or specific logic)
    // The previous hasAccess was likely 'role' string based. Now we have a boolean map.
    // We'll define a simple mapping or use the fetched roles directly.
    const hasRoleAccess = (menuId: string): boolean => {
        if (isGuest) return menuId === "dashboard" || menuId === "settings";

        // Use roles from state if available (fresh from API), otherwise fallback to user context
        const roleMap: any = Object.keys(roles).length > 0 ? roles : user?.roles || {};

        if (!roleMap || Object.keys(roleMap).length === 0) return false;

        // Admin Access
        if (roleMap.admin || roleMap.superAdmin || roleMap.IT) return true;

        switch (menuId) {
            case "dashboard":
                return true; // Everyone logged in
            case "clients":
                return !!(roleMap.customerService || roleMap.accountant || roleMap.collaborator || roleMap.administrative);
            case "quotes":
                // Technician should NOT see quotes, customerService/collaborator/accountant DO
                return !!(roleMap.customerService || roleMap.collaborator || roleMap.accountant);
            case "orders":
                return !!(roleMap.customerService || roleMap.technician || roleMap.sampleManager || roleMap.accountant);
            case "parameters":
                return !!(roleMap.qualityControl || roleMap.technician || roleMap.sampleManager || roleMap.customerService || roleMap.admin);
            case "accounting":
                return !!roleMap.accountant;
            case "settings":
                return true;
            default:
                return false;
        }
    };

    const allMenuItems = [
        { id: "dashboard", label: t("sidebar.dashboard"), icon: LayoutDashboard },
        { id: "clients", label: t("sidebar.clients"), icon: Users },
        { id: "quotes", label: t("sidebar.quotes"), icon: FileText },
        { id: "orders", label: t("sidebar.orders"), icon: ShoppingCart },
        { id: "parameters", label: t("sidebar.parameters"), icon: FileSpreadsheet },
        { id: "accounting", label: t("sidebar.accounting"), icon: DollarSign },
        { id: "settings", label: t("sidebar.settings"), icon: Settings },
    ];

    // Filter menu items based on new role logic
    const menuItems = allMenuItems.filter((item) => hasRoleAccess(item.id));

    const getRoleLabel = (): string => {
        if (isGuest) return t("sidebar.guest");

        // The 'roles' state in sidebar is populated from check-status API, which returns identity.roles (UserRole object)
        // Ensure we handle it correctly as an object with boolean values.
        const sourceRoles = Object.keys(roles).length > 0 ? roles : user?.roles || {};

        const activeRoles = Object.entries(sourceRoles)
            .filter(([_, isActive]) => isActive)
            .map(([roleKey]) => t(`roles.${roleKey}`, roleKey));

        if (activeRoles.length > 0) return activeRoles.join(", ");
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
                                    <div className="text-xs text-muted-foreground">{getRoleLabel()}</div>
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
