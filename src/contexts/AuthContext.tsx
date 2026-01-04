import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import Cookies from "js-cookie";
import { login as apiLogin, checkSessionStatus } from "@/api";

export type UserRole = "Collaborator" | "CustomerService" | "Accountant" | "Client" | "Guest" | "Admin";

export interface User {
    id: string; // identityId
    username: string; // identityName
    fullName: string; // alias
    roles: Record<string, boolean>; // API returns object
    role: UserRole; // Derived primary role for frontend logic
    email?: string;
    clientId?: string;
}

interface AuthContextType {
    user: User | null;
    isGuest: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    loginAsGuest: () => void;
    logout: () => void;
    hasAccess: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role-based access control matrix (Simplified/Updated)
const accessMatrix: Record<string, string[]> = {
    Admin: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create", "parameters", "accounting", "admin"],
    Collaborator: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create", "parameters"],
    CustomerService: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create", "parameters", "accounting"],
    Accountant: ["dashboard", "clients", "parameters", "orders", "accounting"],
    Client: ["parameters", "quotes", "quotes-create", "orders", "orders-create"],
    Guest: ["parameters", "quotes"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        // Hydrate from localStorage/Cookies if needed
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem("sessionId"));
    const [isGuest, setIsGuest] = useState(false);

    // Check session status on mount
    useEffect(() => {
        const verifySession = async () => {
            if (!sessionId) return;

            try {
                const response = await checkSessionStatus({ body: { sessionId } });
                if (!response.success || response.data?.sessionStatus !== "active") {
                    console.log("Session invalid or expired, logging out...");
                    logout();
                } else {
                    console.log("Session verified:", response.data);
                    const identity = response.data.identity;
                    if (identity) {
                        setUser((prev) => {
                            if (!prev) return null;
                            const updatedUser = {
                                ...prev,
                                id: identity.identityId,
                                username: identity.identityName || identity.username,
                            };
                            localStorage.setItem("user", JSON.stringify(updatedUser));
                            return updatedUser;
                        });
                    }
                }
            } catch (error) {
                console.error("Session check failed:", error);
                logout();
            }
        };

        verifySession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]); // Depend on sessionId to re-verify if it changes

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const response = await apiLogin({ body: { username, password } });
            if (response.success && response.data) {
                const apiUser = response.data.user;
                const token = response.data.token;
                const newSessionId = response.data.sessionId;

                // Save Token
                Cookies.set("authToken", token, { expires: 7 });

                // Save Session ID if available
                if (newSessionId) {
                    setSessionId(newSessionId);
                    localStorage.setItem("sessionId", newSessionId);
                }

                // Map API User to Context User
                // Determine primary role
                let primaryRole: UserRole = "Collaborator";
                if (apiUser.roles) {
                    if (apiUser.roles.admin) primaryRole = "Admin";
                    else if (apiUser.roles.accountant) primaryRole = "Accountant";
                    else if (apiUser.roles.sale || apiUser.roles.customerService) primaryRole = "CustomerService";
                    else if (apiUser.roles.client) primaryRole = "Client";
                }

                const mappedUser: User = {
                    id: apiUser.identityId,
                    username: apiUser.identityName,
                    fullName: apiUser.alias,
                    roles: apiUser.roles,
                    role: primaryRole,
                    email: apiUser.email || "", // Assuming API might return email or we default empty
                };

                setUser(mappedUser);
                setIsGuest(false);
                localStorage.setItem("user", JSON.stringify(mappedUser));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    };

    const loginAsGuest = () => {
        setUser(null);
        setSessionId(null);
        setIsGuest(true);
        localStorage.removeItem("user");
        localStorage.removeItem("sessionId");
        Cookies.remove("authToken");
    };

    const logout = () => {
        setUser(null);
        setSessionId(null);
        setIsGuest(false);
        localStorage.removeItem("user");
        localStorage.removeItem("sessionId");
        Cookies.remove("authToken");
    };

    const hasAccess = (page: string): boolean => {
        if (isGuest) {
            return accessMatrix.Guest.includes(page);
        }
        if (!user) {
            return false;
        }
        // Fallback if role doesn't match matrix key
        const allowedPages = accessMatrix[user.role] || [];
        return allowedPages.includes(page);
    };

    return <AuthContext.Provider value={{ user, isGuest, login, loginAsGuest, logout, hasAccess }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
