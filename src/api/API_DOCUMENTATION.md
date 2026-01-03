# Tài liệu API (API Documentation)

## Tổng quan

Tài liệu này mô tả chi tiết các endpoint API được sử dụng trong Nền tảng LIMS Multi-Lab SaaS (Ứng dụng Partner / Frontend).

### Định dạng phản hồi chuẩn (Standard Response Format)

Tất cả các phản hồi từ server đều tuân thủ nghiêm ngặt cấu trúc JSON sau:

```json
{
  "success": true,           // Trạng thái thực thi: true (thành công) / false (thất bại)
  "statusCode": 200,         // Mã HTTP Status Code
  "data": { ... },           // Dữ liệu nghiệp vụ (Object hoặc Array)
  "meta": {                  // Metadata (Dành cho phân trang, v.v.) - Tùy chọn
    "page": 1,               // Trang hiện tại
    "itemsPerPage": 10,      // Số lượng item trên mỗi trang
    "total": 100,            // Tổng số item trong database
    "totalPages": 10         // Tổng số trang
  },
  "error": null              // Object chứa thông tin lỗi nếu success = false
}
```

**Cấu trúc lỗi (Error Object):**

```json
{
    "code": "ERR_CODE", // Mã lỗi nội bộ (VD: USER_NOT_FOUND)
    "message": "Chi tiết lỗi", // Thông báo lỗi hiển thị cho user
    "traceId": "req-123" // ID truy vết request
}
```

### Tham số truy vấn chung (Common Query Parameters)

Áp dụng cho các API lấy danh sách (`/get/list`):

| Tham số        | Kiểu dữ liệu | Mặc định | Mô tả chi tiết                                   |
| :------------- | :----------- | :------- | :----------------------------------------------- |
| `page`         | `number`     | `1`      | Số trang cần lấy (Bắt đầu từ 1).                 |
| `itemsPerPage` | `number`     | `10`     | Số lượng bản ghi trên một trang.                 |
| `sortBy`       | `string`     | `null`   | Sắp xếp theo trường (VD: `createdAt:desc`).      |
| `search`       | `string`     | `null`   | Từ khóa tìm kiếm chung (Tên, Mã, SĐT, Email...). |

---

## 1. Xác thực (Authentication)

Module quản lý đăng nhập, đăng xuất và phiên làm việc của người dùng.

#### **POST /v1/auth/login**

-   **Mô tả**: Đăng nhập vào hệ thống.
-   **Đầu vào (Input)**:
    -   Body (JSON):
        ```json
        {
            "username": "admin",
            "password": "password"
        }
        ```
-   **Đầu ra (Output)**:
    ```json
    {
        "success": true,
        "statusCode": 200,
        "data": {
            "token": "eyJhbGciOiJIUzI1...", // JWT Token dùng để xác thực các request sau
            "user": {
                "id": "USR-001",
                "username": "admin",
                "fullName": "Quản trị viên hệ thống",
                "role": "ADMIN" // Các role: ADMIN, SALE, ACCOUNTANT, ...
            }
        }
    }
    ```

#### **POST /v1/auth/logout**

-   **Mô tả**: Đăng xuất khỏi hệ thống, vô hiệu hóa token hiện tại.
-   **Đầu vào**: Không yêu cầu body (Token được gửi qua Header Authorization).
-   **Đầu ra**:
    ```json
    {
        "success": true,
        "data": { "message": "Đăng xuất thành công" }
    }
    ```

---

## 2. Quản lý Khách hàng (Client Management) `(/v1/client)`

Module quản lý thông tin khách hàng, bao gồm thông tin liên hệ và lịch sử giao dịch.

#### **GET /v1/client/get/list**

-   **Mô tả**: Lấy danh sách khách hàng có phân trang và tìm kiếm.
-   **Query Params**: `page=1&itemsPerPage=10&search=Cong Ty A`
-   **Đầu ra**:
    ```json
    {
        "data": [
            {
                "clientId": "CLI-2024-001",
                "clientName": "Công ty TNHH ABC",
                "address": "123 Đường A, Quận B, TP.HCM",
                "taxId": "0101234567",         // Mã số thuế
                "totalOrders": 15,             // Tổng số đơn hàng đã đặt
                "totalRevenue": 150000000      // Tổng doanh thu tích lũy
            }
        ],
        "meta": { "page": 1, "total": 50, ... }
    }
    ```

#### **POST /v1/client/create**

-   **Mô tả**: Tạo mới một khách hàng.
-   **Đầu vào**:
    ```json
    {
        "clientName": "Công ty Mới",
        "address": "789 Đường X",
        "taxId": "0987654321",
        "contacts": [
            { "name": "Nguyễn Văn B", "phone": "0909...", "email": "b@new.com", "position": "Giám đốc" }
        ],
        "invoiceInfo": { ... } // Thông tin xuất hóa đơn (nếu khác thông tin chính)
    }
    ```
-   **Đầu ra**: Object thông tin khách hàng vừa tạo (bao gồm `clientId` sinh ra bởi hệ thống).

#### **GET /v1/client/get/detail**

-   **Mô tả**: Lấy chi tiết đầy đủ của một khách hàng.
-   **Query Params**: `id=CLI-2024-001`
-   **Đầu ra**:
    ```json
    {
        "data": {
            "clientId": "CLI-2024-001",
            // ... toàn bộ thông tin
            "contacts": [...],
            "audit": {
                "createdAt": "...",
                "createdBy": "admin"
            }
        }
    }
    ```

#### **POST /v1/client/edit**

-   **Mô tả**: Cập nhật thông tin khách hàng.
-   **Đầu vào**: Body chứa `id` (bắt buộc) và các trường cần thay đổi.
    ```json
    {
        "id": "CLI-2024-001",
        "clientName": "Tên Công ty Đã Sửa",
        "contacts": [...] // Gửi lại toàn bộ danh sách contact mới
    }
    ```

#### **POST /v1/client/delete**

-   **Mô tả**: Xóa khách hàng (Soft delete - chỉ đánh dấu đã xóa).
-   **Đầu vào**: `{ "id": "CLI-2024-001" }`
-   **Đầu ra**: Thông báo thành công.

---

## 3. Quản lý Đơn hàng (Order Management) `(/v1/order)`

Module xử lý quy trình đơn hàng kiểm nghiệm.

#### **GET /v1/order/get/list**

-   **Mô tả**: Lấy danh sách đơn hàng.
-   **Query Params**: `page=1&status=Pending` (Lọc theo trạng thái: Pending, Processing, Completed...)
-   **Đầu ra**:
    ```json
    {
        "data": [
            {
                "orderId": "ORD-20240101-01",
                "client": { "clientId": "CLI-001", "clientName": "ABC Corp" }, // Snapshot thông tin khách
                "totalAmount": 5000000,
                "orderStatus": "Pending",
                "paymentStatus": "Unpaid",
                "createdAt": "2024-01-01T08:30:00Z"
            }
        ]
    }
    ```

#### **GET /v1/order/get/detail**

-   **Mô tả**: Lấy chi tiết đơn hàng, bao gồm danh sách mẫu và chỉ tiêu phân tích.
-   **Query Params**: `id=ORD-20240101-01`
-   **Đầu ra**:
    ```json
    {
        "data": {
            "orderId": "ORD-20240101-01",
            "samples": [
                {
                    "sampleId": "SMP-001",
                    "sampleName": "Mẫu Nước Thải Đầu Vào",
                    "sampleMatrix": "Nước thải", // Nền mẫu
                    "analyses": [{ "parameterName": "pH", "method": "TCVN...", "price": 50000 }]
                }
            ],
            "pricing": {
                "subtotal": 5000000, // Trước thuế
                "tax": 400000, // Thuế VAT
                "total": 5400000 // Tổng cộng
            }
        }
    }
    ```

#### **POST /v1/order/create**

-   **Mô tả**: Tạo mới đơn hàng.
-   **Đầu vào**:
    ```json
    {
        "clientId": "CLI-001",
        "quoteId": "QT-001", // (Tùy chọn) Nếu tạo từ báo giá
        "samples": [
            {
                "sampleName": "Mẫu A",
                "sampleMatrix": "Đất",
                "analyses": [
                    { "matrixId": "MAT-001", "quantity": 1 } // Chỉ cần gửi matrixId
                ]
            }
        ],
        "note": "Gấp"
    }
    ```

#### **POST /v1/order/edit**

-   **Mô tả**: Cập nhật đơn hàng (trạng thái, ghi chú, hoặc danh sách mẫu nếu còn ở trạng thái cho phép).
-   **Đầu vào**: `{ "id": "ORD-...", "orderStatus": "Processing" }`

---

## 4. Quản lý Báo giá (Quote Management) `(/v1/quote)`

Module tạo và quản lý báo giá gửi khách hàng.

#### **GET /v1/quote/get/list**

-   **Mô tả**: Danh sách báo giá.
-   **Đầu ra**: Tương tự Order List nhưng có trường `quoteStatus` (Draft, Sent, Approved, Expired).

#### **GET /v1/quote/get/detail**

-   **Mô tả**: Chi tiết báo giá.
-   **Query Params**: `id=QT-2024-001`

#### **POST /v1/quote/create**

-   **Mô tả**: Tạo báo giá mới.
-   **Đầu vào**: Tương tự Order Create nhưng không có `orderStatus`.
    ```json
    {
        "clientId": "CLI-001",
        "expirationDate": "2024-02-01", // Ngày hết hạn
        "samples": [...]
    }
    ```

#### **POST /v1/quote/edit** & **POST /v1/quote/delete**

-   **Mô tả**: Cập nhật hoặc xóa báo giá.

---

## 5. Quản lý Chỉ tiêu (Parameter Management) `(/v1/parameter)`

Danh mục các chỉ tiêu phân tích (Analytes).

#### **GET /v1/parameter/get/list**

-   **Mô tả**: Lấy danh sách tên chỉ tiêu.
-   **Đầu ra**:
    ```json
    {
        "data": [
            {
                "parameterId": "PAR-001",
                "parameterName": "pH",
                "displayStyle": { "decimal": 2 } // Cấu hình hiển thị kết quả
            }
        ]
    }
    ```

#### **POST /v1/parameter/create** | **edit** | **delete**

-   **Mô tả**: Các thao tác thêm/sửa/xóa chỉ tiêu cơ bản.

---

## 6. Quản lý Ma trận & Giá (Matrix Management) `(/v1/matrix)`

Bảng cấu hình giá và phương pháp cho từng chỉ tiêu trên từng nền mẫu. Đây là bảng quan trọng nhất để tính giá.

#### **GET /v1/matrix/get/list**

-   **Mô tả**: Lấy bảng giá cấu hình.
-   **Đầu ra**:
    ```json
    {
        "data": [
            {
                "matrixId": "MAT-001",
                "parameterName": "pH", // Join từ bảng Parameters
                "sampleTypeName": "Nước", // Join từ bảng SampleTypes
                "feeBeforeTax": 50000, // Đơn giá
                "protocolCode": "TCVN...", // Phương pháp
                "technicianGroupId": "Group A" // Tổ kỹ thuật phụ trách
            }
        ]
    }
    ```

#### **POST /v1/matrix/create**

-   **Đầu vào**:
    ```json
    {
        "parameterId": "PAR-001",
        "sampleTypeId": "ST-001",
        "protocolId": "PRO-001",
        "feeBeforeTax": 50000,
        "taxRate": 8,
        "lod": "0.1",
        "timeToResult": 5 // Số ngày trả kết quả
    }
    ```

---

## 7. Quản lý Loại mẫu (Sample Type Management) `(/v1/sample-type)`

Danh mục các loại mẫu (Nước, Đất, Thực phẩm...).

#### **GET /v1/sample-type/get/list**

-   **Mô tả**: Danh sách loại mẫu.
-   **Đầu ra**: `[{ "sampleTypeId": "ST-001", "sampleTypeName": "Nước thải" }]`

#### **POST /v1/sample-type/create** | **edit** | **delete**

-   **Mô tả**: Thao tác CRUD cho loại mẫu.
