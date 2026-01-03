export interface Contact {
    name: string;
    phone?: string;
    email?: string;
    position?: string;
    identityId?: string;
}

export interface Client {
    clientId: string; // Custom Text ID (PK)
    clientName: string;
    legalId: string; // Tax ID / CMND
    clientAddress: string;
    clientSaleScope: "public" | "private";
    availableByIds: string[]; // List of Identity IDs (text[])
    contacts: Contact[]; // jsonb[]
    invoiceEmail: string;
    invoiceInfo: string; // jsonb - simplified as object for frontend
    totalOrderAmount: number;

    // Audit columns
    createdAt: string;
    createdById: string;
    modifiedAt?: string;
    modifiedById?: string;
    deletedAt?: string | null;

    // Additional helper fields for UI that might be mapped
    lastOrder?: string | null;
}
