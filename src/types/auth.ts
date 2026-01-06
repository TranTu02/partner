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

export interface User {
    email: string;
    roles: UserRole;
    identityId: string;
    identityName: string;
}

export interface LoginResponse {
    token: string;
    identity: Identity;
    sessionId?: string; // Sometimes returned alongside token
}

export interface Identity {
    identityId: string;
    email: string;
    identityName: string;
    alias?: string;
    roles: UserRole;
    permissions?: any; // jsonb
    identityStatus: "active" | "inactive";
}

export interface Session {
    sessionId: string;
    identityId: string;
    identity: Identity; // Added as per request
    sessionExpiry: string;
    sessionStatus: "active" | "expired" | "revoked";
    ipAddress?: string;
    sessionDomain?: string;
    createdAt: string;
    modifiedAt?: string;
}
