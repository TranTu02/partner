# Hướng Dẫn Kỹ Thuật: Phân Hệ Nhân Viên (Staff Guide)

**Chức năng:** Hướng dẫn quy trình thao tác nghiệp vụ cốt lõi dành cho bộ phận nhân viên: tra cứu thông tin, tạo vòng lặp Báo giá - Đơn hàng, xuất file chứng từ PDF, tương tác qua Customer Portal.  
**Đối tượng sử dụng:** Bộ phận Kinh doanh (Sales), Chăm sóc Khách hàng (CS), Điều phối viên trạm mẫu.

---

## 1. Tìm Kiếm & Thêm Mới Dữ Liệu Khách Hàng

Module Quản lý tập trung dữ liệu đối tác / khách hàng. Có thể thao tác trực tiếp trên giao diện tạo Báo giá / Đơn hàng.

**1.1. Tìm kiếm và Trích xuất dữ liệu:**

1. Tại khu vực khởi tạo chứng từ, điều hướng đến công cụ Tìm kiếm Khách hàng.
2. Nạp dữ liệu nâng cao bằng cách gõ từ khóa: Tên khách hàng, Mã số thuế, hoặc Số điện thoại.

**1.2. Thêm mới Hồ sơ Định danh:**

1. Kích hoạt chức năng **+ Thêm Khách hàng**.
2. Định nghĩa các trường thông tin lưu trữ bắt buộc:
    - Thông tin cơ sở: Tên doanh nghiệp/cá nhân, Tên pháp lý (Legal Name), Mã định danh/Mã số thuế, Địa chỉ, SĐT, Email.
    - Thông tin Hóa đơn chứng từ (Billing Info).
    - Khai báo thông tin Người Liên Hệ (Contact Person).
3. Nhấn **Lưu (Save)** để hệ thống ghi nhớ vào Database. Dữ liệu sẽ lập tức được tự động điền vào nghiệp vụ chứng từ hiện tại.

---

## 2. Quy Trình Khởi Tạo Báo Giá (Quote)

Module thiết lập cấu trúc hồ sơ dịch vụ phân tích gửi cho đối tác.

1. Trên Menu chính chọn **Báo Giá** > Chọn hành động **Tạo Báo Giá**.
2. Thiết lập đối tượng: Gọi thông tin dữ liệu Khách hàng / Người liên hệ có sẵn trên hệ thống.
3. Khai báo Danh mục Mẫu (Samples):
    - Kích hoạt **+ Thêm mẫu** > Gán Tên mẫu, Khai báo Nền mẫu / Loại mẫu.
    - Kê khai cấu hình chỉ tiêu: Nhấn **+ Thêm chỉ tiêu**. Tìm chỉ tiêu cần phân tích. Hệ thống tự động truy xuất và ánh xạ **Phương pháp (Protocol)** kèm **Đơn giá gốc** từ bộ cơ sở dữ liệu Parameters.
4. Điều chỉnh Cơ cấu Giá định kỳ:
    - Có thể thay đổi Đơn giá cục bộ cục bộ hoặc áp dụng **Chiết khấu (Discount)** theo cấu hình dòng hoặc tổng phụ lục.
    - Kê khai các loại phí dịch vụ phát sinh thông qua trường tùy chọn **Phụ phí (Other Items)**.
5. Xác thực phần **Tổng tiền cuối** và tiến hành **Lưu Báo Giá**. Hệ thống sẽ gắn cho văn bản một chuỗi phân định trạng thái và mã tra cứu chuyên dụng.

---

## 3. Quy Trình Khởi Tạo Đơn Hàng (Order / Yêu cầu phân tích)

Bước chốt chặn kỹ thuật và phân phối thông tin điều phối dịch vụ xuống tới bộ phận xử lý mẫu Lab.

1. Đi đến Module **Đơn Hàng** > Click lệnh **Tạo Đơn Hàng**.
2. Tái sử dụng dữ liệu (Auto-Load Procedure):
    - Tại trường thông tin trích xuất Khách hàng, gọi hàm **Tải báo giá (Load Quote)**.
    - Chọn bản ghi Báo giá tương ứng đã được chốt với KH. Công cụ hỗ trợ sao lưu toàn bộ thông số kỹ thuật (Danh mục định danh Mẫu, Các nhóm Chỉ Tiêu Phân Tích, Lịch trình Chiết Khấu / Phụ Phí) từ trạng thái Dự Thảo về Trạng Thái Đơn Báo Dịch Vụ Phân Tích mà không yêu cầu thao tác trích xuất lại.
3. Khởi tạo trực tiếp không dựa trên Báo giá có sẵn (Manual Start): Thực thi trình tự gán mảng Khách Hàng -> Xác định Thông Tin Mẫu - Gán Chỉ Tiêu hoàn toàn thủ công.
4. Hệ thống cấp phát nội bộ **Mã Đơn Định Danh (Order ID)** hỗ trợ tìm kiếm chéo sau khi thao tác lệnh **Lưu Đơn Hàng**.

---

## 4. In Báo Giá / In Phiếu Yêu Cầu (Export PDF)

Tiện ích tự động tạo bản mộc số (Văn bản điện tử lưu động) theo format A4 chuẩn ISO.

1. Tại màn hình của hồ sơ chứng từ (Báo giá hoặc Đơn Hàng) ở trạng thái **Xem chi tiết / Chỉnh sửa**.
2. Ở tab tính năng nâng cao (Góc phải màn hình), kích hoạt chuỗi lệnh biểu tượng 🖨️ / ⬇️ **In Báo Giá** hoặc **In Phiếu Yêu Cầu**.
3. View port tự động thiết lập dạng **Print Preview**. Mô phỏng thông tin đầy đủ về Tên mẫu, Định tính Nền mẫu, Phân mục các phương pháp, Đơn giá cấu thành, và Giá trị Chiết khấu.
4. Trích xuất văn bản:
    - Trigger chức năng **PDF** lưu tệp (Tạo bản hard-copy phục vụ chuyển tiếp File độc lập).
    - Kích hoạt **In (Print)** kết nối với Printer Local thực thi sao chép văn bản cứng hành chính.

---

## 5. Xuất Biên Nhận Gửi Mẫu & Sinh Link Tra Cứu (Customer Follow-up)

Quy trình trao đôi dữ liệu giữa bộ phận phân phối & Khách hàng.

1. **Phiếu gửi/nhận mẫu (Receipt Exporting)**:
    - Sau phiên đánh giá và kiểm soát mẫu được gán vào Lab, phân hệ có hỗ trợ một node tạo Biên nhận mẫu hiện hữu. Vận hành tương tự quy trình in Đơn Hàng, tuy nhiên phiếu trích xuất sẽ gồm cấu trúc Số Receipt và Tình Trạng Vật Lý Của Mẫu khi giao nhận thực tế.
2. **Quyền tra cứu (Public Link tracking)**:
    - Giao thức cho phép truy tìm các trạng thái đơn hàng và báo giá duyệt thông qua Cổng Khách hàng.
    - Trích xuất Public Link hoặc chuyển mã URL. Khi thao tác với chức năng Customer Portal, bản thân đối tác có quyền truy xuất trực tiếp trạng thái tiến trình mẫu và xuất hóa đơn PDF thủ công. Điều này rảnh tay cho bộ phận Admin.

---

## 6. Tra Cứu Danh Mục Chỉ Tiêu Phân Tích (Parameters List)

Module trung tâm về tham chiếu các cấu hình kỹ thuật phục vụ khai báo chuyên môn.

1. Tại vùng điều khiển Menu, truy xuất **Hệ thống > Chỉ tiêu (Parameters)**.
2. Công cụ tìm kiếm định tuyến chuẩn bằng từ khóa truy vấn tên thông số, hoặc Mã phương pháp kỹ thuật (Protocol Code).
3. Bảng phản hồi trả rạch ròi các cấu hình về: Nhóm chỉ tiêu phân loại hóa/lý, Giá áp dụng chung, Quy định mức thuế, kèm theo đó là **Tình trạng chuẩn công nhận năng lực phòng Lab (như ISO/IEC 17025, VILAS...)**.
4. Sử dụng công cụ này làm kênh check chéo phản biện yêu cầu của đối tác và nắm báo giá nhanh phục vụ Sales.
