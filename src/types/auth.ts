export type UserRole = "Collaborator" | "CustomerService" | "Accountant" | "Client" | "Guest";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    identityId: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}
