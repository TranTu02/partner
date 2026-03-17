import type { Client, ClientContact } from "./client";

// =============================================================================
// ORDER TYPES - Sync với DB: crm.orders + CRM API v2
// DATABASE.md: Section B.2 - Bảng `orders`
// =============================================================================

/**
 * Phụ phí phát sinh (ví dụ: Phí làm nhanh, Phí lấy mẫu...).
 * DB column: crm.orders.otherItems - KHÔNG có trong DB docs,
 * được xử lý trong payload khi create/update.
 */
export interface OtherItem {
    itemName: string;
    feeBeforeTax: number;
    taxRate: number;
    feeAfterTax: number;
}

/**
 * Người nhận báo cáo kết quả.
 * DB column: crm.orders.reportRecipient (jsonb)
 */
export interface ReportRecipient {
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    receiverEmail?: string;
}

/**
 * Người liên hệ đại diện phụ trách đơn hàng.
 * DB column: crm.orders.contactPerson (jsonb)
 */
export interface ContactPerson {
    contactId?: string;
    identityId?: string;
    contactName: string;
    contactPhone?: string;
    contactEmail?: string;
    contactPosition?: string;
    contactAddress?: string;
}

/**
 * Chi tiết một chỉ tiêu phân tích trong đơn hàng/báo giá.
 * Là phần tử trong samples[].analyses[] (jsonb[])
 */
export interface OrderAnalysis {
    id?: string;                // temp ID khi chưa submit
    parameterId?: string;
    parameterName: string;
    parameterPrice?: number;    // Đơn giá niêm yết
    feeBeforeTax?: number;      // Đơn giá sau chiết khấu (có thể null)
    feeAfterTax?: number;
    taxRate?: number;
    quantity?: number;
    protocolCode?: string;
    matrixId?: string;
}

/**
 * Một mẫu trong đơn hàng.
 * Là phần tử trong crm.orders.samples (jsonb[])
 */
export interface OrderSample {
    sampleName: string;
    sampleMatrix?: string;      // Tên nền mẫu
    sampleTypeName?: string;    // Tên loại mẫu
    sampleNote?: string;
    quantity?: number;
    analyses: OrderAnalysis[];
}

/**
 * Giao dịch thanh toán lịch sử.
 * DB column: crm.orders.transactions (jsonb[])
 */
export interface OrderTransaction {
    amount: number;
    date: string;
    method?: string;
    note?: string;
}

/**
 * Trạng thái đơn hàng.
 * DB: crm.orders.orderStatus
 */
export type OrderStatus = "Pending" | "Processing" | "Completed" | "Cancelled";

/**
 * Trạng thái thanh toán.
 * DB: crm.orders.paymentStatus = Unpaid | Partial | Paid | Debt
 * NOTE: "Variance" không có trong DB docs chính thức nhưng được dùng
 * trong AccountingPage filter (lọc đơn lệch tiền) → giữ lại để BC.
 */
export type PaymentStatus = "Unpaid" | "Partial" | "Paid" | "Debt" | "Variance";

/**
 * Đơn hàng - mapping với DB crm.orders.
 * Ref: CRM_API_DOCUMENTATION.md §3 - ORDER APIs
 */
export interface Order {
    // === Core Fields ===
    orderId: string;            // PK - Custom Text ID (VD: DH26D0370)
    quoteId?: string;           // FK crm.quotes
    clientId: string;           // FK crm.clients

    // === Snapshots (jsonb) ===
    client?: Client;            // Snapshot thông tin khách hàng
    contactPerson?: ContactPerson;
    reportRecipient?: ReportRecipient;

    // === Nhân viên kinh doanh ===
    salePersonId?: string;
    salePerson?: string;        // Tên Sale
    saleCommissionPercent?: number;

    // === Samples (jsonb[]) ===
    samples: OrderSample[];

    // === Pricing ===
    totalAmount?: number;                    // Giá trị hợp đồng (sau thuế)
    totalFeeBeforeTax?: number;              // Tổng chưa thuế
    totalFeeBeforeTaxAndDiscount?: number;   // Tổng giá niêm yết
    totalTaxValue?: number;
    totalDiscountValue?: number;
    taxRate?: number;
    discountRate?: number;

    // === Trạng thái ===
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;

    // === Thanh toán ===
    totalPaid?: number;
    paymentDate?: string;
    invoiceNumbers?: string[];
    transactions?: OrderTransaction[];

    // === Hóa đơn / Lab ===
    receiptId?: string;         // FK lab.receipts
    requestDate?: string;       // Ngày khách yêu cầu gửi mẫu
    orderNote?: string;

    // === Form yêu cầu ===
    orderUri?: string;          // Token public link phiếu gửi mẫu
    requestForm?: string;       // Nội dung HTML Editor

    // === Phụ phí ===
    otherItems?: OtherItem[];

    // === Audit Columns ===
    createdAt: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;
}

/**
 * Payload tạo mới đơn hàng.
 * POST /v2/orders/create
 */
export interface CreateOrderPayload {
    clientId: string;
    quoteId?: string;
    samples: OrderSample[];
    totalAmount?: number;
    contactPerson?: ContactPerson;
    reportRecipient?: ReportRecipient;
    salePersonId?: string;
    salePerson?: string;
    discountRate?: number;
    taxRate?: number;
    orderNote?: string;
    requestDate?: string;
}

/**
 * Payload cập nhật đơn hàng.
 * POST /v2/orders/update
 */
export interface UpdateOrderPayload {
    orderId: string; // Required
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    totalPaid?: number | null;
    paymentDate?: string | null;
    invoiceNumbers?: string[];
    orderNote?: string | null;
    requestForm?: string;
    orderUri?: string;
    samples?: OrderSample[];
    totalAmount?: number;
    contactPerson?: ContactPerson;
    reportRecipient?: ReportRecipient;
}

/**
 * Thống kê kế toán.
 * GET /v2/orders/get/stats → data field
 */
export interface OrderStats {
    waitingExportInvoiceCount: number;
    paymentProblemOrderCount: number;
    totalPaymentDifferenceAmount: number;
}
