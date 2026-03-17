# LUỒNG HOẠT ĐỘNG MODULE CRM (QUẢN LÝ QUAN HỆ KHÁCH HÀNG)

Tài liệu này mô tả chi tiết các luồng xử lý dữ liệu và logic nghiệp vụ trong Module CRM, bao gồm Quản lý Khách hàng, Đơn hàng và Báo giá.

---

## 1. Quản lý Khách hàng (`Clients`)

**File nguồn**: `BLACK/CRM/2_clients.js`
**Kế thừa từ**: `CrmEntity` (`BLACK/CRM/1_crmEntities.js`)

### A. Lấy danh sách Khách hàng (`getList`)

Quy trình để lấy danh sách khách hàng, hỗ trợ phân trang và lọc dữ liệu.

1.  **Xác thực người dùng (`Authenticate`)**:
    - Gọi `Entity.getEntity(token)` để lấy thông tin phiên làm việc hiện tại.
    - Nếu token không hợp lệ hoặc hết hạn -> Trả về lỗi `401 Unauthorized`.

2.  **Kiểm tra quyền hạn (`Permission Check`)**:
    - Gọi `checkPermit("crm.clients", "READ")`.
    - Kiểm tra xem user có quyền đọc bảng `crm.clients` không.
    - Nếu không có quyền -> Trả về lỗi `403 Forbidden`.

3.  **Xây dựng truy vấn (`Query Construction`)**:
    - Query cơ bản: `SELECT * FROM crm.clients`.
    - Điều kiện lọc:
        - `deletedAt IS NULL`: Chỉ lấy bản ghi chưa bị xóa.
        - Lọc theo các trường cụ thể gửi từ Client (ví dụ: `clientName`, `clientEmail`).
    - Phân trang: `LIMIT $1 OFFSET $2` (tính toán dựa trên `page` và `itemsPerPage`).

4.  **Thực thi truy vấn (`Execution`)**:
    - Chạy query đếm tổng số bản ghi (để tính total pages).
    - Chạy query lấy dữ liệu.

5.  **Lọc dữ liệu đầu ra (`Output Filtering`)**:
    - Mặc định `CrmEntity.getList` sẽ gọi `entity.filterDataResponse` cho từng bản ghi.
    - Loại bỏ các trường mà user không có quyền xem (dựa trên cấu hình `roles`).

---

### B. Chi tiết Khách hàng (`getById`)

1.  **Xác thực & Kiểm tra quyền**: Tương tự như `getList`.

2.  **Kiểm tra Cache (`Valkey`)**:
    - Tạo key cache: `crm:"crm.clients":{clientId}`.
    - Gọi `Valkey.hgetall(key)`.
    - Nếu tìm thấy dữ liệu trong cache -> Trả về ngay lập tức (Hit).

3.  **Truy vấn Database (nếu Cache Miss)**:
    - `SELECT * FROM crm.clients WHERE "clientId" = $1 AND "deletedAt" IS NULL`.
    - Nếu tìm thấy -> Lưu vào Cache (`Valkey.syncInfo`) để dùng cho lần sau.

4.  **Gắn thông tin Audit**:
    - Gọi `attachAuditIdentity`: Lấy thông tin người tạo (`createdBy`) và người sửa (`modifiedBy`) từ `identity.identities` dựa trên ID.

5.  **Lọc dữ liệu đầu ra**:
    - Gọi `entity.filterDataResponse` để bảo mật dữ liệu trước khi trả về API.

---

## 2. Quản lý Đơn hàng (`Orders`)

**File nguồn**: `BLACK/CRM/2_orders.js`

### A. Tạo Đơn hàng mới (`create`)

1.  **Xác thực (`Authenticate`)**: Lấy `entity` từ token.

2.  **Kiểm tra quyền (`Permission Check`)**:
    - `checkPermit("crm.orders", "WRITE")`.
    - Yêu cầu quyền ghi vào bảng `crm.orders`.

3.  **Chuẩn bị dữ liệu (`Data Preparation`)**:
    - Validate các trường bắt buộc: `clientId`, `totalAmount`.
    - Sinh ID mới: `ORD` + `YYMMDD` + Random Suffix (Ví dụ: `ORD231025ABCD`).
    - Gán thông tin audit: `createdById`, `createdAt`, `modifiedById`, `modifiedAt`.

4.  **Lưu vào Database (`Insert`)**:
    - `INSERT INTO crm.orders (...) VALUES (...) RETURNING *`.

5.  **Cập nhật Cache**:
    - Lưu bản ghi mới vào Valkey cache.

6.  **Trả về kết quả**:
    - Trả về object Order vừa tạo (đã qua lọc bảo mật).

---

### B. Lấy danh sách Đơn hàng (`getList`)

Đây là luồng phức tạp nhất với logic phân quyền theo vai trò (RBAC) và tối ưu hiệu năng.

1.  **Xác thực (`Authenticate`)**: Kiểm tra token hợp lệ.

2.  **Phân quyền nâng cao (`RBAC Resolution`)**:
    - Lấy thông tin Role của user:
        - Nếu là **Admin**, **SuperAdmin**, hoặc **Accountant**: Có quyền xem **TẤT CẢ** đơn hàng.
        - Nếu là **Salesperson** (Nhân viên kinh doanh): Chỉ được xem các đơn hàng **do chính mình phụ trách** (`salePersonId` trùng với `identityId` của user).
        - Các vai trò khác: Mặc định bị từ chối truy cập (Fail-closed).

3.  **Xây dựng truy vấn tối ưu (`Optimized Query`)**:
    - **Base Query**: `SELECT * FROM crm.orders AS t`.
    - **Join (cho mục đích Search)**: `LEFT JOIN crm.clients c ON t."clientId" = c."clientId"`.
    - **Điều kiện Lọc (`Where Clause`)**:
        - Luôn có: `t."deletedAt" IS NULL`.
        - Nếu là Salesperson: Thêm `AND t."salePersonId" = $userId`.
        - **Advanced Filters**: Hỗ trợ các toán tử đặc biệt:
            - `"IS NULL"` / `"IS NOT NULL"` (Ví dụ: Lọc đơn chưa thanh toán).
            - `"BETWEEN 'date1' AND 'date2'"` (Ví dụ: Lọc đơn trong khoảng thời gian).
            - _Lưu ý bảo mật_: Chỉ cho phép lọc trên các cột được định nghĩa trong `filterConfig.allowedColumns` (như `status`, `paymentStatus`, `createdAt`...).
    - **Tìm kiếm (`Search`)**:
        - Sử dụng `ILIKE` để tìm kiếm không phân biệt hoa thường.
        - Tìm trên `orderId`, `clientName` (từ bảng join), `salePersonId`.

4.  **Thực thi song song (`Parallel Execution`)**:
    - Chạy 2 query cùng lúc bằng `Promise.all`:
        1.  **Data Query**: Lấy danh sách ID đơn hàng (`SELECT "orderId" ... LIMIT ... OFFSET ...`).
        2.  **Count Query**: Đếm tổng số bản ghi thỏa mãn điều kiện (`SELECT COUNT(*) ...`).
    - _Lợi ích_: Giảm thời gian chờ so với chạy tuần tự.

5.  **Lấy chi tiết (`Hydration`)**:
    - Với danh sách ID lấy được, gọi `getById` (hoặc `getFullById` nếu `option='full'`) cho từng ID.
    - Tận dụng Cache ở bước này để giảm tải cho DB.

6.  **Trả về kết quả**: Object chứa `data` (danh sách) và `pagination` (thông tin phân trang).

---

### C. Xem chi tiết Đơn hàng đầy đủ (`getFullById`)

Dùng khi cần hiển thị chi tiết đơn hàng kèm thông tin khách hàng và báo giá liên quan.

1.  **Query Database**:
    - `SELECT` bảng `crm.orders`.
    - `LEFT JOIN` bảng `crm.clients` để lấy snapshot thông tin khách hàng.
    - `LEFT JOIN` bảng `crm.quotes` để lấy snapshot thông tin báo giá.
    - Kết quả trả về dạng JSONB snapshot (`clientSnapshot`, `quoteSnapshot`).

2.  **Lọc dữ liệu**:
    - Áp dụng `filterDataResponse` cho cả thông tin đơn hàng và các snapshot lồng bên trong.

---

### D. Đồng bộ Đơn hàng với LAB (Cross-System Sync)

Luồng đồng bộ dữ liệu hóa đơn và thanh toán từ CRM sang LIMS.

1.  **Cập nhật Đơn hàng CRM (`update`)**:
    - Khi có thay đổi ở các trường liên quan đến thanh toán và trạng thái (ví dụ: `receiptId`, `totalAmount`, `totalPaid`, `invoiceNumbers`, `paymentStatus`, `orderStatus`).
2.  **Kích hoạt Đồng bộ (`Sync Trigger`)**:
    - Hệ thống kiểm tra xem có trường dữ liệu thanh toán nào thay đổi không (`hasSyncData`).
    - Gọi model `Order` của hệ thống LAB (thông qua `global.get("entities.js")`).
3.  **Xác thực qua Bot (System Account)**:
    - Nếu có cấu hình `botfather@irdop.org`, dùng Google workspace bot session để thực hiện cập nhật.
4.  **Thực thi đồng bộ bên LAB (`execute`)**:
    - Tìm Lab Order tương ứng theo `orderId` và tự động cập nhật lại các trường `syncData` qua hàm `labOrderInstance.update()`.

---

### E. Thống kê Kế toán (`getAccountingSummary`)

Luồng lấy các báo cáo tổng hợp nhanh dùng cho bộ phận kế toán.

1.  **Đơn chờ xuất hóa đơn (`waitingExportInvoiceCount`)**:
    - Đếm các order có trạng thái `Processing` hoặc `Completed` nhưng chưa có số hóa đơn (`invoiceNumbers IS NULL`), và đã thanh toán hoặc nợ (`paymentStatus IN ('Paid', 'Debt')`).
2.  **Đơn có vấn đề thanh toán / lệch tiền (`paymentProblemOrderCount`)**:
    - Đếm các order có ngày yêu cầu (`requestDate IS NOT NULL`) nhưng trạng thái thanh toán khác 'Paid' và 'Debt'.
3.  **Tổng số tiền lệch (`totalPaymentDifferenceAmount`)**:
    - Tính tổng số tiền lệch (`totalAmount - totalPaid`) của các đơn hàng có vấn đề thanh toán.

---

## 3. Quản lý Báo giá (`Quotes`)

**File nguồn**: `BLACK/CRM/2_quotes.js`

### A. Tạo Báo giá (`create`)

1.  **Xác thực & Phân quyền (`crm.quotes`, `WRITE`)**.
2.  **Sinh ID**: `QUO` + `YYMMDD` + Suffix.
3.  **Lưu DB**: `INSERT INTO crm.quotes`.
4.  **Cache**: Cập nhật Valkey.

### B. Lấy danh sách Báo giá (`getList`)

1.  **Xác thực & Phân quyền (`crm.quotes`, `READ`)**.
2.  **Query**: `SELECT * FROM crm.quotes`.
3.  **Lọc**: Tương tự như Client, hỗ trợ phân trang và các filter cơ bản.
