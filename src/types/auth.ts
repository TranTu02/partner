// =============================================================================
// AUTH & IDENTITY TYPES - Sync với DB: identity.identities, identity.sessions
// V2 Documentation: AUTH_API_DOCUMENTATION.md
// =============================================================================

/**
 * Các System Role Keys.
 * DB: identity.identities.identityRoles (text[])
 */
export type SystemRoleKey =
    // Ban lãnh đạo
    | "ROLE_DIRECTOR"
    | "ROLE_TECH_MANAGER"
    | "ROLE_QA_MANAGER"
    // Vận hành
    | "ROLE_SECTION_HEAD"
    | "ROLE_VALIDATOR"
    | "ROLE_SENIOR_ANALYST"
    | "ROLE_TECHNICIAN"
    | "ROLE_IPC_INSPECTOR"
    | "ROLE_RND_SPECIALIST"
    // Hậu cần
    | "ROLE_RECEPTIONIST"
    | "ROLE_SAMPLER"
    | "ROLE_SAMPLE_CUSTODIAN"
    | "ROLE_EQUIPMENT_MGR"
    | "ROLE_INVENTORY_MGR"
    // Kinh doanh
    | "ROLE_SALES_MANAGER"
    | "ROLE_SALES_EXEC"
    | "ROLE_CS"
    | "ROLE_ACCOUNTANT"
    | "ROLE_REPORT_OFFICER"
    // Hệ thống
    | "ROLE_SUPER_ADMIN"
    | "ROLE_DOC_CONTROLLER"
    | "ROLE_HSE_OFFICER";

/**
 * User roles như được trả về từ API v2 (dạng array string).
 */
export type UserRoleV2 = SystemRoleKey[] | string[];

/**
 * Legacy User roles (object map).
 * API response v1: identity.roles = { admin: true, superAdmin: false, ... }
 */
export type UserRoleLegacy = {
    [key: string]: boolean | undefined;
};

/**
 * Thông tin Identity đầy đủ - mapping với DB identity.identities & API v2
 */
export interface Identity {
    identityId: string;
    identityName: string;
    identityEmail?: string; // API v2 field
    email?: string;         // Alias cho backward compatibility
    alias?: string;
    identityRoles: UserRoleV2;
    identityStatus?: "active" | "inactive" | "pending";
    identityPhone?: string;
    identityNID?: string;
    identityAddress?: string;
    identityGroupId?: string;

    // Permission cache (jsonb)
    identityPermission?: Record<string, any>;
    identityPolicies?: Record<string, "ALLOW" | "DENY" | "LIMIT">;

    // Audit
    createdAt?: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;
}

/**
 * Thông tin User rút gọn dùng trong UI context.
 */
export interface User {
    identityId: string;
    identityName: string;
    identityEmail?: string;
    email?: string;
    alias?: string;
    roles?: UserRoleLegacy; // Legacy context
    identityRoles: UserRoleV2;
}

/**
 * Response của POST /v2/auth/login
 */
export interface LoginResponse {
    token: string;
    identity: Identity;
}

/**
 * Response của GET /v2/auth/verify
 */
export interface VerifyResponse {
    valid: boolean;
    identity: {
        identityId: string;
        identityName: string;
        identityEmail: string;
        identityRoles: string[];
    };
    permissions?: Record<string, Record<string, number>>;
}

/**
 * Phiên đăng nhập - mapping với DB identity.sessions
 */
export interface Session {
    sessionId: string;
    identityId: string;
    identity?: Identity;
    sessionExpiry: string;
    sessionStatus: "active" | "expired" | "revoked";
    ipAddress?: string;
    sessionDomain?: string;
    createdAt: string;
    modifiedAt?: string;
}
