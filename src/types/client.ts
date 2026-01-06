export interface ClientContact {
    contactId?: string;
    contactName: string;
    contactPhone?: string;
    contactEmail?: string;
    contactPosition?: string;
    contactAddress?: string;
    // Legacy support if needed, or mapped
    identityId?: string;
}

export interface InvoiceInfo {
    taxName?: string;
    taxCode?: string;
    taxAddress?: string;
    taxEmail?: string;
}

export interface Client {
    clientId: string; // Custom Text ID (PK)
    clientName: string;
    legalId: string; // Tax ID / CMND
    clientAddress: string;
    clientPhone?: string;
    clientEmail?: string;
    salePerson?: string; // name
    salePersonId?: string; // FK identity
    clientSaleScope: "public" | "private";
    availableByIds: string[]; // List of Identity IDs (text[])
    availableByName?: string[]; // List of names
    clientContacts: ClientContact[]; // jsonb[]
    contacts: { name: string; email: string }[]; // Alias for clientContacts or legacy support
    invoiceEmail: string;
    invoiceInfo: InvoiceInfo; // jsonb structure
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
