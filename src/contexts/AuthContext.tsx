import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import Cookies from "js-cookie";
import type { User, UserRoleLegacy } from "@/types/auth";
import { login as apiLogin, verifyToken } from "@/api";
import { customerMe } from "@/api/customer";

interface AuthContextType {
    user: User | null;
    isGuest: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    loginAsGuest: () => void;
    logout: () => void;
    hasAccess: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper outside to avoid duplication
const parseRoles = (rolesArr: any): UserRoleLegacy => {
    const map: UserRoleLegacy = {};
    if (!rolesArr || !Array.isArray(rolesArr)) return map;

    rolesArr.forEach((r) => {
        if (typeof r === "string") {
            // Direct mappings
            if (r === "ROLE_SUPER_ADMIN" || r === "ROLE_ADMIN") map.superAdmin = true;
            if (r === "ROLE_DIRECTOR") map.director = true;
            if (r === "ROLE_TECH_MANAGER" || r === "ROLE_MANAGER") map.techManager = true;
            if (r === "ROLE_QA_MANAGER" || r === "ROLE_QA") map.qaManager = true;

            if (r === "ROLE_SECTION_HEAD") map.sectionHead = true;
            if (r === "ROLE_VALIDATOR") map.validator = true;
            if (r === "ROLE_SENIOR_ANALYST") map.seniorAnalyst = true;
            if (r === "ROLE_TECHNICIAN") map.technician = true;
            if (r === "ROLE_IPC_INSPECTOR") map.ipcInspector = true;
            if (r === "ROLE_RND_SPECIALIST") map.rndSpecialist = true;

            if (r === "ROLE_RECEPTIONIST") map.receptionist = true;
            if (r === "ROLE_SAMPLER") map.sampler = true;
            if (r === "ROLE_SAMPLE_CUSTODIAN") map.sampleCustodian = true;
            if (r === "ROLE_EQUIPMENT_MGR") map.equipmentMgr = true;
            if (r === "ROLE_INVENTORY_MGR") map.inventoryMgr = true;

            if (r === "ROLE_SALES_MANAGER") map.salesManager = true;
            if (r === "ROLE_SALES_EXEC") map.salesExec = true;
            if (r === "ROLE_CS") map.cs = true;
            if (r === "ROLE_ACCOUNTANT") map.accountant = true;
            if (r === "ROLE_REPORT_OFFICER") map.reportOfficer = true;

            if (r === "ROLE_DOC_CONTROLLER") map.docController = true;
            if (r === "ROLE_HSE_OFFICER") map.hseOfficer = true;

            // Inheritance Logic
            if (r === "ROLE_LAB_MANAGER") {
                map.sectionHead = true;
                map.technician = true;
            }
            if (r === "ROLE_QA_MANAGER" || r === "ROLE_QA") {
                map.validator = true;
                map.docController = true;
            }
            if (r === "ROLE_SALES_MANAGER") {
                map.salesExec = true;
            }
        }
    });
    return map;
};

// Role-based access control matrix
const accessMatrix: Record<string, string[]> = {
    // 1. Executive
    director: ["dashboard", "clients", "quotes", "orders", "parameters", "accounting", "settings"],
    techManager: ["dashboard", "parameters", "settings", "orders"],
    qaManager: ["dashboard", "parameters", "settings", "orders"],

    // 2. Technical Operations
    sectionHead: ["dashboard", "orders", "parameters"],
    validator: ["dashboard", "orders", "parameters"],
    seniorAnalyst: ["dashboard", "orders", "parameters"],
    technician: ["dashboard", "orders", "parameters"],
    ipcInspector: ["dashboard", "orders"],
    rndSpecialist: ["dashboard", "parameters"],

    // 3. Sample & Logistics
    receptionist: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create"],
    sampler: ["dashboard", "orders"],
    sampleCustodian: ["dashboard", "orders"],
    equipmentMgr: ["dashboard", "settings"],
    inventoryMgr: ["dashboard", "settings"],

    // 4. Commercial & Admin
    salesManager: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create"],
    salesExec: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create"],
    cs: ["dashboard", "clients", "quotes", "orders"],
    accountant: ["dashboard", "accounting", "orders"],
    reportOfficer: ["dashboard", "orders"],

    // 5. System Support
    superAdmin: ["dashboard", "clients", "quotes", "quotes-create", "orders", "orders-create", "parameters", "accounting", "settings", "admin"],
    docController: ["dashboard", "settings"],
    hseOfficer: ["dashboard", "settings"],

    // Legacy/External
    client: ["parameters", "quotes", "quotes-create", "orders", "orders-create", "settings"],
    guest: ["parameters", "quotes"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        // Hydrate from localStorage
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [isGuest, setIsGuest] = useState(false);

    // Check session status on mount
    useEffect(() => {
        const verifySession = async () => {
            // CAPTURE sessionId from URL if present (Support deep links with sessions)
            const urlParams = new URLSearchParams(window.location.search);
            const urlSessionId = urlParams.get("sessionId");
            if (urlSessionId) {
                if (urlSessionId.startsWith("SC_")) {
                    Cookies.set("customerAuthToken", urlSessionId, { expires: 7 });
                } else {
                    Cookies.set("authToken", urlSessionId, { expires: 7 });
                }
            }

            // ===== 1. STAFF SESSION (authToken) =====
            let staffToken = Cookies.get("authToken");
            const legacySessionId = localStorage.getItem("sessionId");

            if (!staffToken && legacySessionId) {
                console.log("Migrating legacy sessionId to authToken...");
                staffToken = legacySessionId;
                Cookies.set("authToken", staffToken, { expires: 7 });
            }

            if (staffToken) {
                try {
                    const response = await verifyToken({});
                    if (response.success && response.data?.identity) {
                        const identity = response.data.identity;
                        setUser((prev) => {
                            const updatedUser: User = {
                                ...prev,
                                identityId: identity.identityId,
                                identityName: identity.identityName,
                                identityEmail: identity.identityEmail || identity.email,
                                email: identity.email || identity.identityEmail || prev?.email || "",
                                alias: identity.alias || prev?.alias,
                                identityRoles: identity.identityRoles || identity.roles || [],
                                roles: parseRoles(identity.identityRoles || identity.roles),
                            };
                            localStorage.setItem("user", JSON.stringify(updatedUser));
                            return updatedUser;
                        });
                    } else {
                        console.warn("Staff session invalid:", response);
                    }
                } catch (error) {
                    console.error("Staff session verification error:", error);
                }
                return; // Staff token exists — stop checking
            }

            // ===== 2. CUSTOMER SESSION (customerAuthToken) =====
            const customerToken = Cookies.get("customerAuthToken");
            if (customerToken) {
                console.log("Customer token found, verifying via /customer/v1/auth/me...");
                try {
                    const response = await customerMe({});
                    if (response.success && response.data) {
                        const identity = response.data?.identity || response.data;
                        const customerUser: User = {
                            identityId: identity.clientId || identity.identityId || "",
                            identityName: identity.clientName || identity.identityName || "Customer",
                            identityEmail: identity.clientEmail || identity.email || "",
                            email: identity.email || identity.clientEmail || "",
                            identityRoles: identity.roles || ["ROLE_CUSTOMER"],
                            roles: { client: true },
                        };
                        setUser(customerUser);
                        localStorage.setItem("user", JSON.stringify(customerUser));
                        localStorage.setItem("customer", JSON.stringify(identity));
                    } else {
                        console.warn("Customer session invalid, clearing...");
                        Cookies.remove("customerAuthToken");
                        localStorage.removeItem("customer");
                        localStorage.removeItem("user");
                        setUser(null);
                    }
                } catch (err) {
                    console.error("Customer session verification error:", err);
                }
                return;
            }

            console.log("No auth token found, staying as guest/logged out.");
        };

        verifySession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await apiLogin({ body: { email, password } });
            if (response.success && response.data) {
                const { identity, token } = response.data;

                if (token) {
                    Cookies.set("authToken", token, { expires: 7 });
                }

                const mappedUser: User = {
                    identityId: identity.identityId,
                    identityName: identity.identityName,
                    identityEmail: identity.identityEmail || identity.email,
                    email: identity.email || identity.identityEmail || "",
                    alias: identity.alias,
                    identityRoles: identity.identityRoles || identity.roles || [],
                    roles: parseRoles(identity.identityRoles || identity.roles),
                };

                setUser(mappedUser);
                setIsGuest(false);
                localStorage.setItem("user", JSON.stringify(mappedUser));
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login API failed:", error);
            return false;
        }
    };

    const loginAsGuest = () => {
        setUser(null);
        setIsGuest(true);
        localStorage.removeItem("user");
        Cookies.remove("authToken");
    };

    const logout = () => {
        setUser(null);
        setIsGuest(false);
        localStorage.removeItem("user");
        localStorage.removeItem("customer");
        Cookies.remove("authToken"); // Staff token
        Cookies.remove("customerAuthToken"); // Customer token
    };

    const hasAccess = (page: string): boolean => {
        // Public pages
        if (["login", "forgot-password", "/"].includes(page)) return true;

        if (isGuest) {
            return accessMatrix.guest.includes(page);
        }

        if (!user) {
            return false;
        }

        const legacyRoles = user.roles || {};
        const roleKeys = Object.entries(legacyRoles)
            .filter(([_, active]) => active)
            .map(([key]) => key);

        // Debug access
        console.debug(`Checking access for page: ${page}, user roles:`, roleKeys);

        // SuperAdmin has access to everything in matrix
        if (legacyRoles.superAdmin) return true;

        for (const roleKey of roleKeys) {
            const allowedPages = accessMatrix[roleKey] || [];
            if (allowedPages.includes(page)) {
                return true;
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
