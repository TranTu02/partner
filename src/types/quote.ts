import type { Client } from "./client";

export interface Quote {
    quoteId: string; // Custom Text ID (PK)
    quoteCode: string;
    clientId: string; // FK
    client: Client; // jsonb snapshot
    salePerson?: string; // text (name)
    salePersonId?: string; // text (FK)
    samples: any[]; // jsonb[]
    totalFeeBeforeTax: number;
    taxRate: number;
    discountRate: number;
    totalAmount: number;
    quoteStatus: "Draft" | "Sent" | "Approved" | "Expired";
    contactPerson?: {
        contactId?: string;
        contactName: string;
        contactPhone?: string;
        contactEmail?: string;
        contactAddress?: string;
        identityId?: string;
    }; // jsonb (Contact Snapshot)
    // Audit columns
    createdAt: string;
    createdById: string;
    modifiedAt?: string;
    modifiedById?: string;
}
