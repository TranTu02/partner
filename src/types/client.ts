// =============================================================================
// CLIENT TYPES - Sync với DB: crm.clients + CRM API v2
// DATABASE.md: Section B.1 - Bảng `clients`
// =============================================================================

/**
 * Thông tin người liên hệ của Khách hàng.
 * DB column: crm.clients.clientContacts (jsonb[])
 * API v2: clientContacts array trong response
 */
export interface ClientContact {
    contactId?: string;
    identityId?: string; // FK tới identity.identities
    contactName: string;
    contactPhone?: string;
    contactEmail?: string;
    contactPosition?: string;
    contactAddress?: string;
}

/**
 * Thông tin xuất hóa đơn VAT.
 * DB column: crm.clients.invoiceInfo (jsonb)
 */
export interface InvoiceInfo {
    taxCode?: string;
    taxName?: string;
    taxEmail?: string;
    taxAddress?: string;
}

/**
 * Entity info trả về từ API v2 (phân biệt context người xem).
 * API v2 response: entity.type
 */
export interface EntityInfo {
    type: "staff" | "client" | string;
}

/**
 * Khách hàng - mapping với DB crm.clients
 * Ref: CRM_API_DOCUMENTATION.md §2 - CLIENT APIs
 */
export interface Client {
    // === Core Fields (DB columns) ===
    clientId: string;           // PK - Custom Text ID
    clientName: string;         // Tên công ty / Cá nhân
    legalId?: string;           // Mã số thuế / CMND
    clientAddress?: string;     // Địa chỉ trụ sở
    clientPhone?: string;       // SĐT trụ sở
    clientEmail?: string;       // Email trụ sở

    // === Access Control ===
    clientSaleScope?: "public" | "private";
    availableByIds?: string[];  // text[] - Danh sách sale được phép truy cập
    availableByName?: string[]; // text[] - Tên tương ứng

    // === Contacts ===
    clientContacts?: ClientContact[]; // jsonb[] - Danh sách người liên hệ

    // === Invoice ===
    invoiceInfo?: InvoiceInfo;  // jsonb

    // === Business Stats ===
    totalOrderAmount?: number;  // numeric - Cached tổng doanh số

    // === Audit Columns ===
    createdAt?: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;
    deletedAt?: string | null;

    // === API v2 extra fields ===
    entity?: EntityInfo;        // Context entity từ API v2

    // === UI Helper fields (không có trong DB) ===
    lastOrder?: string | null;  // Computed - ngày đơn hàng gần nhất
    salePerson?: string;        // Snapshot tên sale (từ Order context)
    salePersonId?: string;      // FK identity
}

/**
 * Payload tạo mới Client.
 * POST /v2/clients/create
 */
export interface CreateClientPayload {
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    legalId?: string;
    clientSaleScope?: "public" | "private";
    availableByIds?: string[];
    clientContacts?: ClientContact[];
    invoiceInfo?: InvoiceInfo;
}

/**
 * Payload cập nhật Client.
 * POST /v2/clients/update
 */
export interface UpdateClientPayload {
    clientId: string; // Required
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    legalId?: string;
    clientSaleScope?: "public" | "private";
    availableByIds?: string[];
    clientContacts?: ClientContact[];
    invoiceInfo?: InvoiceInfo;
}
