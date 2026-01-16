# TÀI LIỆU THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE DESIGN DOCUMENT)

**Dự án:** LIMS Multi-Lab SaaS Platform
**Phiên bản:** 2.2.2 (Order-based Public Forms)
**Ngày cập nhật:** 16/01/2026
**Tham chiếu:** [RULE.md](./RULE.md), [BA.md](./BA.md), [API Documentation](./src/api/API_DOCUMENTATION.md)

---

## I. TỔNG QUAN CHIẾN LƯỢC (STRATEGIC OVERVIEW)

### 1. Kiến trúc lưu trữ (Storage Architecture)

-   **Engine**: PostgreSQL 16+.
-   **Multi-tenancy**: Mô hình **Schema-per-Tenant**.
    -   `public`: Lưu trữ quản lý hệ thống (Tenants, Subscriptions, Global Configs).
    -   `tenant_{tenantId}`: Chứa toàn bộ dữ liệu nghiệp vụ riêng biệt của từng Lab.
-   **Khóa chính (PK)**: Sử dụng **Custom Text ID** (VD: `MAT-0001`, `REC2412-001`) thay cho UUID/Serial để tối ưu hóa việc đọc hiểu và tính duy nhất trên toàn hệ thống.

### 2. Quy tắc Audit & Soft Delete

Tất cả các bảng (ngoại trừ bảng trung gian thuần túy) phải bao gồm các cột:

-   `createdAt` (timestamp): Thời điểm tạo.
-   `createdById` (text): ID người tạo.
-   `modifiedAt` (timestamp): Thời điểm cập nhật cuối.
-   `modifiedById` (text): ID người cập nhật cuối.
-   `deletedAt` (timestamp): Dùng cho **Soft Delete**. Mặc định là `NULL`.

---

## II. CHI TIẾT SCHEMA (DETAILED SCHEMA)

### A. SCHEMA IDENTITY (`identity`)

Chứa thông tin danh tính và phiên làm việc.

#### 1. Bảng `identities` (Danh tính User)

| Column Name      | Type    | Key    | Description                                                                                                                                                                                                                                                                                                                                                                                                                   |
| :--------------- | :------ | :----- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identityId`     | `text`  | **PK** | Custom Text ID.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `email`          | `text`  | **UQ** | Email.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `identityName`   | `text`  |        | Tên hiển thị.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `alias`          | `text`  |        | Bí danh trong vị trí công việc.                                                                                                                                                                                                                                                                                                                                                                                               |
| `roles`          | `jsonb` |        | Vị trí công việc: `{'admin': true/false, 'customerService': true/false, 'technician': true/false, 'collaborator': true/false, 'administrative': true/false, 'accountant': true/false, 'sampleManager': true/false, 'superAdmin': true/false, 'dispatchClerk': true/false, 'documentManagementSpecialist': true/false, bot:true/false , IT: true/false , marketingCommunications: true/false, qualityControl: true/false,  }`. |
| `permissions`    | `jsonb` |        | Quyền truy cập: .                                                                                                                                                                                                                                                                                                                                                                                                             |
| `password`       | `text`  |        | Mật khẩu.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `identityStatus` | `text`  |        | Trạng thái: `{'active', 'inactive'}`.                                                                                                                                                                                                                                                                                                                                                                                         |
| _Audit Cols_     | ...     |        |                                                                                                                                                                                                                                                                                                                                                                                                                               |

#### 2. Bảng `sessions` (Phiên đăng nhập)

| Column Name     | Type        | Key    | Description                               |
| :-------------- | :---------- | :----- | :---------------------------------------- |
| `sessionId`     | `text`      | **PK** | Custom Text ID.                           |
| `identityId`    | `text`      | **FK** | Tham chiếu `identities`.                  |
| `sessionExpiry` | `timestamp` |        | Thời gian hết hạn phiên.                  |
| `sessionStatus` | `text`      |        | `active` (default), `expired`, `revoked`. |
| `ipAddress`     | `text`      |        | IP người dùng.                            |
| `sessionDomain` | `text`      |        | Domain đăng nhập.                         |
| `createdAt`     | `timestamp` |        | Thời điểm tạo phiên.                      |
| `modifiedAt`    | `timestamp` |        | Thời điểm cập nhật cuối.                  |

---

### B. SCHEMA CRM (`crm`)

Chứa thông tin khách hàng và bán hàng.

#### 1. Bảng `clients` (Danh sách Khách hàng)

| Column Name        | Type      | Key    | Description                                                                                                                                 |
| :----------------- | :-------- | :----- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `clientId`         | `text`    | **PK** | Custom Text ID.                                                                                                                             |
| `clientName`       | `text`    |        | Tên công ty / Cá nhân.                                                                                                                      |
| `legalId`          | `text`    |        | Mã số thuế / CMND.                                                                                                                          |
| `clientAddress`    | `text`    |        | Địa chỉ trụ sở.                                                                                                                             |
| `clientPhone`      | `text`    |        | SĐT trụ sở.                                                                                                                                 |
| `clientEmail`      | `text`    |        | Email trụ sở.                                                                                                                               |
| `clientSaleScope`  | `text`    |        | Phạm vi quyền: `'public'` (Toàn cty), `'private'` (Riêng sale).                                                                             |
| `availableByIds`   | `text[]`  |        | Danh sách ID Sale/CTV được phép truy cập (nếu private).                                                                                     |
| `availableByName`  | `text[]`  |        | Danh sách tên Sale/CTV được phép truy cập (nếu private).                                                                                    |
| `clientContacts`   | `jsonb[]` |        | [{ contactName, contactPhone, contactEmail, contactPosition, contactAddress, contactId }]. **Note**: Frontend có thể dùng alias `contacts`. |
| `invoiceInfo`      | `jsonb`   |        | Thông tin xuất hóa đơn {taxAddress, taxCode, taxName, taxEmail }.                                                                           |
| `totalOrderAmount` | `numeric` |        | Tổng doanh số tích lũy (Cached).                                                                                                            |
| _Audit Cols_       | ...       |        |                                                                                                                                             |

#### 2. Bảng `orders` (Đơn hàng)

| Column Name                    | Type      | Key    | Description                                                                                                                                                                                            |
| :----------------------------- | :-------- | :----- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orderId`                      | `text`    | **PK** | Custom Text ID.                                                                                                                                                                                        |
| `quoteId`                      | `text`    | **FK** | Tham chiếu báo giá nguồn (nếu có).                                                                                                                                                                     |
| `clientId`                     | `text`    | **FK** |                                                                                                                                                                                                        |
| `client`                       | `jsonb`   |        | Snapshot khách hàng.                                                                                                                                                                                   |
| `contactPerson`                | `jsonb`   |        | Thông tin người liên hệ.                                                                                                                                                                               |
| `salePersonId`                 | `text`    |        |                                                                                                                                                                                                        |
| `salePerson`                   | `text`    |        |                                                                                                                                                                                                        |
| `saleCommissionPercent`        | `numeric` |        | % doanh số cho salePerson.                                                                                                                                                                             |
| `samples`                      | `jsonb[]` |        | Chi tiết yêu cầu: `[{ sampleName, sampleTypeName ,analyses: [{parameterName ,parameterId, feeBeforeTax, taxRate, feeAfterTax }]`. Note: `feeBeforeTax` có thể null và cần tính ngược từ `feeAfterTax`. |
| `totalAmount`                  | `numeric` |        | Giá trị hợp đồng.                                                                                                                                                                                      |
| `totalFeeBeforeTax`            | `numeric` |        | Tổng chưa thuế (Sum Net Prices).                                                                                                                                                                       |
| `totalFeeBeforeTaxAndDiscount` | `numeric` |        | Tổng giá niêm yết (Sum List Prices - trước khi trừ chiết khấu).                                                                                                                                        |
| `totalTaxValue`                | `numeric` |        | Giá trị thuế                                                                                                                                                                                           |
| `totalDiscountValue`           | `numeric` |        | Giá trị giảm giá                                                                                                                                                                                       |
| `orderStatus`                  | `text`    |        | `Pending`, `Processing`, `Completed`, `Cancelled`.                                                                                                                                                     |
| `taxRate`                      | `numeric` |        | Thuế suất áp dụng chung.                                                                                                                                                                               |
| `discountRate`                 | `numeric` |        | Số tiền/Phần trăm chiết khấu (trên tổng chưa thuế).                                                                                                                                                    |
| `paymentStatus`                | `text`    |        | `Unpaid`, `Partial`, `Paid`, `Debt`.                                                                                                                                                                   |
| `transactions`                 | `jsonb[]` |        | Lịch sử thanh toán: `[{ amount, date, method, note }]`.                                                                                                                                                |
| `orderUri`                     | `text`    |        | Token/Link truy cập công khai cho phiếu gửi mẫu.                                                                                                                                                       |
| `requestForm`                  | `text`    |        | Toàn bộ nội dung HTML của Phiếu gửi mẫu (từ Editor).                                                                                                                                                   |
| _Audit Cols_                   | ...       |        |                                                                                                                                                                                                        |

#### 3. Bảng `quotes` (Báo giá)

Bảng này cập nhật logic sử dụng `matrixId` để tham chiếu giá và phương pháp.

| Column Name                    | Type      | Key    | Description                                         |
| :----------------------------- | :-------- | :----- | :-------------------------------------------------- |
| `quoteId`                      | `text`    | **PK** | Custom Text ID.                                     |
| `quoteCode`                    | `text`    |        | Mã báo giá (Readable).                              |
| `clientId`                     | `text`    | **FK** |                                                     |
| `client`                       | `jsonb`   |        | Snapshot thông tin khách khi báo giá.               |
| `salePersonId`                 | `text`    |        |                                                     |
| `salePerson`                   | `jsonb`   |        | Thông tin Sale phụ trách: `{ id, name }`.           |
| `contactPerson`                | `jsonb`   |        | Thông tin người liên hệ.                            |
| `samples`                      | `jsonb[]` |        | Danh sách mẫu & chỉ tiêu. Chi tiết dùng `matrixId`. |
| `totalFeeBeforeTax`            | `numeric` |        | Tổng chưa thuế (Sum Net Prices).                    |
| `totalFeeBeforeTaxAndDiscount` | `numeric` |        | Tổng giá niêm yết (Sum List Prices).                |
| `totalTaxValue`                | `numeric` |        | Giá trị thuế                                        |
| `totalDiscountValue`           | `numeric` |        | Giá trị giảm giá                                    |
| `taxRate`                      | `numeric` |        | Thuế suất áp dụng chung.                            |
| `discount`                     | `numeric` |        | Số tiền/Phần trăm chiết khấu (trên tổng chưa thuế). |
| `totalAmount`                  | `numeric` |        | Tổng tiền cuối cùng.                                |
| `quoteStatus`                  | `text`    |        | `Draft`, `Sent`, `Approved`, `Expired`.             |
| _Audit Cols_                   | ...       |        |                                                     |

---

### C. SCHEMA LIBRARY (`library`)

Chứa các bảng danh mục cấu hình.

#### 1. Bảng `matrices` (Ma trận cấu hình & Giá)

Bảng trung gian quan trọng nhất, kết hợp 3 bảng trên để tạo ra đơn giá và ngưỡng kỹ thuật.

| Column Name             | Type      | Key    | Description                                            |
| :---------------------- | :-------- | :----- | :----------------------------------------------------- |
| `matrixId`              | `text`    | **PK** | ID tùy chỉnh (VD: `MAT001`).                           |
| `parameterId`           | `text`    |        | (Optional) Tham chiếu `parameters` nếu có.             |
| `protocolId`            | `text`    |        | (Optional) Tham chiếu `protocols` nếu có.              |
| `sampleTypeId`          | `text`    | **FK** | Tham chiếu `sampleTypes`.                              |
| `protocolCode`          | `text`    |        | Mã phương pháp (Nhập trực tiếp hoặc từ protocol).      |
| `protocolSource`        | `text`    |        | Nguồn phương pháp.                                     |
| `protocolAccreditation` | `jsonb`   |        | Phạm vi được công nhận của phương pháp.                |
| `parameterName`         | `text`    |        | Tên chỉ tiêu (Nhập trực tiếp).                         |
| `sampleTypeName`        | `text`    |        | Tham chiếu `sampleTypes`.                              |
| `feeBeforeTax`          | `numeric` |        | Đơn giá trước thuế.                                    |
| `taxRate`               | `numeric` |        | Thuế suất (8, 10...).                                  |
| `feeAfterTax`           | `numeric` |        | Đơn giá sau thuế (Niêm yết).                           |
| `LOD`                   | `text`    |        | Giới hạn phát hiện (Limit of Detection).               |
| `LOQ`                   | `text`    |        | Giới hạn định lượng (Limit of Quantitation).           |
| `thresholdLimit`        | `text`    |        | Ngưỡng quy chuẩn cho phép (Để đánh giá Đạt/Không đạt). |
| `turnaroundTime`        | `int`     |        | Thời gian thực hiện tiêu chuẩn (số ngày).              |
| `technicianGroupId`     | `text`    |        | Tổ chuyên môn phụ trách.                               |
| _Audit Cols_            | ...       |        |                                                        |

#### 2. Bảng `protocols` (Phương pháp thử - SOP)

Danh mục các tiêu chuẩn áp dụng (TCVN, ISO, ASTM...).

| Column Name             | Type    | Key    | Description                                                             |
| :---------------------- | :------ | :----- | :---------------------------------------------------------------------- |
| `protocolId`            | `text`  | **PK** | ID tùy chỉnh (VD: `PRO001`).                                            |
| `protocolCode`          | `text`  |        | Mã hiệu (VD: `TCVN 6661-1:2011`).                                       |
| `protocolSource`        | `text`  |        | Nguồn ban hành (ISO, AOAC, EPA...).                                     |
| `protocolAccreditation` | `jsonb` |        | Phạm vi được công nhận của phương pháp: `{"VILAS": true, "TDC": true}`. |
| _Audit Cols_            | ...     |        |                                                                         |

#### 3. Bảng `parameters` (Chỉ tiêu phân tích)

Lưu trữ danh tính của các chỉ tiêu hóa/lý/vi sinh.

| Column Name       | Type    | Key    | Description                                    |
| :---------------- | :------ | :----- | :--------------------------------------------- |
| `parameterId`     | `text`  | **PK** | ID tùy chỉnh (VD: `PAR001`).                   |
| `parameterName`   | `text`  |        | Tên chỉ tiêu (VD: `Chì (Pb)`, `Tổng số VSV`).  |
| `displayStyle`    | `jsonb` |        | Cấu hình hiển thị (Định dạng số thập phân...). |
| `technicianAlias` | `text`  |        | Tên nội bộ cho kỹ thuật viên.                  |
| _Audit Cols_      | ...     |        |                                                |

#### 4. Bảng `sampleTypes` (Loại mẫu/Nhóm sản phẩm)

Phân loại mẫu để áp dụng đơn giá và ngưỡng quy chuẩn.

| Column Name        | Type    | Key    | Description                                         |
| :----------------- | :------ | :----- | :-------------------------------------------------- |
| `sampleTypeId`     | `text`  | **PK** | ID tùy chỉnh (VD: `ST001`).                         |
| `sampleTypeName`   | `text`  |        | Tên (VD: `Thực phẩm bảo vệ sức khỏe`, `Nước thải`). |
| `displayTypeStyle` | `jsonb` |        | {eng: <tên tiếng anh>, default: <tên tiếng Việt>}   |
| _Audit Cols_       | ...     |        |                                                     |

#### 5. Bảng `parameterGroups` (Nhóm chỉ tiêu / Gói kiểm)

Bảng định nghĩa các gói/nhóm chỉ tiêu để tư vấn bán hàng và báo giá nhanh.

| Column Name               | Type            | Key    | Description                                                        |
| :------------------------ | :-------------- | :----- | :----------------------------------------------------------------- |
| `groupId`                 | `text`          | **PK** | Mã nhóm chỉ tiêu (Custom Text ID).                                 |
| `groupName`               | `text`          |        | Tên nhóm chỉ tiêu (VD: Gói kiểm nhanh thực phẩm).                  |
| `matrixIds`               | `text[]`        |        | Mảng mã liên kết với bảng `library.matrices`. (GIN Index support). |
| `groupNote`               | `text`          |        | Ghi chú cho nhóm chỉ tiêu.                                         |
| `sampleTypeId`            | `text`          | **FK** | Link ID loại sản phẩm (`library.sampleTypes`).                     |
| `sampleTypeName`          | `text`          |        | Snapshot tên loại sản phẩm áp dụng.                                |
| `feeBeforeTaxAndDiscount` | `numeric(15,2)` |        | Giá tiền trước giảm giá. Default 0.                                |
| `discountRate`            | `numeric(5,2)`  |        | Giảm giá (%). Default 0.                                           |
| `feeBeforeTax`            | `numeric(15,2)` |        | Giá tiền sau giảm giá (Trước thuế). Default 0.                     |
| `taxRate`                 | `numeric(5,2)`  |        | Thuế suất (%). Default 0.                                          |
| `feeAfterTax`             | `numeric(15,2)` |        | Giá tiền sau thuế. Default 0.                                      |
| _Audit Cols_              | ...             |        |                                                                    |

**Indexes:**

-   `idx_paramgroup_sampletype` on `sampleTypeId` (Lọc gói theo ngành hàng).
-   `idx_paramgroup_matrices` (GIN) on `matrixIds` (Tìm gói chứa matrixId cụ thể).

---

### D. SCHEMA LAB (`lab`)

Các bảng vận hành phòng thí nghiệm.

#### 1. Bảng `receipts` (Phiếu nhận mẫu)

| Column Name      | Type        | Key    | Description                                |
| :--------------- | :---------- | :----- | :----------------------------------------- |
| `receiptId`      | `text`      | **PK** |                                            |
| `receiptCode`    | `text`      | **UQ** | Mã phiếu in: `TNM2501-001`.                |
| `clientId`       | `text`      |        | Mã khách hàng                              |
| `client`         | `jsonb`     |        | Snapshot thông tin khách hàng.             |
| `receiptStatus`  | `text`      |        | `Pending`, `Processing`, `Done`, `Cancel`. |
| `receiptDate`    | `timestamp` |        | Ngày nhận mẫu thực tế.                     |
| `deadline`       | `timestamp` |        | Ngày hẹn trả kết quả dự kiến.              |
| `receiptNote`    | `text`      |        | Ghi chú chung cho phiếu nhận.              |
| `orderId`        | `text`      |        | ID đơn hàng.                               |
| `trackingNumber` | `text`      |        | Số theo dõi.                               |
| _Audit Cols_     | ...         |        |                                            |

#### 2. Bảng `samples` (Mẫu phân tích)

| Column Name    | Type    | Key    | Description                                            |
| :------------- | :------ | :----- | :----------------------------------------------------- |
| `sampleId`     | `text`  | **PK** |                                                        |
| `receiptId`    | `text`  | **FK** | Thuộc phiếu nhận nào.                                  |
| `sampleTypeId` | `text`  | **FK** | Loại mẫu (Thực phẩm, Dược liệu...).                    |
| `sampleName`   | `text`  |        | Tên mẫu khách hàng gửi.                                |
| `sampleStatus` | `text`  |        | `Received`, `Analyzing`, `Completed`.                  |
| `exData`       | `jsonb` |        | Lưu snapshot đặc tính mẫu (màu sắc, khối lượng).       |
| `sampleCode`   | `text`  | **UQ** | Mã mẫu thực tế (Format: `<SP><YY><M><DD><III>-<XXX>`). |
| _Audit Cols_   | ...     |        |                                                        |

#### 3. Bảng `analyses` (Chỉ tiêu trên mẫu)

| Column Name      | Type    | Key    | Description                                 |
| :--------------- | :------ | :----- | :------------------------------------------ |
| `analysisId`     | `text`  | **PK** |                                             |
| `sampleId`       | `text`  | **FK** | Thuộc mẫu nào.                              |
| `matrixId`       | `text`  | **FK** | Link tới cấu hình Matrix đã chọn.           |
| `parameterId`    | `text`  |        | Mã chỉ tiêu                                 |
| `parameterName`  | `text`  |        | Snapshot tên chỉ tiêu.                      |
| `protocolCode`   | `text`  |        | Snapshot mã phương pháp.                    |
| `resultValue`    | `text`  |        | Giá trị kết quả thực tế.                    |
| `resultStatus`   | `text`  |        | `Pass`, `Fail`, `NotEvaluated`.             |
| `analysisStatus` | `text`  |        | `Pending`, `Testing`, `Review`, `Approved`. |
| `technicianId`   | `text`  | **FK** | Kỹ thuật viên thực hiện.                    |
| `qaReview`       | `jsonb` |        | `{ reviewerId, at, comment }`.              |
| _Audit Cols_     | ...     |        |                                             |

---

### E. SCHEMA DOCUMENT (`document`)

Liên quan đến file và tài liệu.

#### 1. Bảng `files` (Quản lý File vật lý)

| Column Name  | Type     | Key    | Description                                             |
| :----------- | :------- | :----- | :------------------------------------------------------ |
| `fileId`     | `text`   | **PK** | Custom Text ID.                                         |
| `fileName`   | `text`   |        | Tên file gốc.                                           |
| `mimeType`   | `text`   |        | Loại file (pdf, image/png...).                          |
| `fileSize`   | `bigint` |        | Kích thước (bytes).                                     |
| `uris`       | `text[]` |        | Các đường dẫn truy cập (S3 URL, CDN URL).               |
| `fileTags`   | `text[]` |        | Tag phân loại: `Avatar`, `Report`, `Contract`.          |
| `opaiFile`   | `jsonb`  |        | Metadata nếu file được sync sang OpenAI (Vector Store). |
| _Audit Cols_ | ...      |        |                                                         |

#### 2. Bảng `documents` (Tài liệu nghiệp vụ)

| Column Name   | Type    | Key    | Description                                               |
| :------------ | :------ | :----- | :-------------------------------------------------------- |
| `documentId`  | `text`  | **PK** | Custom Text ID.                                           |
| `fileId`      | `text`  | **FK** | Link tới file vật lý.                                     |
| `refId`       | `text`  |        | ID tham chiếu (receiptId, orderId...).                    |
| `refType`     | `text`  |        | Loại tham chiếu (`Receipt`, `Order`).                     |
| `jsonContent` | `jsonb` |        | Dữ liệu thô dùng để generate file (để re-render nếu cần). |
| _Audit Cols_  | ...     |        |                                                           |

#### 3. Bảng `reports` (Báo cáo Kết quả)

| Column Name  | Type   | Key    | Description                  |
| :----------- | :----- | :----- | :--------------------------- |
| `reportId`   | `text` | **PK** | Custom Text ID.              |
| `receiptId`  | `text` | **FK** |                              |
| `sampleId`   | `text` | **FK** |                              |
| `header`     | `text` |        | HTML Header tùy chỉnh.       |
| `content`    | `text` |        | HTML Content (Bảng kết quả). |
| `footer`     | `text` |        | HTML Footer (Chữ ký).        |
| _Audit Cols_ | ...    |        |                              |

---

### F. SCHEMA SERVICE (`service`)

Liên quan đến các dịch vụ ngoài và hỗ trợ.

#### 1. Bảng `opai` (OpenAI Logs)

| Column Name     | Type    | Key    | Description                                              |
| :-------------- | :------ | :----- | :------------------------------------------------------- |
| `messageOpaiId` | `text`  | **PK** | Custom Text ID.                                          |
| `role`          | `text`  |        | `user`, `assistant`, `system`.                           |
| `content`       | `text`  |        | Nội dung trao đổi.                                       |
| `tokenUsage`    | `jsonb` |        | `{ promptTokens, completionTokens, totalTokens }`.       |
| `contextId`     | `text`  |        | ID ngữ cảnh (VD: ID phiên chat, ID tài liệu đang xử lý). |
| _Audit Cols_    | ...     |        |                                                          |

#### 2. Bảng `shipments` (Giao nhận)

| Column Name      | Type    | Key    | Description                               |
| :--------------- | :------ | :----- | :---------------------------------------- |
| `shipmentId`     | `text`  | **PK** | Custom Text ID.                           |
| `trackingNumber` | `text`  |        | Mã vận đơn.                               |
| `provider`       | `text`  |        | Đơn vị vận chuyển (ViettelPost, Grab...). |
| `status`         | `text`  |        | Trạng thái (Delivered, Returning...).     |
| `shipOrder`      | `jsonb` |        | Snapshot thông tin đơn giao.              |
| _Audit Cols_     | ...     |        |                                           |

#### 3. Các bảng khác (Placeholder)

-   **inventories**: Quản lý hóa chất, vật tư tiêu hao.
-   **suppliers**: Nhà cung cấp vật tư.
-   **subcontractors**: Nhà thầu phụ phân tích mẫu gửi ngoài.

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

```typescript
interface OrderSample {
    sampleId?: string; // Tạo mới thì null, update thì có ID
    userSampleId?: string; // Mã khách hàng tự đặt
    sampleName: string;
    sampleTypeId: string; // Thay cho sampleMatrix dạng text cũ
    analyses: {
        matrixId: string; // Link đến bảng Matrix
        parameterId?: string; // ID chỉ tiêu (để tham chiếu nhanh)
        feeBeforeTax: number; // Giá trị trước thuế
        taxRate: number;
        feeAfterTax: number; // Giá trị sau thuế
    }[];
}
```

### 3. `client` Snapshot

```typescript
interface ClientSnapshot {
    clientId: string;
    clientName: string;
    legalId?: string;
    address: string;
    contact?: {
        name: string;
        phone: string;
        email: string;
    };
}
```

---

## IV. HƯỚNG DẪN TRIỂN KHAI & QUY ĐỊNH (IMPLEMENTATION GUIDELINES)

### 1. Naming Convention

-   **Table Name**: Luôn là số nhiều, `camelCase` (VD: `sampleTypes`, `parameterProtocols`).
-   **Column Name**: `camelCase` (VD: `isDeleted`, `totalAmount`).
-   **Foreign Key**: `tableName` (số ít) + `Id` (VD: `sampleId`, `receiptId`).

### 2. Chiến \ `lược Indexing

-   **Bắt buộc**: Index cho tất cả các cột Foreign Key.
-   **Bắt buộc**: Index cho cột `deletedAt` (vì hầu hết các query đều filter `deletedAt IS NULL`).
-   **Tối ưu**: Sử dụng `GIN Index` cho các cột `jsonb` nếu có nhu cầu search sâu vào object.

### 3. Ràng buộc toàn vẹn (Constraints)

-   Sử dụng `ON DELETE RESTRICT` cho các bảng danh mục (Parameters, Protocols, Matrix) để tránh mất dữ liệu lịch sử khi một danh mục đang được sử dụng trong phiếu phân tích.
-   Check Constraint cho các trường trạng thái (`status`) để đảm bảo đúng tập dữ liệu cho phép.

### 4. Schema Evolution

-   Mọi thay đổi Schema phải được thực hiện qua **Migration Scripts**.
-   Khi thêm cột mới, phải đảm bảo có giá trị Default hoặc cho phép Null để không làm gãy các Tenant đang hoạt động.

---

_Tài liệu này là tài sản trí tuệ của dự án LIMS Multi-Lab SaaS Platform. Mọi thay đổi phải được thông qua Lead Architect._
