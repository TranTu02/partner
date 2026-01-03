# Tài liệu Phân tích Nghiệp vụ & Đặc tả Tính năng (BA)

## 1. Tác nhân & Vai trò (Actors & Roles)

Hệ thống phân quyền dựa trên vai trò của người dùng:

-   **Admin (Quản trị viên)**: Có toàn quyền truy cập hệ thống, quản lý cấu hình, người dùng và danh mục dùng chung.
-   **Client (Khách hàng)**: Có thể xem lịch sử đơn hàng, báo giá của chính mình và tạo yêu cầu kiểm nghiệm mới.
-   **Collaborator (Cộng tác viên - CTV)**:
    -   Quản lý danh sách khách hàng riêng (Private scope).
    -   Tạo và theo dõi đơn hàng cho các khách hàng được phân công.
-   **Sales (Nhân viên Kinh doanh)**: Quản lý báo giá, đơn hàng và danh sách khách hàng chung (Public scope).
-   **Accountant (Kế toán)**: Xem thông tin công nợ, quản lý trạng thái thanh toán của các đơn hàng (Chưa thanh toán/Đã thanh toán).
-   **CustomerService (Chăm sóc khách hàng)**: Xem toàn bộ khách hàng, hỗ trợ giải đáp thắc mắc (Ticket).
-   **Guest (Khách vãng lai)**: Quyền hạn chế, chỉ xem được danh mục chỉ tiêu công khai (Public catalog).

## 2. Các Module Chính (Core Modules)

### A. Bảng điều khiển (`DashboardPage`)

-   **Tổng quan**: Cung cấp cái nhìn nhanh về tình hình hoạt động kinh doanh.
-   **Chỉ số chính (KPIs)**: Tổng số yêu cầu, Đơn hàng hoàn thành, Đơn hàng đang xử lý, Doanh thu ước tính.
-   **Biểu đồ & Hiển thị**:
    -   _StatCards_: Thẻ số liệu với chỉ báo xu hướng tăng/giảm.
    -   _ActivityItem_: Nhật ký hoạt động gần đây (VD: "Đơn hàng #123 vừa được tạo").
    -   _ParameterBar_: Biểu đồ thể hiện các chỉ tiêu được yêu cầu nhiều nhất.
-   **Tính năng**: Bộ lọc thời gian (Ngày/Tuần/Tháng) để xem dữ liệu lịch sử.

### B. Quản lý Đơn hàng (`OrdersListPage`, `OrderEditor`)

-   **Quy trình nghiệp vụ**: Tạo Đơn hàng mới -> Chọn Khách hàng -> Thêm Mẫu -> Chọn Chỉ tiêu phân tích (trên từng mẫu) -> Lưu/In phiếu.
-   **Cấu trúc dữ liệu**: Đơn hàng (Order) chứa nhiều Mẫu (Sample), mỗi Mẫu chứa nhiều Chỉ tiêu (Analysis) lấy từ Ma trận giá (Matrix).
-   **Tính năng chi tiết**:
    -   **Form động**: Cho phép thêm nhiều mẫu cùng lúc, nhân bản mẫu (Duplicate) để nhập liệu nhanh.
    -   **Chọn chỉ tiêu**: Modal tìm kiếm chỉ tiêu (`AnalysisModalNew`) hỗ trợ chọn đơn lẻ hoặc chọn theo gói (nếu có).
    -   **Tính giá**: Hệ thống tự động tính Thành tiền = Đơn giá x Số lượng + Thuế (VAT) - Chiết khấu.
    -   **In ấn**: Tạo file PDF "Phiếu yêu cầu thử nghiệm" khổ A4, có đầy đủ thông tin để khách hàng ký xác nhận (`OrderPrintPreviewModal`).
-   **Luồng trạng thái**: Chờ xử lý (Pending) -> Đã duyệt (Approved) -> Đang kiểm nghiệm (In Progress) -> Hoàn thành (Completed).

### C. Quản lý Báo giá (`QuotesListPage`, `QuoteEditor`)

-   **Quy trình**: Tương tự như Đơn hàng nhưng dùng cho giai đoạn trước bán hàng (chào giá).
-   **Tính năng**:
    -   Tạo và chỉnh sửa Báo giá.
    -   **Xuất PDF**: Tạo file Báo giá chuyên nghiệp gửi cho khách hàng (`QuotePrintPreviewModal`).
    -   **Chuyển đổi**: (Tính năng sắp tới) Chuyển đổi trực tiếp từ Báo giá sang Đơn hàng khi khách đồng ý.
    -   **Chiết khấu/Hoa hồng**: Hỗ trợ nhập % chiết khấu thương mại hoặc hoa hồng môi giới.

### D. Quản lý Khách hàng (`ClientsPage`)

-   **Phân loại khách hàng**:
    -   _Public (Công khai)_: Khách hàng thuộc sở hữu chung của công ty, Sale/CSKH đều thấy.
    -   _Private (Riêng tư)_: Khách hàng do CTV tự kiếm, chỉ CTV đó và Admin thấy.
-   **Thông tin lưu trữ**: Tên doanh nghiệp/Cá nhân, Mã số thuế, Địa chỉ, Danh sách người liên hệ, Thông tin xuất hóa đơn.
-   **Thống kê**: Hiển thị tổng doanh số và số lượng đơn hàng tích lũy ngay trên danh sách.

### E. Danh mục Chỉ tiêu & Giá (`ParametersPage`)

-   **Dữ liệu**: Danh sách các chỉ tiêu kiểm nghiệm (VD: pH, COD, BOD5, Salmonella...).
-   **Ma trận cấu hình (Matrix)**: Một chỉ tiêu có thể có nhiều mức giá và phương pháp khác nhau tùy thuộc vào Nền mẫu (Nước, Đất, Thực phẩm).
-   **Thông tin hiển thị**: Phương pháp thử (Protocol), Đơn giá chưa thuế, Lĩnh vực (Hóa/Lý/Vi sinh), Thời gian trả kết quả (TAT).

### F. Kế toán & Công nợ (`AccountingPage`)

-   **Mục tiêu**: Theo dõi dòng tiền và tình trạng thanh toán của các đơn hàng.
-   **Trang thái thanh toán**: Chưa thanh toán (Unpaid), Thanh toán 1 phần (Partially Paid), Đã thanh toán (Paid).
-   **Tính năng**: Xem danh sách đơn hàng cần thu tiền, lịch sử thanh toán.

## 3. Thực thể Dữ liệu (Data Entities)

### Tổ chức (Organization)

Thông tin cấu hình chung của phòng Lab:

-   `organizationName`: Tên phòng thí nghiệm.
-   `address`, `taxId`, `email`, `phone`, `website`.
-   **Chi nhánh (Branches)**: Danh sách các địa điểm nhận mẫu.

### Định danh Đơn/Phiếu

-   Hệ thống sử dụng **Custom Text ID** để dễ đọc:
    -   Đơn hàng: `ORD-YYYYMMDD-XX` (VD: `ORD-20240101-01`).
    -   Báo giá: `QT-YYYYMMDD-XX` (VD: `QT-20240101-01`).
    -   Khách hàng: `CLI-XXXX` (VD: `CLI-0001`).

## 4. Quy trình Workflows Quan trọng

### Quy trình In/Xuất file (Printing/Exporting)

1.  Người dùng bấm nút "In" hoặc "Xuất PDF".
2.  Hệ thống thu thập dữ liệu hiện tại của Đơn hàng/Báo giá.
3.  Mở **Preview Modal** chứa trình soạn thảo WYSIWYG (TinyMCE) hiển thị nội dung mẫu in.
4.  Template HTML được render với dữ liệu thật (Binding data).
5.  Sử dụng thư viện `html2pdf.js` để chuyển đổi nội dung HTML đã render thành file PDF và tải xuống máy người dùng.
6.  Đảm bảo lề trang (margin) chuẩn 1cm và có Header/Footer (Số trang) tự động.

## 5. Tích hợp API (API Integration)

### A. Tiêu chuẩn

-   **Mô hình URL**: `/v1/<Thực thể>/<Hành động>/<Bổ sung>`.
    -   VD: `/v1/client/get/list`, `/v1/order/create`.
-   **Định dạng**: JSON chuẩn có `success`, `data`, `meta`.
-   **Chữ ký hàm (Frontend)**: Luôn nhận vào một object tham số duy nhất: `({ headers, body, query })`.

### B. Ánh xạ Thực thể Chính

-   **Xác thực**: `/v1/auth/login`, `/v1/auth/logout`.
-   **Khách hàng**:
    -   Lấy danh sách: `GET /v1/client/get/list`
    -   Chi tiết: `GET /v1/client/get/detail` (ID trong query)
    -   Thêm/Sửa/Xóa: `POST /v1/client/create`, `edit`, `delete`.
-   **Đơn hàng**:
    -   Lấy danh sách: `GET /v1/order/get/list`
    -   Chi tiết: `GET /v1/order/get/detail`
    -   Thêm/Sửa/Xóa: `POST /v1/order/create`, `edit`, `delete`.
-   **Mẫu & Chỉ tiêu**: Sử dụng các API `/v1/matrix/...` để lấy thông tin cấu hình và giá.

### C. Quy tắc triển khai

-   **Không dùng Path Params trong hàm API**: Tránh định nghĩa hàm dạng `getClient(id)`. Phải dùng `getClient({ query: { id } })`.
-   **Phương thức HTTP**:
    -   `GET`: Chỉ dùng để lấy dữ liệu (List/Detail).
    -   `POST`: Dùng cho mọi thay đổi trạng thái dữ liệu (Create, Edit, Delete) để đảm bảo an toàn và nhất quán.

## 6. Ràng buộc UX/UI (UX/UI Constraints)

-   **Popups/Modals**: Phải có chiều rộng tối thiểu (`min-w`) để tránh vỡ giao diện khi chưa có dữ liệu.
-   **Thông báo (Notifications)**:
    -   Dùng Toast message góc màn hình.
    -   Thời gian hiển thị: **1 giây** (đủ để đọc nhưng không che khuất thao tác).
    -   Z-index: Phải cao nhất (Max) để nổi trên các modal khác.
-   **Phản hồi người dùng**:
    -   Nút bấm phải có trạng thái Loading (disabled + spinner) khi đang gọi API.
    -   Các hành động nguy hiểm (Xóa) phải có hộp thoại xác nhận (Confirm Dialog).
