import type { Client } from "./client";
import type { ContactPerson, OtherItem, OrderSample } from "./order";

// =============================================================================
// QUOTE TYPES - Sync với DB: crm.quotes + CRM API v2
// DATABASE.md: Section B.3 - Bảng `quotes`
// =============================================================================

/**
 * Trạng thái báo giá.
 * DB: crm.quotes.quoteStatus
 * NOTE: API v2 dùng lowercase ("draft", "sent") nhưng DB docs dùng PascalCase.
 */
export type QuoteStatus = "draft" | "sent" | "approved" | "expired"
    | "Draft" | "Sent" | "Approved" | "Expired"; // Hỗ trợ cả 2 casing

/**
 * Báo giá - mapping với DB crm.quotes.
 * Ref: CRM_API_DOCUMENTATION.md §4 - QUOTE APIs
 */
export interface Quote {
    // === Core Fields ===
    quoteId: string;            // PK - Custom Text ID (VD: BG26D0000280)
    quoteCode?: string;         // Mã báo giá (Readable)
    clientId: string;           // FK crm.clients

    // === Snapshots (jsonb) ===
    client?: Client;            // Snapshot thông tin khách hàng
    contactPerson?: ContactPerson;

    // === Nhân viên kinh doanh ===
    salePersonId?: string;
    salePerson?: string;

    // === Samples (jsonb[]) ===
    samples?: OrderSample[];

    // === Phụ phí ===
    otherItems?: OtherItem[];

    // === Pricing ===
    totalAmount?: number | string;             // API v2 có thể trả về string
    totalFeeBeforeTax?: number | string;
    totalFeeBeforeTaxAndDiscount?: number | string;
    totalTaxValue?: number | string;
    totalDiscountValue?: number | string;
    taxRate?: number | string;
    discountRate?: number | string;
    /** DB column name: discount (không phải discountRate) */
    discount?: number;

    // === Trạng thái ===
    quoteStatus: QuoteStatus;

    // === Audit Columns ===
    createdAt?: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;
}

/**
 * Payload tạo mới báo giá.
 * POST /v2/quotes/create
 */
export interface CreateQuotePayload {
    clientId: string;
    samples?: OrderSample[];
    totalAmount?: number;
    quoteStatus?: QuoteStatus;
    contactPerson?: ContactPerson;
    salePersonId?: string;
    salePerson?: string;
    discountRate?: number;
    taxRate?: number;
}

/**
 * Payload cập nhật báo giá.
 * POST /v2/quotes/update
 */
export interface UpdateQuotePayload {
    quoteId: string; // Required
    quoteStatus?: QuoteStatus;
    samples?: OrderSample[];
    totalAmount?: number;
    contactPerson?: ContactPerson;
    discountRate?: number;
}
