import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import Cookies from "js-cookie";
import { login as apiLogin, checkSessionStatus } from "@/api";

export interface User {
    email: string;
    roles: UserRole;
    identityId: string;
    identityName: string;
}

// Keep UserRole simple alias or import it but since it's used in interface above which is exported,
// we might want to just import User from types/auth if possible OR redefine it to match perfectly.
// To avoid duplication and circular deps, let's try to import or just ensure structure matches keys.
// The user provided the structure in types/auth.ts, let's use that structure here.
export type UserRole = {
    IT: boolean;
    bot: boolean;
    admin: boolean;
    accountant: boolean;
    superAdmin: boolean;
    technician: boolean;
    collaborator: boolean;
    dispatchClerk: boolean;
    sampleManager: boolean;
    administrative: boolean;
    qualityControl: boolean;
    customerService: boolean;
    marketingCommunications: boolean;
    documentManagementSpecialist: boolean;
};

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
// Role-based access control matrix
const accessMatrix: Record<string, string[]> = {
    // Admin roles
    admin: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create", "parameters", "accounting", "settings","admin"],
    superAdmin: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create", "parameters", "accounting", "settings","admin"],
    IT: ["dashboard", "clients", "quotes", "orders", "parameters", "accounting", "settings"],

    // Functional Roles
    customerService: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create", "parameters", "accounting", "settings"],
    collaborator: ["dashboard", "clients", "quotes", "quotes-create", "settings"],
    accountant: ["dashboard", "clients", "quotes", "orders", "accounting", "settings"],

    technician: ["dashboard", "orders", "orders-create", "parameters", "settings"],
    sampleManager: ["dashboard", "orders", "orders-create", "parameters", "settings"],
    qualityControl: ["dashboard", "parameters", "settings"],
    administrative: ["dashboard", "clients", "settings"],

    // Others (limited access or defined elsewhere)
    dispatchClerk: ["dashboard", "settings"],
    marketingCommunications: ["dashboard", "settings"],
    documentManagementSpecialist: ["dashboard", "settings"],
    bot: [],

    // External
    client: ["parameters", "quotes", "quotes-create", "orders", "orders-create", "settings"],
    guest: ["parameters", "quotes"],
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
                        setUser((_prev) => {
                            // Construct a fresh user object to ensure all new fields (identityId, etc.) are present
                            // This handles migration from old localStorage data (id, username) to new structure
                            const updatedUser: User = {
                                identityId: identity.identityId,
                                identityName: identity.identityName,
                                roles: identity.roles,
                                email: identity.email || "",
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
                const identity = response.data.identity;
                const token = response.data.token;
                const newSessionId = response.data.sessionId;

                // Save Token
                Cookies.set("authToken", token, { expires: 7 });

                // Save Session ID if available
                if (newSessionId) {
                    setSessionId(newSessionId);
                    localStorage.setItem("sessionId", newSessionId);
                }

                // Map API Identity to Context User
                // Determine primary role logic if needed for internal flags, otherwise use roles object directly

                const mappedUser: User = {
                    identityId: identity.identityId,
                    identityName: identity.identityName,
                    roles: identity.roles,
                    email: identity.email || "",
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

        // Check if any active role in user.roles maps to a permission list containing the page
        const userRoles = user.roles;
        for (const [roleKey, isActive] of Object.entries(userRoles)) {
            if (isActive) {
                const allowedPages = accessMatrix[roleKey] || [];
                if (allowedPages.includes(page)) {
                    return true;
                }
            }
        }
        return false;
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
