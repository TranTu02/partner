import type { Client } from "./client";

export interface Order {
    orderId: string; // Custom Text ID (PK)
    quoteId?: string; // FK
    clientId: string; // FK
    client: Client; // jsonb snapshot
    salePerson: { identityId: string; identityName: string }; // jsonb
    samples: any[]; // jsonb[]
    totalAmount: number;
    orderStatus: "Pending" | "Processing" | "Completed" | "Cancelled";
    paymentStatus: "Unpaid" | "Partial" | "Paid" | "Debt";
    transactions?: any[]; // jsonb[]
    contactPerson: { identityId: string; identityName: string }; // jsonb
    // Audit columns
    createdAt: string;
    createdById: string;
    modifiedAt?: string;
}
