import type { Client } from "./client";

export interface Order {
    orderId: string; // Custom Text ID (PK)
    quoteId?: string; // FK
    clientId: string; // FK
    client: Client; // jsonb snapshot
    salePerson?: string; // text (name)
    salePersonId?: string; // text (FK)
    samples: any[]; // jsonb[]

    // Pricing fields
    totalAmount: number;
    totalFeeBeforeTax?: number;
    totalFeeBeforeTaxAndDiscount?: number;
    totalTaxValue?: number;
    totalDiscountValue?: number;
    taxRate?: number;
    discount?: number;

    // Sales
    saleCommissionPercent?: number;

    orderStatus: "Pending" | "Processing" | "Completed" | "Cancelled";
    paymentStatus: "Unpaid" | "Partial" | "Paid" | "Debt";
    transactions?: any[]; // jsonb[]
    contactPerson?: any; // jsonb (Contact Snapshot)
    // Audit columns
    createdAt: string;
    createdById: string;
    modifiedAt?: string;
}
