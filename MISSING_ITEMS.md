# 📒 CRM & AUTH API v2 Migration - Gap Analysis

Tài liệu này ghi lại các điểm khác biệt giữa API v2 Documentation, DATABASE.md và Code hiện tại.

---

## 🔴 THIẾU TRONG API v2 DOCUMENTATION

### 1. Endpoints đã xác nhận v2

| Endpoint               | Chức năng      | Trạng thái    | Ghi chú                                     |
| :--------------------- | :------------- | :------------ | :------------------------------------------ |
| `POST /v2/auth/login`  | Đăng nhập      | ✅ Đã migrate | Response trả về `identity` object & `token` |
| `POST /v2/auth/logout` | Đăng xuất      | ✅ Đã migrate | Client chỉ cần xóa token                    |
| `GET /v2/auth/verify`  | Xác minh token | ✅ Đã migrate | Thay thế cho `check-status` (v1)            |

### 2. Endpoints chưa có tài liệu v2 / Cần confirm

| Endpoint cũ (v1)               | Chức năng                     | Trạng thái    | Ghi chú                        |
| :----------------------------- | :---------------------------- | :------------ | :----------------------------- |
| `POST /v2/orders/generate-uri` | Tạo public link phiếu gửi mẫu | ✅ Đã migrate | Dùng bởi SampleRequestFormPage |
| `POST /v2/orders/check-uri`    | Validate public URI           | ✅ Đã migrate | Dùng bởi guest form access     |
| `POST /v1/client/delete`       | Xóa khách hàng                | ❓ Chưa rõ    | Không có trong API v2 docs     |
| `POST /v1/order/delete`        | Xóa đơn hàng                  | ❓ Chưa rõ    | Không có trong API v2 docs     |
| `POST /v1/quote/delete`        | Xóa báo giá                   | ❓ Chưa rõ    | Không có trong API v2 docs     |

**→ Cần xác nhận với backend team:** các endpoint DELETE có được giữ ở v2 không?

### 3. Modules chưa được tài liệu hóa sang v2

Hiện tại chỉ có module **CRM** và **AUTH** có tài liệu v2. Các module sau vẫn đang dùng endpoint v1:

- **Parameter Groups**: `GET /v1/parameter-group/get/list`
- **Utils**: `POST /v2/convert-html-to-pdf/...` (✅ Đã migrate)

---

## 🛠️ STATUS CỦA CÁC MODULE (MIGRATION PROGRESS)

| Module           | v1 path                   | v2 path                | Trạng thái    |
| :--------------- | :------------------------ | :--------------------- | :------------ |
| Authentication   | `/v1/auth/...`            | `/v2/auth/...`         | ✅ Đã migrate |
| Clients          | `/v1/client/...`          | `/v2/clients/...`      | ✅ Đã migrate |
| Orders           | `/v1/order/...`           | `/v2/orders/...`       | ✅ Đã migrate |
| Quotes           | `/v1/quote/...`           | `/v2/quotes/...`       | ✅ Đã migrate |
| Parameters       | `/v1/parameter/...`       | `/v2/parameters/...`   | ✅ Đã migrate |
| Protocols        | `/v1/protocol/...`        | `/v2/protocols/...`    | ✅ Đã migrate |
| Matrices         | `/v1/matrix/...`          | `/v2/matrices/...`     | ✅ Đã migrate |
| Sample Types     | `/v1/sample-type/...`     | `/v2/sample-types/...` | ✅ Đã migrate |
| Parameter Groups | `/v1/parameter-group/...` | Chưa có                | ⚠️ Giữ v1     |

---

## 🧩 TYPE MISMATCHES & FIXES

### 1. Trạng thái (Statuses)

Đã fix các Enum trong code để khớp với DATABASE.md và API v2 (lowercase):

- **QuoteStatus**: Hỗ trợ `"draft"`, `"sent"`, `"accepted"`, `"rejected"`, `"expired"`, `"ordered"`.
- **PaymentStatus**: Trả về `"Unpaid"`, `"Partial"`, `"Paid"`, `"Debt"`.
- **AnalysisStatus**: Đã cập nhật 10 trạng thái từ `Pending` đến `Complained`.

### 2. Dữ liệu v2 trả về

- API v2 các endpoint `get/detail` trả về object trực tiếp (không wrap trong `data`).
- Các endpoint `get/list` trả về `{ data: [], pagination: {} }`.
- **Fix**: Đã thêm `adaptV2Response` trong `src/api/index.ts` để normalize về format nội bộ.

---

## 📋 TODO LIST THEO ĐỘ ƯU TIÊN

### Priority P0 (Urgent):

- [ ] Xác nhận endpoint DELETE v2 với Backend.
- [ ] Test luồng Login/Verify mới trên môi trường dev thực tế.

### Priority P1 (Next steps):

- [ ] Tạo file type riêng cho `IncomingRequest` (db table `crm.incomingRequests`).
- [ ] Tạo file type riêng cho `Receipt` (db table `crm.receipts`).
- [ ] Bổ sung `IdentityGroup` type vào `auth.ts`.

### Priority P2 (Maintenance):

- [ ] Xóa code check `sessionId` trong AuthContext (v2 dùng Bearer token).
- [ ] Refactor `QuotesListPage.tsx` để xử lý `totalAmount` là string/number sạch sẽ hơn.
