# TÀI LIỆU THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN DOCUMENT)

**Dự án:** LIMS Multi-Lab SaaS Platform

**Phiên bản:** 2.5 (Tích hợp Quản lý Tài sản & Truy vết ISO 17025)

**Ngày cập nhật:** 18/03/2026

**Tham chiếu:** [RULE.md](./RULE.md), [BA.md](./BA.md), [API Documentation](./src/api/API_DOCUMENTATION.md)

---

## I. TỔNG QUAN CHIẾN LƯỢC (STRATEGIC OVERVIEW)

### 1. Kiến trúc lưu trữ (Storage Architecture)

- **Engine**: PostgreSQL 16+.

- **Multi-tenancy**: Mô hình **Schema-per-Tenant**.
    - `public`: Lưu trữ quản lý hệ thống (Tenants, Subscriptions, Global Configs).

    - `tenant_{tenantId}`: Chứa toàn bộ dữ liệu nghiệp vụ riêng biệt của từng Lab.

- **Khóa chính (PK)**: Sử dụng **Custom Text ID** (VD: `MAT-0001`, `REC2412-001`) thay cho UUID/Serial để tối ưu hóa việc đọc hiểu và tính duy nhất trên toàn hệ thống.

### 2. Quy tắc Audit & Soft Delete

Tất cả các bảng (ngoại trừ bảng trung gian thuần túy) phải bao gồm các cột:

- `createdAt` (timestamp): Thời điểm tạo.

- `createdById` (text): ID người tạo.

- `modifiedAt` (timestamp): Thời điểm cập nhật cuối.

- `modifiedById` (text): ID người cập nhật cuối.

- `deletedAt` (timestamp): Dùng cho **Soft Delete**. Mặc định là `NULL`.

---

## II. CHI TIẾT SCHEMA (DETAILED SCHEMA)

### A. SCHEMA IDENTITY (`identity`)

Chứa thông tin danh tính và phiên làm việc.

#### 1. Bảng `identities` (Danh tính User)

| Column Name | Type | Key | Description |

| `identityId` | `text` | **PK** | ID tùy chỉnh. |
| `identityGroupId` | `text` | **FK** | ID nhóm (vị trí/phòng ban) từ bảng `identityGroups`. |
| `email` | `text` | **UQ** | Email / ID đăng nhập. _(Trước: `identityEmail`)_ |
| `identityName` | `text` | | Tên hiển thị. |
| `alias` | `text` | | Bí danh (KTV, Sales...). |
| `identityRoles` | `text[]` | | Mảng chứa System Role Key (VD: `['ROLE_TECHNICIAN']`). _(Trước: `roles`)_ |
| `identityPolicies`| `jsonb` | | Ghi đè chính sách (Manual Overrides): `{ "POL_CODE": "ALLOW" / "DENY" / "LIMIT" }`. |
| `identityPermission` | `jsonb` | | Quyền chi tiết (Granular Cache): `{ table: { col: mask } }`. _(Trước: `permissions`)_ |
| `password` | `text` | | Mật khẩu (đã hash). |
| `identityStatus` | `text` | | Trạng thái: `active`, `inactive`, `pending`. |
| `identityPhone` | `text` | | Số điện thoại liên hệ. |
| `identityNID` | `text` | | CMND/CCCD. |
| `identityAddress`| `text` | | Địa chỉ thường trú. |
| `identityDocumentIds` | `text[]` | **FK** | Danh sách ID tài liệu cá nhân (Hồ sơ năng lực, bằng cấp...) Link tới `document.documents`. |
| `createdAt` | `timestamp` | | Thời điểm tạo. |
| `createdById` | `text` | | Người tạo. |
| `modifiedAt` | `timestamp` | | Thời điểm cập nhật cuối. |
| `modifiedById` | `text` | | Người cập nhật cuối. |
| `deletedAt` | `timestamp` | | Thời điểm xóa (Soft Delete). |

#### 2. Bảng `identityGroups` (Nhóm người dùng/Vị trí)

Bảng này dùng để phân nhóm người dùng có cùng vị trí, phòng ban hoặc chức năng tương đương.

| Column Name                | Type        | Key    | Description                                                                    |
| :------------------------- | :---------- | :----- | :----------------------------------------------------------------------------- |
| `identityGroupId`          | `text`      | **PK** | ID nhóm (VD: `GRP_KTV_MICRO`, `GRP_SALES_HCM`).                                |
| `identityGroupName`        | `text`      |        | Tên nhóm hiển thị (VD: "Nhóm KTV Vi sinh").                                    |
| `identityGroupMainRole`    | `text`      |        | ROLE hệ thống chính mặc định cho nhóm (VD: `ROLE_TECHNICIAN`).                 |
| `identityGroupAlias`       | `text`      | **FK** | Liên kết tới cột `alias` của bảng `identities` (để xác định bí danh đại diện). |
| `identityGroupInChargeId`  | `text`      | **FK** | ID người phụ trách nhóm (Liên kết tới `identities.identityId`).                |
| `identityIds`              | `text[]`    |        | Mảng chứa danh sách `identityId` của các thành viên (Auto-sync).               |
| `identityGroupDescription` | `text`      |        | Mô tả chi tiết về chức năng/vị trí của nhóm.                                   |
| `createdAt`                | `timestamp` |        | Thời điểm tạo.                                                                 |
| `createdById`              | `text`      |        | Người tạo.                                                                     |
| `modifiedAt`               | `timestamp` |        | Thời điểm cập nhật cuối.                                                       |
| `modifiedById`             | `text`      |        | Người cập nhật cuối.                                                           |
| `deletedAt`                | `timestamp` |        | Thời điểm xóa (Soft Delete).                                                   |

### 1.1 Chi tiết cấu trúc `positionInfo` (JSONB)

Cấu trúc mẫu:

```json
{
    "departmentId": "DEPT_LAB_MICRO",
    "departmentName": "Phòng Vi sinh",
    "sectionId": "SEC_SAMPLE_PREP",
    "sectionName": "Tổ xử lý mẫu",
    "jobTitle": "Trưởng phòng Kỹ thuật",
    "jobLevel": "L4",
    "managerId": "USR-2023-999",
    "isHeadOfDepartment": true,
    "workingLocations": ["LAB_HCM", "LAB_HN"]
}
```

### 1.2 Danh mục System Role Keys (`roles`)

- **Ban Lãnh đạo**: `ROLE_DIRECTOR`, `ROLE_TECH_MANAGER`, `ROLE_QA_MANAGER`
- **Vận hành**: `ROLE_SECTION_HEAD`, `ROLE_VALIDATOR`, `ROLE_SENIOR_ANALYST`, `ROLE_TECHNICIAN`, `ROLE_IPC_INSPECTOR`, `ROLE_RND_SPECIALIST`
- **Hậu cần**: `ROLE_RECEPTIONIST`, `ROLE_SAMPLER`, `ROLE_SAMPLE_CUSTODIAN`, `ROLE_EQUIPMENT_MGR`, `ROLE_INVENTORY_MGR`
- **Kinh doanh**: `ROLE_SALES_MANAGER`, `ROLE_SALES_EXEC`, `ROLE_CS`, `ROLE_ACCOUNTANT`, `ROLE_REPORT_OFFICER`
- **Hệ thống**: `ROLE_SUPER_ADMIN`, `ROLE_DOC_CONTROLLER`, `ROLE_HSE_OFFICER`

#### 2. Bảng `sessions` (Phiên đăng nhập)

| Column Name | Type | Key | Description |

| :-------------- | :---------- | :----- | :---------------------------------------- |

| `sessionId` | `text` | **PK** | Custom Text ID. |

| `identityId` | `text` | **FK** | Tham chiếu `identities`. |

| `sessionExpiry` | `timestamp` | | Thời gian hết hạn phiên. |

| `sessionStatus` | `text` | | `active` (default), `expired`, `revoked`. |

| `ipAddress` | `text` | | IP người dùng. |

| `sessionDomain` | `text` | | Domain đăng nhập. |

| `createdAt` | `timestamp` | | Thời điểm tạo phiên. |

| `modifiedAt` | `timestamp` | | Thời điểm cập nhật cuối. |
| `deletedAt` | `timestamp` | | Thời điểm xóa (Soft Delete). |

---

### B. SCHEMA CRM (`crm`)

Chứa thông tin khách hàng và bán hàng.

#### 1. Bảng `clients` (Danh sách Khách hàng)

| Column Name | Type | Key | Description |

| :----------------- | :-------- | :----- | :----------------------------------------------------------------------------------------- |

| `clientId` | `text` | **PK** | Custom Text ID. |

| `clientName` | `text` | | Tên công ty / Cá nhân. |

| `legalId` | `text` | | Mã số thuế / CMND. |

| `clientAddress` | `text` | | Địa chỉ trụ sở. |

| `clientPhone` | `text` | | SĐT trụ sở. |

| `clientEmail` | `text` | | Email trụ sở. |

| `clientSaleScope` | `text` | | Phạm vi quyền: `'public'` (Toàn cty), `'private'` (Riêng sale). |

| `availableByIds` | `text[]` | | Danh sách ID Sale/CTV được phép truy cập (nếu private). |

| `availableByName` | `text[]` | | Danh sách tên Sale/CTV được phép truy cập (nếu private). |

| `clientContacts` | `jsonb[]` | | [{ contactName, contactPhone, contactEmail, contactPosition, contactAddress, contactId }]. |

| `invoiceInfo` | `jsonb` | | Thông tin xuất hóa đơn {taxAddress, taxCode, taxName, taxEmail }. |

| `totalOrderAmount` | `numeric` | | Tổng doanh số tích lũy (Cached). |

| _Audit Cols_ | ... | | |

#### 2. Bảng `orders` (Đơn hàng)

| Column Name | Type | Key | Description |

| :----------------------------- | :-------- | :----- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| `orderId` | `text` | **PK** | Custom Text ID. |

| `quoteId` | `text` | **FK** | Tham chiếu báo giá nguồn (nếu có). |

| `clientId` | `text` | **FK** | |

| `client` | `jsonb` | | Structure: `{clientId, legalId, clientName, clientAddress, clientEmail, invoiceInfo:{taxAddress, taxCode, taxName, taxEmail } }` |

| `contactPerson` | `jsonb` | | Structure: `{ contactName, contactPhone, contactEmail, contactPosition, contactAddress, contactId }` |

| `reportRecipient` | `jsonb` | | Structure: `{ receiverName, receiverPhone, receiverAddress, receiverEmail}` |

| `salePersonId` | `text` | | |

| `salePerson` | `text` | | Tên Sale phụ trách. |

| `saleCommissionPercent` | `numeric` | | % doanh số cho salePerson. |

| `samples` | `jsonb[]` | | Chi tiết yêu cầu: `[{ sampleName, sampleTypeName ,analyses: [{parameterName ,parameterId, feeBeforeTax, taxRate, feeAfterTax }]`. Note: `feeBeforeTax` có thể null và cần tính ngược từ `feeAfterTax`. |

| `totalAmount` | `numeric` | | Giá trị hợp đồng. |

| `totalFeeBeforeTax` | `numeric` | | Tổng chưa thuế (Sum Net Prices). |

| `totalFeeBeforeTaxAndDiscount` | `numeric` | | Tổng giá niêm yết (Sum List Prices - trước khi trừ chiết khấu). |

| `totalTaxValue` | `numeric` | | Giá trị thuế |

| `totalDiscountValue` | `numeric` | | Giá trị giảm giá |

| `orderStatus` | `text` | | `Pending`, `Processing`, `Completed`, `Cancelled`. |

| `taxRate` | `numeric` | | Thuế suất áp dụng chung. |

| `discountRate` | `numeric` | | Số tiền/Phần trăm chiết khấu (trên tổng chưa thuế). |

| `paymentStatus` | `text` | | `Unpaid`, `Partial`, `Paid`, `Debt`. |

| `transactions` | `jsonb[]` | | Lịch sử thanh toán: `[{ amount, date, method, note }]`. |

| `orderUri` | `text` | | Token/Link truy cập công khai cho phiếu gửi mẫu. |

| `requestForm` | `text` | | Toàn bộ nội dung HTML của Phiếu gửi mẫu (từ Editor). |

| `totalPaid` | `numeric` | | Tổng số tiền đã thanh toán (cached từ transactions). |
| `invoiceNumbers` | `text[]` | | Danh sách số hóa đơn VAT đã xuất. |
| `receiptId` | `text` | **FK** | Link tới `lab.receipts` (phiếu tiếp nhận). |
| `requestDate` | `timestamp` | | Ngày khách hàng yêu cầu (ngày gửi mẫu dự kiến). |
| `paymentDate` | `timestamp` | | Ngày thanh toán hoàn tất. |
| `orderNote` | `text` | | Ghi chú nội bộ về đơn hàng. |
| `otherItems` | `jsonb[]` | | Danh sách các dịch vụ khác: `[{itemName, feeBeforeTax, taxRate, feeAfterTax}]`. |
| `orderCustomerFileIds` | `text[]` | | Danh sách ID file đính kèm từ user. |
| _Audit Cols_ | ... | | |

#### 3. Bảng `quotes` (Báo giá)

Bảng này cập nhật logic sử dụng `matrixId` để tham chiếu giá và phương pháp.

| Column Name | Type | Key | Description |

| :----------------------------- | :-------- | :----- | :------------------------------------------------------------------------------------------------------------------------------- |

| `quoteId` | `text` | **PK** | Custom Text ID. |

| `quoteCode` | `text` | | Mã báo giá (Readable). |

| `clientId` | `text` | **FK** | |

| `client` | `jsonb` | | Structure: `{clientId, legalId, clientName, clientAddress, clientEmail, invoiceInfo:{taxAddress, taxCode, taxName, taxEmail } }` |

| `salePersonId` | `text` | | |

| `salePerson` | `text` | | Tên Sale phụ trách. |

| `contactPerson` | `jsonb` | | Structure: `{ contactName, contactPhone, contactEmail, contactPosition, contactAddress, contactId }` |

| `samples` | `jsonb[]` | | Danh sách mẫu & chỉ tiêu. Chi tiết dùng `matrixId`. |

| `totalFeeBeforeTax` | `numeric` | | Tổng chưa thuế (Sum Net Prices). |

| `totalFeeBeforeTaxAndDiscount` | `numeric` | | Tổng giá niêm yết (Sum List Prices). |

| `totalTaxValue` | `numeric` | | Giá trị thuế |

| `totalDiscountValue` | `numeric` | | Giá trị giảm giá |

| `taxRate` | `numeric` | | Thuế suất áp dụng chung. |

| `discount` | `numeric` | | Số tiền/Phần trăm chiết khấu (trên tổng chưa thuế). |

| `totalAmount` | `numeric` | | Tổng tiền cuối cùng. |

| `quoteStatus` | `text` | | `Draft`, `Sent`, `Approved`, `Expired`. |

| _Audit Cols_ | ... | | |

#### 4. Bảng `incomingRequests` (Yêu cầu tiếp nhận)

Bảng trung gian lưu trữ các yêu cầu gửi mẫu từ bên ngoài (Email, Zalo, Portal) trước khi chuyển thành Đơn hàng chính thức. Cấu trúc mở rộng tương đồng với Đơn hàng để mapping dữ liệu 1-1.

| Column Name                    | Type        | Key    | Description                                                                    |
| :----------------------------- | :---------- | :----- | :----------------------------------------------------------------------------- |
| `requestId`                    | `text`      | **PK** | Custom Text ID (VD: `REQ-2601-001`).                                           |
| `requestDate`                  | `timestamp` |        | Thời điểm nhận yêu cầu.                                                        |
| `senderInfo`                   | `jsonb`     |        | `{ senderName, senderPhone, senderEmail, senderAddress}`.                      |
| `requestContent`               | `text`      |        | Nội dung ghi chú sơ bộ.                                                        |
| `documentIds`                  | `text[]`    |        | Danh sách file đính kèm `document.documents`.                                  |
| `quoteId`                      | `text`      | **FK** | Tham chiếu báo giá nguồn (nếu có).                                             |
| `clientId`                     | `text`      | **FK** | Khách hàng (nếu đã xác định).                                                  |
| `client`                       | `jsonb`     |        | Snapshot thông tin khách hàng.                                                 |
| `contactPerson`                | `jsonb`     |        | Thông tin người liên hệ.                                                       |
| `reportRecipient`              | `jsonb`     |        | Người nhận báo cáo.                                                            |
| `salePersonId`                 | `text`      | **FK** | ID nhân viên kinh doanh.                                                       |
| `salePerson`                   | `text`      |        | Tên Sale.                                                                      |
| `saleCommissionPercent`        | `numeric`   |        | % Hoa hồng.                                                                    |
| `samples`                      | `jsonb[]`   |        | Chi tiết mẫu & chỉ tiêu (Xem cấu trúc JSON phía dưới).                         |
| `totalAmount`                  | `numeric`   |        | Tổng tiền.                                                                     |
| `totalFeeBeforeTax`            | `numeric`   |        |                                                                                |
| `totalFeeBeforeTaxAndDiscount` | `numeric`   |        |                                                                                |
| `totalTaxValue`                | `numeric`   |        |                                                                                |
| `totalDiscountValue`           | `numeric`   |        |                                                                                |
| `taxRate`                      | `numeric`   |        |                                                                                |
| `discountRate`                 | `numeric`   |        |                                                                                |
| `incomingStatus`               | `text`      |        | Trạng thái xử lý yêu cầu: `New`, `Processing`, `Converted`, `Rejected`.        |
| `linkedOrderId`                | `text`      | **FK** | Link tới `orders` khi process thành công.                                      |
| `orderUri`                     | `text`      |        | Link public (nếu tạo từ Portal).                                               |
| `requestForm`                  | `text`      |        | HTML nội dung phiếu.                                                           |
| `orderId`                      | `text`      | **FK** | Link tới `crm.orders` khi đã convert.                                          |
| `receiptId`                    | `text`      | **FK** | Link tới `lab.receipts` khi đã tạo phiếu.                                      |
| `orderStatus`                  | `text`      |        | Cached trạng thái đơn hàng: `Pending`, `Processing`, `Completed`, `Cancelled`. |
| `paymentStatus`                | `text`      |        | Cached trạng thái thanh toán: `Unpaid`, `Partial`, `Paid`.                     |
| _Audit Cols_                   | ...         |        |                                                                                |

#### 5. Bảng `transactions` (Giao dịch tài chính)

Lưu trữ log giao dịch ngân hàng (SMS/Banking) để đối soát và gạch nợ tự động.

| Column Name       | Type        | Key    | Description                                                        |
| :---------------- | :---------- | :----- | :----------------------------------------------------------------- |
| `transactionId`   | `text`      | **PK** | Custom Text ID (VD: `TRX-88291`).                                  |
| `transactionDate` | `timestamp` |        | Thời điểm phát sinh giao dịch.                                     |
| `amount`          | `numeric`   |        | Số tiền giao dịch.                                                 |
| `currency`        | `text`      |        | Đơn vị tiền tệ (VND).                                              |
| `content`         | `text`      |        | Nội dung giao dịch (Raw text từ Bank/SMS).                         |
| `senderBank`      | `text`      |        | Ngân hàng đối tác/Số tài khoản.                                    |
| `refType`         | `text`      |        | Loại giao dịch: `Incoming` (Tiền về), `Outgoing` (Hoàn tiền/Chi).  |
| `refOrderId`      | `text`      | **FK** | (Optional) Map vào đơn hàng nào.                                   |
| `status`          | `text`      |        | `Unmapped` (Chưa khớp), `Mapped` (Đã gạch nợ), `Ignored` (Bỏ qua). |
| _Audit Cols_      | ...         |        |                                                                    |

#### 6. Bảng `complaints` (Khiếu nại - QT-GQKN-07)

Quản lý khiếu nại và yêu cầu điều chỉnh kết quả từ khách hàng.

| Column Name         | Type      | Key    | Description                                                          |
| :------------------ | :-------- | :----- | :------------------------------------------------------------------- |
| `complaintId`       | `text`    | **PK** | Custom ID (VD: `CMP-2601-001`).                                      |
| `reportId`          | `text`    | **FK** | Báo cáo bị khiếu nại (`document.reports`).                           |
| `receiptId`         | `text`    | **FK** | Phiếu tiếp nhận liên quan.                                           |
| `clientId`          | `text`    | **FK** | Khách hàng khiếu nại.                                                |
| `complaintType`     | `text`    |        | `AdminError` (sai hành chính), `ResultDispute` (tranh chấp kết quả). |
| `complaintContent`  | `text`    |        | Nội dung khiếu nại chi tiết.                                         |
| `complaintStatus`   | `text`    |        | `Open`, `Investigating`, `Resolved`, `Rejected`.                     |
| `resolution`        | `text`    |        | Kết quả xử lý khiếu nại.                                             |
| `requiresRetest`    | `boolean` |        | Cần thử lại không?                                                   |
| `retestAnalysisIds` | `text[]`  |        | Danh sách `analysisId` cần retest.                                   |
| _Audit Cols_        | ...       |        |                                                                      |

#### 6. Bảng `complaints` (Khiếu nại - QT-GQKN-07)

Quản lý khiếu nại và yêu cầu điều chỉnh kết quả từ khách hàng.

| Column Name         | Type      | Key    | Description                                                     |
| :------------------ | :-------- | :----- | :-------------------------------------------------------------- |
| `complaintId`       | `text`    | **PK** | Custom ID (VD: `CMP-2601-001`).                                 |
| `reportId`          | `text`    | **FK** | Báo cáo bị khiếu nại (`document.reports`).                      |
| `receiptId`         | `text`    | **FK** | Phiếu tiếp nhận liên quan.                                      |
| `clientId`          | `text`    | **FK** | Khách hàng khiếu nại.                                           |
| `complaintType`     | `text`    |        | `AdminError` (sai hành chính), `ResultDispute` (tranh chấp KQ). |
| `complaintContent`  | `text`    |        | Nội dung khiếu nại chi tiết.                                    |
| `complaintStatus`   | `text`    |        | `Open`, `Investigating`, `Resolved`, `Rejected`.                |
| `resolution`        | `text`    |        | Kết quả xử lý khiếu nại.                                        |
| `requiresRetest`    | `boolean` |        | Cần thử lại không?                                              |
| `retestAnalysisIds` | `text[]`  |        | Danh sách `analysisId` cần retest.                              |
| _Audit Cols_        | ...       |        |                                                                 |

---

### C. SCHEMA LIBRARY (`library`)

Chứa các bảng danh mục cấu hình.

#### 1. Bảng `matrices` (Ma trận cấu hình & Giá)

Bảng trung gian quan trọng nhất, kết hợp 3 bảng trên để tạo ra đơn giá và ngưỡng kỹ thuật.

| Column Name | Type | Key | Description |

| :---------------------- | :-------- | :----- | :----------------------------------------------------- |

| `matrixId` | `text` | **PK** | ID tùy chỉnh (VD: `MAT001`). |

| `parameterId` | `text` | | (Optional) Tham chiếu `parameters` nếu có. |

| `protocolId` | `text` | | (Optional) Tham chiếu `protocols` nếu có. |

| `sampleTypeId` | `text` | **FK** | Tham chiếu `sampleTypes`. |

| `equipmentIds` | `text[]` | **FK** | Thiết bị _mặc định_ áp dụng riêng cho nền mẫu này. |

| `equipments` | `jsonb[]` | | Snapshot thiết bị. |

| `labToolIds` | `text[]` | **FK** | Dụng cụ _mặc định_ áp dụng riêng cho nền mẫu này. |

| `labTools` | `jsonb[]` | | Snapshot dụng cụ. |

| `protocolCode` | `text` | | Mã phương pháp (Nhập trực tiếp hoặc từ protocol). |

| `protocolSource` | `text` | | Nguồn phương pháp. |

| `protocolAccreditation` | `jsonb` | | (Snapshot) Phạm vi được công nhận chi tiết `{ [code]: { registrationDate, expirationDate } | boolean }`. |

| `parameterName` | `text` | | Tên chỉ tiêu (Nhập trực tiếp). |

| `displayStyle` | `jsonb` | | Cấu hình hiển thị báo cáo: `{"eng": "...", "default": "..."}`. |

| `sampleTypeName` | `text` | | Tham chiếu `sampleTypes`. |

| `feeBeforeTax` | `numeric` | | Đơn giá trước thuế. |

| `thresholdLimit` | `text` | | Ngưỡng quy chuẩn cho phép (Để đánh giá Đạt/Không đạt). |

| `turnaroundTime` | `int` | | Thời gian thực hiện tiêu chuẩn (số ngày). |
| `turnaroundDays` | `int` | | **[MỚI]** Dự kiến số ngày hoàn thành thực tế. |
| `technicianGroupId` | `text` | | Tổ chuyên môn phụ trách. |
| `chemicals` | `jsonb` | | Danh sách hóa chất định mức cho 1 lần thử (BOM): `[{chemicalSkuId, chemicalName, consumedQty, chemicalBaseUnit}]`. |

| _Audit Cols_ | ... | | |

#### 2. Bảng `protocols` (Phương pháp thử - SOP)

Danh mục các tiêu chuẩn áp dụng (TCVN, ISO, ASTM...).

| Column Name | Type | Key | Description |

| :---------------------- | :------ | :----- | :---------------------------------------------------------------------- |

| `protocolId` | `text` | **PK** | ID tùy chỉnh (VD: `PRO001`). |

| `protocolCode` | `text` | | Mã hiệu (VD: `TCVN 6661-1:2011`). |

| `protocolSource` | `text` | | Nguồn ban hành (ISO, AOAC, EPA...). |

| `protocolAccreditation` | `jsonb` | | (Snapshot) Phạm vi được công nhận chi tiết `{ [code]: { registrationDate, expirationDate } | boolean }`. |

| `protocolTitle` | `text` | | Tên đầy đủ của phương pháp (VD: "Xác định hàm lượng Chì bằng AAS"). |

| `protocolDescription` | `text` | | Mô tả phương pháp |
| `turnaroundDays` | `int` | | **[MỚI]** Dự kiến số ngày hoàn thành. |
| `protocolDocumentIds` | `text[]` | **FK** | Danh sách ID tài liệu liên quan (Public). |
| `sopDocumentIds` | `text[]` | **FK** | **[MỚI]** Hồ sơ SOP (Chỉ cho phép người quản lý xem). |
| `parameters` | `jsonb[]` | | Danh sách chỉ tiêu: `[{parameterId, parameterName}]`. |

| `sampleTypes` | `jsonb[]` | | Danh sách loại mẫu: `[{sampleTypeId, sampleTypeName}]`. |

| `chemicals` | `jsonb[]` | | Danh sách hóa chất định mức tiêu chuẩn cho 1 lần thử (Template): `[{chemicalSkuId, chemicalName, consumedQty, chemicalBaseUnit}]`. |

| `equipmentIds` | `text[]` | **FK** | Danh sách ID Thiết bị máy móc yêu cầu (`inventory.equipment`). |

| `equipments` | `jsonb[]` | | Snapshot: `[{ equipmentId, equipmentName, equipmentType }]`. |

| `labToolIds` | `text[]` | **FK** | Danh sách ID Dụng cụ yêu cầu (`inventory.labTools`). |

| `labTools` | `jsonb[]` | | Snapshot: `[{ labToolId, labToolName, labToolType }]`. |

| _Audit Cols_ | ... | | |

#### 3. Bảng `parameters` (Chỉ tiêu phân tích)

Lưu trữ danh tính của các chỉ tiêu hóa/lý/vi sinh.

| Column Name | Type | Key | Description |

| :---------------- | :------ | :----- | :--------------------------------------------- |

| `parameterId` | `text` | **PK** | ID tùy chỉnh (VD: `PAR001`). |

| `parameterName` | `text` | | Tên chỉ tiêu (VD: `Chì (Pb)`, `Tổng số VSV`). |

| `displayStyle` | `jsonb` | | Cấu hình hiển thị dạng markdown {"displayStyle": {"eng": "<tên tiếng anh>", "default": "<tên tiếng Việt>"}}. |

| `technicianAlias` | `text` | | Mã vị trí phụ trách chính cho chỉ tiêu. |

| `technicianGroupId` | `text` | | ID nhóm kỹ thuật viên phụ trách chỉ tiêu. |

| `parameterSearchKeys` | `text[]` | | Danh sách các từ khóa để tìm kiếm chỉ tiêu. |

| `parameterStatus` | `text` | | Trạng thái chỉ tiêu (Active/Inactive). |

| `parameterNote` | `text` | | Ghi chú cho chỉ tiêu. |

| _Audit Cols_ | ... | | |

#### 4. Bảng `sampleTypes` (Loại mẫu/Nhóm sản phẩm)

Phân loại mẫu để áp dụng đơn giá và ngưỡng quy chuẩn.

| Column Name | Type | Key | Description |

| :----------------- | :------ | :----- | :-------------------------------------------------- |

| `sampleTypeId` | `text` | **PK** | ID tùy chỉnh (VD: `ST001`). |

| `sampleTypeName` | `text` | | Tên (VD: `Thực phẩm bảo vệ sức khỏe`, `Nước thải`). |

| `displayTypeStyle` | `jsonb` | | {eng: <tên tiếng anh>, default: <tên tiếng Việt>} |

| _Audit Cols_ | ... | | |

#### 5. Bảng `parameterGroups` (Nhóm chỉ tiêu / Gói kiểm)

Bảng định nghĩa các gói/nhóm chỉ tiêu để tư vấn bán hàng và báo giá nhanh.

| Column Name      | Type           | Key    | Description                                                                                |
| :--------------- | :------------- | :----- | :----------------------------------------------------------------------------------------- |
| `groupId`        | `text`         | **PK** | Mã nhóm chỉ tiêu (Custom Text ID).                                                         |
| `groupName`      | `text`         |        | Tên nhóm chỉ tiêu (VD: Gói kiểm nhanh thực phẩm).                                          |
| `matrixIds`      | `text[]`       |        | Mảng mã liên kết với bảng `library.matrices`. (Tổng giá gói = SUM(matrices.feeBeforeTax)). |
| `groupNote`      | `text`         |        | Ghi chú cho nhóm chỉ tiêu.                                                                 |
| `sampleTypeId`   | `text`         | **FK** | Link ID loại sản phẩm (`library.sampleTypes`).                                             |
| `sampleTypeName` | `text`         |        | Snapshot tên loại sản phẩm áp dụng.                                                        |
| `discountRate`   | `numeric(5,2)` |        | % Giảm giá áp dụng cho tổng giá trị gói. Default 0.                                        |
| `taxRate`        | `numeric(5,2)` |        | % Thuế suất (nếu có áp dụng riêng cho gói). Default 0.                                     |

| _Audit Cols_ | ... | | |

**Indexes:**

- `idx_paramgroup_sampletype` on `sampleTypeId` (Lọc gói theo ngành hàng).

- `idx_paramgroup_matrices` (GIN) on `matrixIds` (Tìm gói chứa matrixId cụ thể).

#### 6. Bảng `matrixChemicals` (Định mức BOM)

| Column Name        | Type      | Key    | Description                                |
| :----------------- | :-------- | :----- | :----------------------------------------- |
| `matrixChemicalId` | `text`    | **PK** | ID định mức.                               |
| `matrixId`         | `text`    | **FK** | Tham chiếu cấu hình Phép thử.              |
| `chemicalSkuId`    | `text`    | **FK** | Mã hóa chất cần tiêu hao (`chemicalSkus`). |
| `consumedQty`      | `numeric` |        | Số lượng tiêu hao tiêu chuẩn (BOM).        |
| `chemicalBaseUnit` | `text`    |        | Đơn vị định mức.                           |

---

### D. SCHEMA LAB (`lab`)

Các bảng vận hành phòng thí nghiệm, quản lý mẫu và kết quả.

#### 1. Bảng `receipts` (Phiếu tiếp nhận)

Lưu trữ thông tin giao dịch nhận mẫu. Trạng thái phiếu phản ánh tiến độ chung của cả đơn hàng kiểm nghiệm.

| Column Name | Type | Key | Description |

| :---------------------- | :---------- | :----- | :----------------------------------------------------------------------------------------------------------------------------------- |

| `receiptId` | `text` | **PK** | ID nội bộ (Custom ID). |

| `receiptCode` | `text` | **UQ** | Mã hồ sơ lưu trữ (VD: `26a1234`). |

| `receiptStatus` | `text` | | Trạng thái: 1. `Draft`: Nháp (đang nhập liệu, chưa nhận mẫu). 2. `Received`: Đã nhận mẫu & xác nhận yêu cầu. 3. `Processing`: Đang trong quá trình thử nghiệm (có ít nhất 1 chỉ tiêu đang chạy). 4. `Completed`: Tất cả chỉ tiêu đã có kết quả (chờ xuất báo cáo). 5. `Reported`: Đã phát hành báo cáo/trả kết quả cho khách. 6. `Cancelled`: Hủy phiếu. |

| `receiptDate` | `timestamp` | | Ngày/giờ nhận mẫu thực tế. |

| `receiptDeadline` | `timestamp` | | Hạn trả kết quả cam kết với khách. |

| `receiptNote` | `text` | | Ghi chú nội bộ cho cả phiếu. |

| `receiptPriority` | `text` | | Mức độ ưu tiên: `Normal`, `Urgent`, `Flash`. |

| `receiptDeliveryMethod` | `text` | | Cách thức nhận: `HandOver`, `Post`, `Pickup`. |

| `orderId` | `text` | **FK** | Link tới đơn hàng (CRM). |

| `order` | `jsonb` | | **(Snapshot)** Thông tin đơn hàng tại thời điểm nhận. |

| `clientId` | `text` | | ID Khách hàng (để search nhanh). |

| `client` | `jsonb` | | <br>Structure: `{clientId, legalId, clientName, clientAddress, clientEmail, invoiceInfo:{taxAddress, taxCode, taxName, taxEmail } }` |

| `contactPerson` | `jsonb` | | **(Snapshot)** Người liên hệ: `{ contactName, contactPhone, contactEmail, contactPosition, contactAddress, contactId }`. |

| `reportRecipient` | `jsonb` | | **(Snapshot)** Người nhận báo cáo: `{ receiverName, receiverPhone, receiverAddress, receiverEmail}`. |

| `shipmentId` | `text` | **FK** | Link tới phiếu gửi hàng (Shipment). |

| `shipmentTrackingNumber` | `text` | | Mã vận đơn (nếu gửi qua bưu điện/ship). |

| `senderInfo` | `jsonb` | | **(Snapshot)** Thông tin người giao phiếu kết quả . |

| `conditionCheck` | `jsonb` | | **(Snapshot)** Tình trạng mẫu khi nhận. |

| `reportConfig` | `jsonb` | | **(Snapshot)** Cấu hình trả báo cáo `{language, copies, sendSoftCopy}`. |
| `receiptMarks` | `text[]` | | **[MỚI]** Danh sách các mốc trạng thái (tags) của phiếu. |
| `receptionistId` | `text` | **FK** | Nhân viên lễ tân/tiếp nhận thực hiện (QT-TNM-01). |
| `isBlindCoded` | `boolean` | | `true` nếu đã áp dụng mã hóa mù - Blind Sample (QT-XLM-02). |
| `receiptReceivedImageFileIds` | `text[]` | **FK** | Danh sách ID hình ảnh tiếp nhận mẫu (Link tới bảng `document.files`). |
| _Audit Cols_ | ... | | `createdAt`, `createdById`, `modifiedAt`, `modifiedById`, `deletedAt`. |

#### 2. Bảng `samples` (Mẫu thử nghiệm)

Lưu trữ vật thể mẫu vật lý. Trạng thái mẫu vật lý tập trung vào "vị trí" và "vòng đời" của vật thể đó.

| Column Name | Type | Key | Description |

| :-------------------- | :---------- | :----- | :------------------------------------------------------------------------- |

| `sampleId` | `text` | **PK** | ID nội bộ. |
| `sampleName` | `text` | | Tên mẫu. |

| `receiptId` | `text` | **FK** | Thuộc phiếu nhận nào. |

| `sampleTypeId` | `text` | **FK** | Link tới danh mục loại mẫu (`sampleTypes`). |

| `productType` | `text` | | Tính chất của sản phẩm (chất cấm , hàng có giá trị cao ,...). |

| `sampleTypeName` | `text` | | Tên loại nền mẫu (Thực phẩm, Thực phẩm bảo vệ sức khỏe, Dược liệu ,...). |

| `sampleClientInfo` | `text` | | Thông tin mẫu do khách hàng cung cấp (VD: "Nước đầu nguồn"). |

| `sampleInfo` | `jsonb[]` | | Thông tin chi tiết của mẫu (VD: `[{label: "value", value: "value"}]`). |

| `sampleReceiptInfo` | `jsonb[]` | | Thông liên quan đến thử nghiệm (VD: `[{label: "value", value: "value"}]`). |

| `sampleStatus` | `text` | | Trạng thái vòng đời mẫu:`Received`: Đã nhận (đang ở bộ phận nhận mẫu).`InPrep`: Đang xử lý sơ bộ (nghiền, sấy, tách...).`Distributed`: Đang ở phòng thí nghiệm (đã giao cho KTV). `Retained`: Lưu mẫu (Lưu kho sau khi thử nghiệm xong).`Disposed`: Đã tiêu hủy.`Returned`: Đã trả lại khách hàng. |

| `sampleVolume` | `text` | | Lượng mẫu tính theo vật chứa (1 chai 500ml, túi 20g ,..) |

| `sampleWeight` | `numeric` | | Lượng mẫu quy ra g |

| `samplePreservation` | `text` | | Điều kiện bảo quản (VD: "Axit hóa, 4°C"). |

| `sampleStorageLoc` | `text` | | Vị trí lưu kho (VD: "Tủ lạnh A - Ngăn 2"). |

| `sampleRetentionDate` | `timestamp` | | Ngày hết hạn lưu (dự kiến hủy). |

| `sampleDisposalDate` | `timestamp` | | Ngày hủy mẫu thực tế. |

| `sampleIsReference` | `boolean` | | `true` nếu là mẫu lưu/đối chứng. |

| `samplingInfo` | `jsonb` | | **(Object)** Thông tin lấy mẫu hiện trường. |

| `physicalState` | `text` | | Trạng thái vật lý (VD: "Solid"). |

| `sampleNote` | `text` | | Ghi chú về mẫu. |

| `parentSampleId` | `text` | **FK** | ID mẫu gốc nếu đây là aliquot/chia mẫu (QT-PCM-03). |
| `custodyLog` | `jsonb[]` | | Chuỗi bàn giao nội bộ (Chain of Custody): [{from, to, timestamp, note}] (QT-PCM-03). |
| `sampleMarks` | `text[]` | | Lưu các status mà bản ghi đã trải qua. |
| `samplePriority` | `integer` | | Đánh giá mức độ ưu tiên thực hiện. |
| `retentionServiceFee` | `numeric` | | Phí lưu mẫu theo yêu cầu, null = miễn phí (QT-LHM-06). |
| _Audit Cols_ | ... | | |

#### 3. Bảng `analyses` (Phép thử / Chỉ tiêu)

Lưu trữ công việc phân tích cụ thể. Trạng thái này quan trọng nhất để kiểm soát chất lượng (QA/QC), phân biệt rõ giữa việc "nhập kết quả" và "duyệt kết quả".
5
| Column Name | Type | Key | Description |

| :---------------------- | :---------- | :----- | :---------------------------------------------------------------------- |

| `analysisId` | `text` | **PK** | ID nội bộ. |
| `analysisDocumentId`| `text` | **FK** | Link tới tài liệu (Link tới bảng `document.documents`). |

| `sampleId` | `text` | **FK** | Thuộc mẫu nào. |

| `matrixId` | `text` | **FK** | Link tới cấu hình Matrix (Giá, Method, LOD chuẩn). |
| `protocolId` | `text` | **FK** | Link tới tiêu chuẩn phương pháp thử (`library.protocols`). |

| `parameterId` | `text` | | ID chỉ tiêu (để filter nhanh). |

| `technicianId` | `text` | **FK** | KTV chịu trách nhiệm chính. |

| `technicianIds` | `text[]` | | KTV liên quan. |
| `equipmentId` | `text` | **FK** | Thiết bị sử dụng chính (Link tới bảng `equipment`). |
| `equipmentIds` | `text[]` | **FK** | Danh sách ID Thiết bị _thực tế_ KTV đã dùng để chạy bài. |
| `equipmentsUsed`| `jsonb[]` | | Snapshot: `[{ equipmentId, equipmentName, equipmentCode, usedAt }]`. |
| `labToolIds` | `text[]` | **FK** | Danh sách ID Dụng cụ (pipette, bình...) _thực tế_ đã dùng. |
| `labToolsUsed` | `jsonb[]` | | Snapshot: `[{ labToolId, labToolName, labToolCode, usedAt }]`. |
| `technicianGroupId` | `text` | **FK** | Nhóm kỹ thuật phụ trách (Link tới `identity.identityGroups`). |
| `technicianGroupName` | `text` | | Snapshot tên nhóm phụ trách. |

| `analysisStatus` | `text` | | Quy trình xử lý kết quả: 1. `Pending`: Chờ xếp lịch/phân công. 2. `Ready`: Đã đủ điều kiện bàn giao (đã có kế hoạch/vật tư) nhưng chưa giao tới KTV. 3. `HandedOver`: Đã cấp phát vật tư/Bàn giao mẫu. 4. `Testing`: Đang thử nghiệm (KTV đang làm). 5. `DataEntered`: Đã nhập kết quả sơ bộ (chờ soát xét kỹ thuật). 6. `TechReview`: Đã qua soát xét kỹ thuật (Leader check). 7. `Approved`: QA/Manager đã duyệt chốt kết quả. 8. `ReTest`: Yêu cầu thử nghiệm lại (do sai số/nghi ngờ). 9. `Complained`: Khiếu nại từ khách hàng. 10. `Cancelled`: Hủy chỉ tiêu này. |

| `analysisResult` | `text` | | Kết quả phân tích (Raw value). |

| `analysisResultStatus` | `text` | | Đánh giá: `Pass` (Đạt), `Fail` (Không đạt), `NotEvaluated`. |

| `analysisStartedAt` | `timestamp` | | Thời gian bắt đầu test. |

| `analysisCompletedAt` | `timestamp` | | Thời gian có kết quả. |

| `analysisUncertainty` | `text` | | Độ không đảm bảo đo (± U). |

| `analysisMethodLOD` | `text` | | **(Snapshot)** LOD tại thời điểm thử. |

| `analysisMethodLOQ` | `text` | | **(Snapshot)** LOQ tại thời điểm thử. |

| `analysisUnit` | `text` | | **(Snapshot)** Đơn vị đo (mg/L, CFU...). |
| `referenceLimit` | `text` | | **(Snapshot/Input)** Giá trị tiêu chuẩn cơ sở (VD: từ NCC hoặc Hợp đồng) để so sánh kết quả. |

| `handoverInfo` | `jsonb[]` | | **(Object)** Ghi nhận kẹp cùng lúc cấp phát `{handedOverBy, receivedBy, timestamp}`. |

| `analysisReportDisplay` | `jsonb` | | **(Object)** Định dạng hiển thị trên báo cáo `{eng,default}`. |

| `parameterName` | `text` | | **(Snapshot)** Tên chỉ tiêu. |

| `analysisLocation` | `text` | | Nơi thực hiện thử nghiệm. |

| `protocolCode` | `text` | | **(Snapshot)** Mã phương pháp (ISO/TCVN). |

| `protocolAccreditation` | `jsonb` | | (Snapshot) Phạm vi được công nhận chi tiết `{ [code]: { registrationDate, expirationDate } | boolean }`. |

| `qaReview` | `jsonb` | | **(Object)** Lịch sử duyệt `{reviewerId, comment, timestamp}`. |

| `rawData` | `jsonb` | | **(Object)** Link file gốc, sắc ký đồ `{fileId, url}`. |

| `analysisNotes` | `text` | | Ghi chú về mẫu. |
| `analysisDeadline` | `timestamp` | | Hạn thực hiện chỉ tiêu (QT-PCM-03). |
| `rawInputData` | `jsonb` | | Dữ liệu đầu vào thô (khối lượng, thể tích, thông số — QT-PTT-04). |
| `resultHistory` | `jsonb[]` | | Lịch sử sửa kết quả: [{oldValue, newValue, changedById, reason, timestamp}] (QT-PTT-04). |
| `consumablesUsed` | `jsonb` | | **(Mảng JSONB cực kỳ quan trọng)**: Nơi lưu trữ vật tư đã cấp phát thực tế: `[{chemicalInventoryId, chemicalSkuId, chemicalName, chemicalCasNumber, lotNumber, manufacturerName, changeQty, chemicalBaseUnit, allocatedAt, allocatedBy}]`. |
| `retestReason` | `text` | | Lý do yêu cầu thử lại (analysisStatus=ReTest — QT-GQKN-07). |
| `analysisMarks` | `text[]` | | Lưu các status mà bản ghi đã trải qua. |
| `analysisPriority` | `integer` | | Đánh giá mức độ ưu tiên thực hiện. |
| _Audit Cols_ | ... | | |

---

### E. SCHEMA DOCUMENT (`document`)

Liên quan đến file và tài liệu.

#### 1. Bảng `files` (Quản lý File vật lý)

| Column Name | Type | Key | Description |

| :----------- | :------- | :----- | :------------------------------------------------------ |

| `fileId` | `text` | **PK** | Custom Text ID. |

| `fileName` | `text` | | Tên file gốc. |

| `mimeType` | `text` | | Loại file (pdf, image/png...). |

| `fileSize` | `bigint` | | Kích thước (bytes). |

| `uris` | `text[]` | | Các đường dẫn truy cập (S3 URL, CDN URL). |

| `fileStatus` | `text` | | Trạng thái file (Pending, Synced, Deleted, ...). |

| `commonKeys` | `text[]` | | Các khóa chung (Common Keys) |

| `fileTags` | `text[]` | | Tag phân loại: `Order`, `Report`, `Contract`,... |

| `opaiFile` | `jsonb` | | Metadata nếu file được sync sang OpenAI (Vector Store). |

| _Audit Cols_ | ... | | |

#### 2. Bảng `documents` (Tài liệu nghiệp vụ)

| Column Name | Type | Key | Description |

| :------------ | :------ | :----- | :-------------------------------------------------------- |

| `documentId` | `text` | **PK** | Custom Text ID. |

| `documentTitle` | `text` | | Tiêu đề tài liệu. |

| `documentType` | `text` | | **[MỚI]** Phân loại tài liệu. Mapping từ `classifierCode` cũ: `KE_HOACH_THAM_DINH`, `HUONG_DAN_PHUONG_PHAP`, `BAO_CAO_DANH_GIA_PHUONG_PHAP`, `BAO_CAO_DANH_GIA_DIEU_KIEN_CO_BAN` → `VALIDATION_PLAN`, `METHOD_GUIDE`, `METHOD_EVALUATION_REPORT`, `BASIC_CONDITION_REPORT`; `BIEN_BAN_THU_NGHIEM` + `TAI_LIEU_THU_NGHIEM` + `NHAT_KY_THU_NGHIEM` → `TEST_DOCUMENT`; `DON_HANG` → `ORDER_FORM`; `PRODUCT_SPECIFICATION` → `PRODUCT_SPEC`; `PHIEU_GUI_MAU` → `SAMPLE_SUBMISSION`; `PHIEU_KET_QUA_KIEM_NGHIEM` → `INSPECTION_RESULT`; `PHIEU_KET_QUA_THU_NGHIEM` → `TEST_RESULT`; `HOA_DON` → `INVOICE`; `CONG_VAN_DEN` → `INCOMING_LETTER`; `LEGAL_ID` → `LEGAL_ID`; `CONTRACT` → `CONTRACT`; `TAI_LIEU_KHAC` + `undefined` → `OTHER`. |

| `fileId` | `text` | **FK** | Link tới file vật lý. |

| `refId` | `text` | | ID tham chiếu (receiptId, orderId...). |

| `refType` | `text` | | Loại tham chiếu (`Receipt`, `Order`). |

| `commonKeys` | `text[]` | | Các khóa chung (Common Keys) |

| `documentStatus` | `text` | | Trạng thái tài liệu (Draft, Issued, Revised, Cancelled). |

| `jsonContent` | `jsonb` | | Dữ liệu thô dùng để generate file (để re-render nếu cần). |

| _Audit Cols_ | ... | | |

#### 3. Bảng `reports` (Báo cáo Kết quả)

| Column Name | Type | Key | Description |

| :----------- | :----- | :----- | :--------------------------- |

| `reportId` | `text` | **PK** | Custom Text ID. |

| `receiptId` | `text` | **FK** | |

| `sampleId` | `text` | **FK** | |

| `header` | `text` | | HTML Header tùy chỉnh. |

| `content` | `text` | | HTML Content (Bảng kết quả). |

| `footer` | `text` | | HTML Footer (Chữ ký). |

| `reportStatus` | `text` | | Trạng thái: `Draft`, `Issued`, `Revised`, `Cancelled` (QT-KDB-05). |
| `reportRevision` | `int` | | Số phiên bản, 0 = bản gốc, 1 = Rev01 (QT-GQKN-07). |
| `reportRevisionNote` | `text` | | Lý do sửa đổi phiên bản báo cáo. |
| `replacedByReportId` | `text` | **FK** | ID báo cáo thay thế bản này (nếu revise). |
| `signatures` | `jsonb[]` | | Ký số: [role, identityId, name, signedAt, method] (QT-KDB-05). |
| `complaintId` | `text` | **FK** | Link tới `crm.complaints` (QT-GQKN-07). |
| _Audit Cols_ | ... | | |

---

### F. SCHEMA SERVICE (`service`)

Liên quan đến các dịch vụ ngoài và hỗ trợ.

#### 1. Bảng `opai` (OpenAI Logs)

| Column Name | Type | Key | Description |

| :-------------- | :------ | :----- | :------------------------------------------------------- |

| `messageOpaiId` | `text` | **PK** | Custom Text ID. |

| `role` | `text` | | `user`, `assistant`, `system`. |

| `content` | `text` | | Nội dung trao đổi. |

| `tokenUsage` | `jsonb` | | `{ promptTokens, completionTokens, totalTokens }`. |

| `contextId` | `text` | | ID ngữ cảnh (VD: ID phiên chat, ID tài liệu đang xử lý). |

| _Audit Cols_ | ... | | |

#### 2. Bảng `shipments` (service.shipments)

| Column Name              | Type                       | Key    | Description                                    |
| :----------------------- | :------------------------- | :----- | :--------------------------------------------- |
| `shipmentId`             | `text`                     | **PK** | ID định danh                                   |
| `shipmentCarrier`        | `text`                     |        | **[MỚI]** Đơn vị vận chuyển (VTP, GHN, DHL...) |
| `shipmentSender`         | `jsonb`                    |        | Snapshot Người gửi                             |
| `shipmentReceiver`       | `jsonb`                    |        | Snapshot Người nhận                            |
| `shipmentTrackingNumber` | `text`                     |        | Mã vận đơn theo dõi                            |
| `shipmentStatus`         | `text`                     |        | Trạng thái vận đơn                             |
| `shipmentProduct`        | `jsonb`                    |        | Thông tin hàng hóa chung                       |
| `shipmentItems`          | `jsonb[]`                  |        | Danh sách chi tiết các mặt hàng                |
| `shipmentOrder`          | `jsonb`                    |        | Thông tin đơn hàng gốc (từ API vận chuyển)     |
| `shipmentReferenceIds`   | `text[]`                   |        | Các mã tham chiếu ngoại (was commonKeys)       |
| `shipmentReceiptIds`     | `text[]`                   |        | Danh sách ID phiếu nhập liên quan              |
| `shipmentDate`           | `timestamp with time zone` |        | Ngày gửi/Ngày bắt đầu vận chuyển               |
| `shipmentDeliveryDate`   | `timestamp with time zone` |        | Ngày giao hàng dự kiến/thực tế                 |
| `shipmentFee`            | `integer`                  |        | Cước phí vận chuyển                            |
| `shipmentNote`           | `text`                     |        | Ghi chú vận chuyển                             |
| `createdAt`              | `timestamp with time zone` |        | Thời điểm tạo bản ghi                          |
| `modifiedAt`             | `timestamp with time zone` |        | Thời điểm cập nhật                             |
| `createdById`            | `text`                     |        | ID người tạo                                   |
| `deletedAt`              | `timestamp with time zone` |        | Thời điểm xóa bản ghi                          |

#### 3. Bảng `googleAccounts` (system.googleAccounts)

| Column Name    | Type        | Key    | Description                                     |
| :------------- | :---------- | :----- | :---------------------------------------------- |
| `accountId`    | `text`      | **PK** | ID định danh tài khoản Google.                  |
| `email`        | `text`      |        | Email Address.                                  |
| `accessToken`  | `text`      |        | OAuth2 Access Token.                            |
| `refreshToken` | `text`      |        | OAuth2 Refresh Token (Nếu có).                  |
| `expiryDate`   | `bigint`    |        | Thời điểm token hết hạn (Unix Timestamp).       |
| `tokenType`    | `text`      |        | Thường là `Bearer`.                             |
| `scope`        | `text`      |        | Quyền truy cập (`https://mail.google.com/`...). |
| `status`       | `text`      |        | `Active`, `Expired`, `Revoked`.                 |
| `createdAt`    | `timestamp` |        |                                                 |
| `modifiedAt`   | `timestamp` |        |                                                 |
| `deletedAt`    | `timestamp` |        |                                                 |

#### 4. Bảng `gmails` (system.gmails)

| Column Name       | Type        | Key    | Description                                                |
| :---------------- | :---------- | :----- | :--------------------------------------------------------- |
| `gmailId`         | `text`      | **PK** | Message ID hoặc Custom ID nội bộ.                          |
| `googleAccountId` | `text`      | **FK** | Tham chiếu đến tài khoản Google đã fetch.                  |
| `messageId`       | `text`      |        | ID gốc của Mail trên Google.                               |
| `threadId`        | `text`      |        | Thread ID trên Google.                                     |
| `senderEmail`     | `text`      |        | Người gửi.                                                 |
| `subject`         | `text`      |        | Tiêu đề email.                                             |
| `snippet`         | `text`      |        | Trích dẫn ngắn gửi kèm.                                    |
| `bodyText`        | `text`      |        | Nội dung text của email.                                   |
| `bodyHtml`        | `text`      |        | Nội dung HTML của email.                                   |
| `fileIds`         | `text[]`    | **FK** | Tham chiếu đến `document.files` (File đính kèm đã tải về). |
| `gmailStatus`     | `text`      |        | `Pending`, `Processing`, `Processed`, `Error`.             |
| `gmailMarks`      | `text[]`    |        | Đánh dấu bổ sung (Tags/Nhãn trạng thái).                   |
| `internalDate`    | `bigint`    |        | Thời gian nhận mail.                                       |
| `createdAt`       | `timestamp` |        |                                                            |
| `modifiedAt`      | `timestamp` |        |                                                            |
| `deletedAt`       | `timestamp` |        |                                                            |

#### 5. Các bảng khác (Placeholder)

- **suppliers**: Nhà cung cấp vật tư.

- **subcontractors**: Nhà thầu phụ phân tích mẫu gửi ngoài.

### G. SCHEMA CHEMICAL INVENTORY (`chemicalInventory`)

#### Phân hệ 1: INVENTORY MASTER DATA

#### 1. Bảng `chemicalSkus` (Danh mục Hóa chất Master)

| Column Name                 | Type      | Key    | Description                                           |
| :-------------------------- | :-------- | :----- | :---------------------------------------------------- |
| `chemicalSkuId`             | `text`    | **PK** | Mã gốc hóa chất (VD: `SKU_HNO3`).                     |
| `chemicalSkuOldId`          | `text`    |        | **[MỚI]** ID từ hệ thống cũ (migration reference).    |
| `chemicalName`              | `text`    |        | Tên gọi hóa chất (VD: `Axit Nitric 65%`).             |
| `chemicalCasNumber`         | `text`    |        | Số CAS.                                               |
| `chemicalBaseUnit`          | `text`    |        | Đơn vị lưu kho cơ bản (VD: `ml`, `g`).                |
| `chemicalTotalAvailableQty` | `numeric` |        | Tổng tồn kho khả dụng hiện tại.                       |
| `chemicalReorderLevel`      | `numeric` |        | Mức cảnh báo tồn tối thiểu.                           |
| `chemicalHazardClass`       | `text`    |        | Phân loại độc hại (`Flammable`, `Toxic`...).          |
| `openedExpDays`             | `int`     |        | **[MỚI]** Số ngày sử dụng tối đa sau mở nắp mặc định. |

#### 2. Bảng `chemicalSuppliers` (Danh mục Nhà cung cấp)

| Column Name                 | Type      | Key    | Description                                       |
| :-------------------------- | :-------- | :----- | :------------------------------------------------ |
| `chemicalSupplierId`        | `text`    | **PK** | Mã Nhà cung cấp (VD: `SUP_001`).                  |
| `supplierName`              | `text`    |        | Tên pháp nhân nhà cung cấp.                       |
| `supplierTaxCode`           | `text`    |        | Mã số thuế.                                       |
| `supplierAddress`           | `text`    |        | Địa chỉ trụ sở.                                   |
| `supplierContactPerson`     | `jsonb[]` |        | Liên hệ: `[{"contactName": "A", "phone": "123"}]` |
| `supplierStatus`            | `text`    |        | `Active`, `Inactive`, `Blacklisted`.              |
| `supplierEvaluationScore`   | `numeric` |        | Điểm đánh giá NCC (0 - 100).                      |
| `supplierIsoCertifications` | `jsonb`   |        | Danh sách chứng chỉ.                              |

#### 3. Bảng `chemicalSku_chemicalSupplier` (Bảng nối)

| Column Name                      | Type      | Key    | Description                     |
| :------------------------------- | :-------- | :----- | :------------------------------ |
| `chemicalSku_chemicalSupplierId` | `text`    | **PK** | ID bản ghi.                     |
| `chemicalSkuId`                  | `text`    | **FK** | Tham chiếu `chemicalSkus`.      |
| `chemicalSupplierId`             | `text`    | **FK** | Tham chiếu `chemicalSuppliers`. |
| `catalogNumber`                  | `text`    |        | Mã Catalog của hãng.            |
| `brandManufacturer`              | `text`    |        | Hãng sản xuất (VD: `Merck`).    |
| `packagingSize`                  | `numeric` |        | Quy cách đóng gói (VD: `500`).  |
| `leadTimeDays`                   | `int`     |        | Thời gian giao hàng dự kiến.    |

#### Phân hệ 2: WAREHOUSE OPERATIONS (Vận hành & Giao dịch Kho)

#### 4. Bảng `chemicalInventories` (Tồn kho vật lý thực tế - Từng chai)

| Column Name                   | Type      | Key    | Description                                                               |
| :---------------------------- | :-------- | :----- | :------------------------------------------------------------------------ |
| `chemicalInventoryId`         | `text`    | **PK** | Mã Barcode trên chai (VD: `BTL_2603_001`).                                |
| `chemicalSkuId`               | `text`    | **FK** | Mã SKU hóa chất.                                                          |
| `chemicalSkuOldId`            | `text`    |        | **[MỚI]** ID từ hệ thống cũ (migration reference).                        |
| `chemicalName`                | `text`    |        | Tên hóa chất.                                                             |
| `chemicalBaseUnit`            | `text`    |        | Đơn vị tính cơ bản.                                                       |
| `chemicalCasNumber`           | `text`    |        | Số CAS.                                                                   |
| `chemicalSupplierId`          | `text`    | **FK** | Mua từ NCC nào.                                                           |
| `lotNumber`                   | `text`    |        | Số Lô (Lot).                                                              |
| `manufacturerName`            | `text`    |        | Hãng sản xuất.                                                            |
| `manufacturerCountry`         | `text`    |        | Nước sản xuất.                                                            |
| `inventoryCoaDocumentIds`     | `text[]`  |        | File chứng nhận COA của lô.                                               |
| `inventoryInvoiceDocumentIds` | `text[]`  |        | File hóa đơn của lô.                                                      |
| `currentAvailableQty`         | `numeric` |        | Số lượng khả dụng hiện tại trong lọ.                                      |
| `totalGrossWeight`            | `numeric` |        | **[MỚI]** Tổng khối lượng cả bì.                                          |
| `mfgDate`                     | `date`    |        | Ngày sản xuất.                                                            |
| `expDate`                     | `date`    |        | Ngày hết hạn.                                                             |
| `openedDate`                  | `date`    |        | Ngày mở nắp thực tế.                                                      |
| `openedExpDays`               | `int`     |        | **[MỚI]** Số ngày sử dụng sau khi mở nắp (ghi đè từ SKU).                 |
| `openedExpDate`               | `date`    |        | Hạn sử dụng sau khi mở nắp (Hệ thống tính toán).                          |
| `chemicalInventoryStatus`     | `text`    |        | `Pending`, `Quarantined`, `New`, `InUse`, `Empty`, `Expired`, `Disposed`. |
| `storageBinLocation`          | `text`    |        | Vị trí lưu trữ chi tiết.                                                  |
| `storageConditions`           | `text`    |        | Điều kiện bảo quản/lưu trữ (ví dụ: nhiệt độ, ánh sáng...).                |

#### 5. Bảng `chemicalTransactionBlocks` (Phiếu Giao Dịch - Header)

| Column Name                       | Type        | Key    | Description                                                                      |
| :-------------------------------- | :---------- | :----- | :------------------------------------------------------------------------------- |
| `chemicalTransactionBlockId`      | `text`      | **PK** | Mã Phiếu (VD: `TRB_2603_01`).                                                    |
| `transactionType`                 | `text`      |        | `IMPORT` (Nhập), `EXPORT` (Xuất), `ADJUSTMENT` (Điều chỉnh).                     |
| `chemicalTransactionBlockStatus`  | `text`      |        | **[MỚI]** Trạng thái Phiếu: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`. |
| `referenceDocument`               | `text`      |        | Số Yêu cầu / PO tham chiếu.                                                      |
| `createdBy`                       | `text`      |        | Người tạo phiếu.                                                                 |
| `createdAt`                       | `timestamp` |        | Thời gian tạo.                                                                   |
| `approvedBy`                      | `text`      |        | **[MỚI]** Người duyệt phiếu.                                                     |
| `approvedAt`                      | `timestamp` |        | **[MỚI]** Thời gian duyệt.                                                       |
| `chemicalBlockCoaDocumentIds`     | `text[]`    |        | File chứng nhận COA của lô.                                                      |
| `chemicalBlockInvoiceDocumentIds` | `text[]`    |        | File hóa đơn của lô.                                                             |

> **Logic Cập nhật Tự động:** Khi duyệt `chemicalTransactionBlocks` sang `APPROVED`, nếu 2 trường `chemicalBlockCoaDocumentIds` và `chemicalBlockInvoiceDocumentIds` có dữ liệu (khác null/empty), hệ thống sẽ tự động cập nhật tài liệu tương ứng vào `inventoryCoaDocumentIds` và `inventoryInvoiceDocumentIds` của tất cả các chai/lọ (`chemicalInventoryId`) nằm trong phiếu giao dịch này.

#### 6. Bảng `chemicalTransactionBlockDetails` (Chi tiết Yêu cầu - BẢNG TẠM CHỜ DUYỆT)

_Lưu dữ liệu mà thuật toán gợi ý hoặc KTV xin xuất/nhập, nhưng CHƯA TÁC ĐỘNG VÀO KHO._

| Column Name                          | Type      | Key    | Description                                        |
| :----------------------------------- | :-------- | :----- | :------------------------------------------------- |
| `chemicalTransactionBlockDetailId`   | `text`    | **PK** | Mã dòng chi tiết tạm.                              |
| `chemicalTransactionBlockId`         | `text`    | **FK** | Thuộc Phiếu nào.                                   |
| `transactionType`                    | `text`    |        | `IMPORT`, `EXPORT`, `ADJUSTMENT`.                  |
| `chemicalSkuId`                      | `text`    | **FK** | Mã SKU.                                            |
| `chemicalSkuOldId`                   | `text`    |        | **[MỚI]** ID từ hệ thống cũ.                       |
| `chemicalName`                       | `text`    |        | Tên Hóa chất.                                      |
| `chemicalCasNumber`                  | `text`    |        | Số CAS.                                            |
| `chemicalInventoryId`                | `text`    | **FK** | **Dự kiến** bốc chai/lọ nào.                       |
| `changeQty`                          | `numeric` |        | **Dự kiến** thay đổi bao nhiêu.                    |
| `totalWeight`                        | `numeric` |        | **[MỚI]** Tổng khối lượng tại thời điểm giao dịch. |
| `chemicalTransactionBlockDetailUnit` | `text`    |        | Đơn vị tính.                                       |
| `parameterName`                      | `text`    |        | Xuất ra cho Phép thử nào.                          |
| `analysisId`                         | `text`    | **FK** | Phục vụ mã chỉ tiêu thực hiện nào.                 |
| `chemicalTransactionBlockDetailNote` | `text`    |        | Ghi chú.                                           |

#### 7. Bảng `chemicalTransactions` (Lịch sử giao dịch chính thức - LEDGER)

_Chỉ sinh ra dữ liệu khi Phiếu ở trạng thái APPROVED. Đây là Sổ cái không thể xóa sửa._

| Column Name                  | Type      | Key    | Description                                        |
| :--------------------------- | :-------- | :----- | :------------------------------------------------- |
| `chemicalTransactionId`      | `text`    | **PK** | Mã dòng giao dịch thực tế (VD: `TXN_99901`).       |
| `chemicalTransactionBlockId` | `text`    | **FK** | Nguồn gốc từ Phiếu nào.                            |
| `transactionType`            | `text`    |        | `IMPORT`, `EXPORT`, `ADJUSTMENT`.                  |
| `chemicalSkuId`              | `text`    | **FK** | Mã SKU.                                            |
| `chemicalSkuOldId`           | `text`    |        | **[MỚI]** ID từ hệ thống cũ.                       |
| `chemicalName`               | `text`    |        | Tên Hóa chất.                                      |
| `chemicalCasNumber`          | `text`    |        | Số CAS.                                            |
| `chemicalInventoryId`        | `text`    | **FK** | Mã Barcode của chai/lọ.                            |
| `changeQty`                  | `numeric` |        | Số lượng thay đổi.                                 |
| `totalWeight`                | `numeric` |        | **[MỚI]** Tổng khối lượng tại thời điểm xuất/nhập. |
| `chemicalTransactionUnit`    | `text`    |        | Đơn vị tính.                                       |
| `parameterName`              | `text`    |        | Xuất ra cho Phép thử nào.                          |
| `analysisId`                 | `text`    | **FK** | Phục vụ mã chỉ tiêu thực hiện nào.                 |
| `chemicalTransactionNote`    | `text`    |        | Ghi chú.                                           |

#### Phân hệ 3: INVENTORY AUDIT (Kiểm kê kho)

#### 8. Bảng `chemicalAuditBlocks` (Phiếu Kiểm Kê - Header)

| Column Name                  | Type        | Key    | Description                                                                                                    |
| :--------------------------- | :---------- | :----- | :------------------------------------------------------------------------------------------------------------- |
| `chemicalAuditBlockId`       | `text`      | **PK** | Mã phiếu kiểm kê (VD: `AUD_2603_01`).                                                                          |
| `auditName`                  | `text`      |        | Tên kỳ kiểm kê (VD: `Kiểm kê kho hóa chất Q1/2026`).                                                           |
| `auditScope`                 | `text`      |        | Phạm vi kiểm kê: `ALL`, `LOCATION`, `HAZARD_CLASS`, `SKU`.                                                     |
| `auditScopeValue`            | `text`      |        | Giá trị tương ứng với Scope (VD: Chọn Location `Tủ A`).                                                        |
| `chemicalAuditBlockStatus`   | `text`      |        | Trạng thái Phiếu: `DRAFT`, `IN_PROGRESS`, `PENDING_APPROVAL`, `COMPLETED`, `CANCELLED`.                        |
| `chemicalTransactionBlockId` | `text`      | **FK** | Tham chiếu đến mã Phiếu giao dịch tự động sinh ra khi duyệt chênh lệch (Link tới `chemicalTransactionBlocks`). |
| `assignedTo`                 | `text`      |        | User ID của nhân viên được giao đi kiểm kê.                                                                    |
| `createdBy`                  | `text`      |        | Người tạo phiếu.                                                                                               |
| `createdAt`                  | `timestamp` |        | Thời gian tạo (Lúc này hệ thống sẽ snapshot dữ liệu).                                                          |
| `approvedBy`                 | `text`      |        | Người quản lý duyệt kết quả kiểm kê.                                                                           |
| `approvedAt`                 | `timestamp` |        | Thời gian duyệt.                                                                                               |

#### 9. Bảng `chemicalAuditDetails` (Chi tiết Kiểm Kê)

| Column Name                     | Type      | Key    | Description                                                                                                 |
| :------------------------------ | :-------- | :----- | :---------------------------------------------------------------------------------------------------------- |
| `chemicalAuditDetailId`         | `text`    | **PK** | Mã dòng chi tiết kiểm kê.                                                                                   |
| `chemicalAuditBlockId`          | `text`    | **FK** | Thuộc phiếu kiểm kê nào.                                                                                    |
| `chemicalSkuId`                 | `text`    | **FK** | Mã gốc hóa chất (Tham chiếu `chemicalSkus`).                                                                |
| `chemicalSkuOldId`              | `text`    |        | **[MỚI]** ID từ hệ thống cũ.                                                                                |
| `chemicalInventoryId`           | `text`    | **FK** | Mã Barcode của chai/lọ cụ thể (Tham chiếu `chemicalInventories`).                                           |
| `systemAvailableQty`            | `numeric` |        | Số lượng trên hệ thống lúc bắt đầu kiểm kê (Lấy từ `currentAvailableQty`).                                  |
| `systemChemicalInventoryStatus` | `text`    |        | Trạng thái trên hệ thống (Lấy từ `chemicalInventoryStatus`).                                                |
| `actualAvailableQty`            | `numeric` |        | Số lượng thực tế đếm/cân được ở kho.                                                                        |
| `actualChemicalInventoryStatus` | `text`    |        | Trạng thái thực tế khi KTV ghi nhận (`InUse`, `Disposed`...).                                               |
| `varianceQty`                   | `numeric` |        | **Độ lệch** (`actualAvailableQty - systemAvailableQty`). >0 là Thừa, <0 là Thiếu, =0 là Khớp.               |
| `isScanned`                     | `boolean` |        | `true` nếu KTV đã quét mã vạch này bằng máy. Quản lý việc chai có trên hệ thống nhưng tìm không thấy ở kho. |
| `chemicalAuditDetailNote`       | `text`    |        | Ghi chú/Giải trình cho độ lệch (VD: "Bay hơi", "Đổ vỡ", "Hàng mượn chưa nhập hệ thống").                    |

---

### H. SCHEMA GENERAL INVENTORY (`inventory`)

Chứa thông tin kho vật tư, dụng cụ, thiết bị văn phòng và quản lý thiết bị.

#### Phân hệ 1: MASTER DATA

#### 1. Bảng `inventorySkus` (Danh mục Vật tư Master)

| Column Name             | Type      | Key    | Description                                   |
| :---------------------- | :-------- | :----- | :-------------------------------------------- |
| `inventorySkuId`        | `text`    | **PK** | Mã gốc vật tư (VD: `SKU_TONER_01`).           |
| `inventoryItemName`     | `text`    |        | Tên gọi vật tư (VD: `Mực máy in Canon`).      |
| `inventoryItemType`     | `text`    |        | Phân loại: `Stationery`, `Tool`, `Furniture`. |
| `inventoryBaseUnit`     | `text`    |        | Đơn vị tính cơ bản (VD: `Cái`, `Hộp`, `Ram`). |
| `inventoryTotalQty`     | `numeric` |        | Tổng tồn kho hiện tại.                        |
| `inventoryReorderLevel` | `numeric` |        | Mức cảnh báo tồn tối thiểu.                   |
| `inventoryDescription`  | `text`    |        | Mô tả chi tiết.                               |

#### 2. Bảng `inventorySuppliers` (Danh mục Nhà cung cấp vật tư)

| Column Name             | Type      | Key    | Description                                       |
| :---------------------- | :-------- | :----- | :------------------------------------------------ |
| `inventorySupplierId`   | `text`    | **PK** | Mã Nhà cung cấp (VD: `ISUP_001`).                 |
| `supplierName`          | `text`    |        | Tên pháp nhân nhà cung cấp.                       |
| `supplierTaxCode`       | `text`    |        | Mã số thuế.                                       |
| `supplierAddress`       | `text`    |        | Địa chỉ trụ sở.                                   |
| `supplierContactPerson` | `jsonb[]` |        | Liên hệ: `[{"contactName": "A", "phone": "123"}]` |
| `supplierStatus`        | `text`    |        | `Active`, `Inactive`.                             |

#### Phân hệ 2: WAREHOUSE OPERATIONS

#### 3. Bảng `inventoryItems` (Tồn kho vật lý thực tế)

| Column Name           | Type      | Key    | Description                                  |
| :-------------------- | :-------- | :----- | :------------------------------------------- |
| `inventoryItemId`     | `text`    | **PK** | Mã định danh vật phẩm (VD: `ITEM_2603_001`). |
| `inventorySkuId`      | `text`    | **FK** | Mã SKU vật tư.                               |
| `inventoryItemName`   | `text`    |        | Tên vật tư.                                  |
| `inventoryBaseUnit`   | `text`    |        | Đơn vị tính.                                 |
| `inventorySupplierId` | `text`    | **FK** | Mua từ NCC nào.                              |
| `serialNumber`        | `text`    |        | Số Serial (nếu có, cho thiết bị).            |
| `lotNumber`           | `text`    |        | Số Lô sản xuất.                              |
| `manufacturerName`    | `text`    |        | Hãng sản xuất.                               |
| `currentQty`          | `numeric` |        | Số lượng hiện có.                            |
| `mfgDate`             | `date`    |        | Ngày sản xuất.                               |
| `expDate`             | `date`    |        | Ngày hết hạn (nếu có).                       |
| `inventoryItemStatus` | `text`    |        | `New`, `InUse`, `Broken`, `Disposed`.        |
| `storageLocation`     | `text`    |        | Vị trí lưu trữ.                              |

#### 4. Bảng `inventoryTransactionBlocks` (Phiếu Giao Dịch Kho - Header)

| Column Name              | Type        | Key    | Description                                                            |
| :----------------------- | :---------- | :----- | :--------------------------------------------------------------------- |
| `inventoryTxBlockId`     | `text`      | **PK** | Mã Phiếu (VD: `ITB_2603_01`).                                          |
| `transactionType`        | `text`      |        | `IMPORT`, `EXPORT`, `ADJUSTMENT` .                                     |
| `inventoryTxBlockStatus` | `text`      |        | Trạng thái Phiếu: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`. |
| `referenceDocument`      | `text`      |        | Chứng từ đi kèm / PO.                                                  |
| `departmentId`           | `text`      |        | Bộ phận yêu cầu/nhận.                                                  |
| `createdBy`              | `text`      |        | Người tạo phiếu.                                                       |
| `createdAt`              | `timestamp` |        | Thời gian tạo.                                                         |
| `approvedBy`             | `text`      |        | Người duyệt.                                                           |
| `approvedAt`             | `timestamp` |        | Thời gian duyệt.                                                       |

#### 5. Bảng `inventoryTxBlockDetails` (Chi tiết Yêu cầu Giao dịch)

| Column Name             | Type      | Key    | Description                           |
| :---------------------- | :-------- | :----- | :------------------------------------ |
| `inventoryTxDetailId`   | `text`    | **PK** | Mã dòng chi tiết.                     |
| `inventoryTxBlockId`    | `text`    | **FK** | Thuộc Phiếu nào.                      |
| `inventorySkuId`        | `text`    | **FK** | Mã SKU.                               |
| `inventoryItemName`     | `text`    |        | Tên vật tư.                           |
| `inventoryItemId`       | `text`    | **FK** | Chai/Lọ/Cái cụ thể (nếu đã chỉ định). |
| `changeQty`             | `numeric` |        | Số lượng yêu cầu.                     |
| `inventoryUnit`         | `text`    |        | Đơn vị tính.                          |
| `inventoryTxDetailNote` | `text`    |        | Ghi chú.                              |

#### 6. Bảng `inventoryTransactions` (Sổ cái giao dịch - Ledger)

| Column Name          | Type        | Key    | Description                   |
| :------------------- | :---------- | :----- | :---------------------------- |
| `inventoryTxid`      | `text`      | **PK** | Mã dòng giao dịch chính thức. |
| `inventoryTxBlockId` | `text`      | **FK** | Nguồn gốc từ Phiếu nào.       |
| `inventorySkuId`     | `text`      | **FK** | Mã SKU.                       |
| `inventoryItemId`    | `text`      | **FK** | ID vật phẩm thực tế.          |
| `changeQty`          | `numeric`   |        | Số lượng thực tế thay đổi.    |
| `inventoryUnit`      | `text`      |        | Đơn vị tính.                  |
| `transactionTime`    | `timestamp` |        | Thời điểm giao dịch thực tế.  |

### I. SCHEMA GENERAL INVENTORY (`labInventories`)

_Quản lý toàn bộ vật tư, thiết bị, dụng cụ và nhật ký truy vết._

#### 1. Bảng `labSkus` (Danh mục Thiết bị & Dụng cụ)

_Lưu trữ thông tin danh mục (Master Data) của các loại thiết bị, dụng cụ và vật tư._

| Column Name            | Type      | Key    | Description                                               |
| :--------------------- | :-------- | :----- | :-------------------------------------------------------- |
| `labSkuId`             | `text`    | **PK** | Mã danh mục (VD: `SKU-HPLC-1260`).                        |
| `labSkuName`           | `text`    |        | Tên danh mục (VD: `Máy HPLC Agilent 1260`).               |
| `labSkuCode`           | `text`    | **UQ** | Mã SKU nội bộ.                                            |
| `labSkuType`           | `text`    |        | Phân loại: `Equipment`, `Tool`, `Material`, `Chemical`... |
| `labSkuUnit`           | `text`    |        | Đơn vị tính (`Cái`, `Bộ`, `Máy`, `Hộp`...).               |
| `labSkuManufacturer`   | `text`    |        | Nhà sản xuất.                                             |
| `labSkuModel`          | `text`    |        | Model/Dòng sản phẩm.                                      |
| `labSkuSpecifications` | `jsonb`   |        | Thông số kỹ thuật chung của dòng sản phẩm.                |
| `requiresCalibration`  | `boolean` |        | Có yêu cầu hiệu chuẩn định kỳ không.                      |

#### 2. Bảng `labInventories` (Vật tư - Kho - Thiết bị thực tế)

_Quản lý các thực thể vật lý (Instance) hoặc lượng tồn kho trong phòng thí nghiệm._

| Column Name                       | Type      | Key    | Description                                   |
| :-------------------------------- | :-------- | :----- | :-------------------------------------------- |
| `labInventoryId`                  | `text`    | **PK** | Mã thực thể (VD: `INV-HPL-001`).              |
| `labSkuId`                        | `text`    | **FK** | Link tới `labSkus.labSkuId`.                  |
| `labSkuName`                      | `text`    |        | Tên danh mục (Copy từ SKU để hiển thị).       |
| `labSkuType`                      | `text`    |        | Phân loại: `Equipment`, `Tool`, `Material`.   |
| `labInventoryCode`                | `text`    | **UQ** | Mã tài sản/Số thẻ tài sản riêng của máy.      |
| `labInventorySerial`              | `text`    |        | Số serial riêng của thiết bị.                 |
| `labInventoryStatus`              | `text`    |        | `Ready`, `InUse`, `Maintenance`, `Faulty`.    |
| `labInventoryLocation`            | `text`    |        | Vị trí đặt thiết bị/vị trí lưu kho.           |
| `labInventoryQty`                 | `numeric` |        | Số lượng (dùng cho vật tư/hóa chất tiêu hao). |
| `labInventoryLastCalibrationDate` | `date`    |        | Ngày hiệu chuẩn gần nhất.                     |
| `labInventoryNextCalibrationDate` | `date`    |        | Hạn hiệu chuẩn tiếp theo.                     |
| `labInventoryImportDate`          | `date`    |        | Ngày nhập kho.                                |
| `labInventoryExpiryDate`          | `date`    |        | Ngày hết hạn (dùng cho vật tư/hóa chất).      |
| `labInventoryWarrantyExpiryDate`  | `date`    |        | Hết hạn bảo hành.                             |
| `labInventoryDocumentIds`         | `text[]`  | **FK** | Link tài liệu cụ thể của máy (Kiểm định...).  |
| `labInventoryNotes`               | `text`    |        | Ghi chú riêng cho thực thể này.               |

#### 3. Bảng `assetActivityLogs` (Sổ cái Truy vết Tài sản)

_Ghi lại nhật ký sử dụng, bảo trì, hiệu chuẩn cho các thực thể trong `labInventories`._

| Column Name      | Type        | Key     | Description                                                 |
| :--------------- | :---------- | :------ | :---------------------------------------------------------- |
| `logId`          | `text`      | **PK**  | ID dòng nhật ký (VD: `LOG-001`).                            |
| `assetId`        | `text`      | **FK**  | ID tài sản (Là `labInventoryId`).                           |
| `assetTable`     | `text`      |         | Bảng chứa thực thể: `labInventories`.                       |
| `logType`        | `text`      |         | Sự kiện: `Usage`, `Maintenance`, `Calibration`, `Incident`. |
| `logDescription` | `text`      |         | Mô tả nội dung sự kiện.                                     |
| `logLocation`    | `text`      |         | Vị trí thực hiện.                                           |
| `logData`        | `jsonb`     |         | Dữ liệu đo kèm theo.                                        |
| `commonKeys`     | `text[]`    | **IDX** | Keys truy vết chéo: `["analysisId:...", "receiptId:..."]`.  |
| `actionTime`     | `timestamp` |         | Thời gian thực tế diễn ra.                                  |
| _Audit Cols_     | ...         |         | `createdAt`, `createdById`...                               |
| _Audit Cols_     | ...         |         | `createdAt`, `createdById`...                               |

#### 4.

---

### J. SCHEMA SYSTEM (`system`)

Chứa các bảng nhật ký sự kiện nghiệp vụ và quản lý rủi ro.

#### 1. Bảng `businessEvents` (Nhật ký sự kiện nghiệp vụ)

| Column Name   | Type     | Key    | Description                                                                  |
| :------------ | :------- | :----- | :--------------------------------------------------------------------------- |
| `eventId`     | `text`   | **PK** | ID sự kiện (VD: `EVT001`).                                                   |
| `entityType`  | `text`   |        | Loại thực thể: `IncomingRequests`, `Receipts`, `Analyses`, `Samples`.        |
| `entityId`    | `text`   |        | ID của thực thể liên quan.                                                   |
| `eventStatus` | `text`   |        | Trạng thái sự kiện (VD: `DataEntered`, `Paid`).                              |
| `eventNote`   | `text`   |        | Ghi chú sự kiện.                                                             |
| `eventData`   | `jsonb`  |        | Dữ liệu payload: `{ dataReq, dataRes, snapshot: { oldStatus, newStatus } }`. |
| `involvedIds` | `text[]` | **FK** | Danh sách những người liên quan (thông báo).                                 |
| _Audit Cols_  | ...      |        | `createdAt`, `createdById`, `modifiedAt`, ...                                |

#### 2. Bảng `riskRegisters` (Sổ tay quản trị rủi ro)

| Column Name       | Type   | Key    | Description                      |
| :---------------- | :----- | :----- | :------------------------------- |
| `riskId`          | `text` | **PK** | ID rủi ro.                       |
| `riskTitle`       | `text` |        | Tiêu đề rủi ro.                  |
| `riskDescription` | `text` |        | Mô tả chi tiết.                  |
| `riskLevel`       | `text` |        | Mức độ: `High`, `Medium`, `Low`. |
| `riskStatus`      | `text` |        | Trạng thái: `Open`, `Mitigated`. |
| `mitigationPlan`  | `text` |        | Kế hoạch/Hành động giảm thiểu.   |
| _Audit Cols_      | ...    |        | `createdAt`, `createdById`, ...  |

---

## III. CHI TIẾT CẤU TRÚC JSONB

### 1. `matrixSnapshot` (Dùng trong Quote/Order/Analysis)

Để đảm bảo khi danh mục Matrix thay đổi giá, các đơn hàng cũ không bị ảnh hưởng.

```typescript

{

  "matrixId": "MAT-001",

  "fee": 500000,

  "tax": 8,

  "lod": "0.01",

  "loq": "0.03",

  "limit": "< 0.05",

  "protocol": "TCVN 1234"

}

```

### 2. `samples` in Order/Quote (Updated for Matrix)

Lưu danh sách yêu cầu phân tích, sử dụng `matrixId` để định danh chỉ tiêu & phương pháp.

### 2. `samples` in Order/Quote/IncomingRequest

Lưu danh sách yêu cầu phân tích với cấu trúc chi tiết hỗ trợ dynamic logic.

```json
[
    {
        "sampleName": "DAY CREAM SUNSCREEN",
        "sampleNote": "",
        "sampleMatrix": "Water",
        "analyses": [
            {
                "id": "temp-analysis-...",
                "parameterId": "PM148607",
                "parameterName": "Chỉ số chống nắng SPF",
                "matrixId": "MATe7aa1cf1",
                "quantity": 1,
                "unitPrice": 1800000,
                "feeBeforeTax": 1800000,
                "taxRate": 5,
                "tax": 90000,
                "feeAfterTax": 1890000,
                "discountRate": 0,
                "LOD": null,
                "LOQ": null,
                "thresholdLimit": null,
                "turnaroundTime": null,
                "sampleTypeName": "Mỹ phẩm",
                "protocolCode": null,
                "protocolSource": null
            }
        ]
    }
]
```

### 3. `client` Snapshot

```typescript
interface ClientSnapshot {
    clientId: string;

    legalId?: string;

    clientName: string;

    clientAddress: string;

    clientEmail: string;

    invoiceInfo?: {
        taxAddress: string;

        taxCode: string;

        taxName: string;

        taxEmail: string;
    };

    contact?: {
        // Deprecated/Moved to separate column but might still be kept in sync object for backward compat or ease of access

        contactName: string;

        contactPhone: string;

        contactEmail: string;

        contactPosition?: string;

        contactAddress?: string;

        contactId?: string;
    };
}
```

---

## IV. HƯỚNG DẪN TRIỂN KHAI & QUY ĐỊNH (IMPLEMENTATION GUIDELINES)

### 1. Naming Convention

- **Table Name**: Luôn là số nhiều, `camelCase` (VD: `sampleTypes`, `parameterProtocols`).

- **Column Name**: `camelCase` (VD: `isDeleted`, `totalAmount`).

- **Foreign Key**: `tableName` (số ít) + `Id` (VD: `sampleId`, `receiptId`).

### 2. Chiến \ `lược Indexing

- **Bắt buộc**: Index cho tất cả các cột Foreign Key.

- **Bắt buộc**: Index cho cột `deletedAt` (vì hầu hết các query đều filter `deletedAt IS NULL`).

- **Tối ưu**: Sử dụng `GIN Index` cho các cột `jsonb` nếu có nhu cầu search sâu vào object. Bắt buộc tạo **GIN Index** cho bảng `assetActivityLogs` phần `commonKeys` (`CREATE INDEX idx_asset_logs_common_keys ON inventory."assetActivityLogs" USING GIN ("commonKeys");`) để hỗ trợ truy vết tức thời hàng triệu records.

### 3. Ràng buộc toàn vẹn (Constraints)

- Sử dụng `ON DELETE RESTRICT` cho các bảng danh mục (Parameters, Protocols, Matrix) để tránh mất dữ liệu lịch sử khi một danh mục đang được sử dụng trong phiếu phân tích.

- Check Constraint cho các trường trạng thái (`status`) để đảm bảo đúng tập dữ liệu cho phép.

### 4. Schema Evolution

- Mọi thay đổi Schema phải được thực hiện qua **Migration Scripts**.

- Khi thêm cột mới, phải đảm bảo có giá trị Default hoặc cho phép Null để không làm gãy các Tenant đang hoạt động.
