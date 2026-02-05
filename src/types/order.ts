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
    discountRate?: number;

    // Sales
    saleCommissionPercent?: number;

    orderStatus: "Pending" | "Processing" | "Completed" | "Cancelled";
    orderUri?: string;
    requestForm?: string;
    paymentStatus: "Unpaid" | "Partial" | "Paid" | "Debt" | "Variance";

    receiptId?: string; // Lab Receipt FK
    totalPaid?: number; // Total Paid Amount
    paymentDate?: string; // Payment Date
    invoiceNumbers?: string[]; // List of issued invoices
    requestDate?: string; // Information regarding request date
    orderNote?: string; // Order Note

    transactions?: any[]; // jsonb[]
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
}
