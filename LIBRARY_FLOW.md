# LUỒNG HOẠT ĐỘNG MODULE LIBRARY (QUẢN LÝ DANH MỤC THAM CHIẾU)

Module Library quản lý các dữ liệu tham chiếu nền tảng cho hệ thống LIMS, bao gồm: Nền mẫu (Matrix), Chỉ tiêu (Parameter), Quy trình (Protocol) và Loại mẫu (Sample Type).

**Lớp cơ sở**: `BLACK/LIBRARY/1_libraryEntities.js` (`LibraryEntity`)

---

## 1. Tổng quan (`Overview`)

Tất cả các thực thể trong Module Library đều kế thừa các hành vi chung từ `LibraryEntity`:

- **Kiểm tra quyền Đọc (`Read Check`)**: `checkPermit(tableName, "READ")`.
- **Kiểm tra quyền Ghi (`Write Check`)**: `checkPermit(tableName, "WRITE")`.
- **Lọc dữ liệu đầu ra (`Filtered Output`)**:
  - Mọi phương thức `get` đều tự động bọc dữ liệu trả về trong hàm `entity.filterDataResponse`.
  - Đảm bảo tính nhất quán về bảo mật trên toàn hệ thống.

---

## 2. Quản lý Nền mẫu (`Matrix Logic`)

**File nguồn**: `BLACK/LIBRARY/2_Matrices.js`
Đây là thực thể phức tạp nhất, liên kết nhiều bảng dữ liệu khác nhau.

### A. Chi tiết Nền mẫu (`getById`)

Quy trình lấy thông tin cơ bản của một nền mẫu.

1. **Xác thực người dùng (`Authenticate`)**:
  - Gọi `Entity.getEntity(token)` để lấy phiên làm việc.

2. **Kiểm tra quyền (`Permission Check`)**:
  - Gọi `checkPermit("library.matrices", "READ")`.
  - Nếu không có quyền -> Trả về lỗi `403`.

3. **Truy vấn (`Query`)**:
  - `SELECT * FROM library.matrices WHERE "matrixId" = $1`.

4. **Trả về (`Return`)**:
  - Gọi `entity.filterDataResponse(matrixInstance)` để lọc dữ liệu theo phân quyền trước khi gửi về client.

---

### B. Chi tiết Nền mẫu Đầy đủ (`getFullById`)

Đây là phương thức quan trọng, dùng để hiển thị đầy đủ cấu hình của một nền mẫu, bao gồm cả các quy trình và chỉ tiêu liên quan.

1. **Xác thực & Kiểm tra quyền**: Tương tự như `getById`.

2. **Truy vấn Nền mẫu Chính (`Query Matrix Core`)**:
  - `SELECT * FROM library.matrices ...`

3. **Lấy dữ liệu tham chiếu (`Fetch Snapshots`)**:
  - Hệ thống sẽ tối ưu Cache thông qua phương thức `getById` của các class liên quan, hạn chế tối đa việc `JOIN` hay truy vấn vật lý xuống cơ sở dữ liệu.
  - Gọi lần lượt (tùy theo khóa ngoại có sẵn): `Protocol.getById`, `Parameter.getById`, `SampleType.getById`, `ParameterGroup.getById`.

4. **Kết hợp dữ liệu (`Combine`)**:
  - Gộp tất cả các object con (snapshot) vào object cha (Matrix).
  - Tạo thành một cấu trúc dữ liệu phân cấp hoàn chỉnh.

5. **Lọc dữ liệu Đệ quy (`Recursive Filtering`)**:
  - Gọi `entity.filterDataResponse(fullObject)`.
  - **Cơ chế bảo mật hạt nhân (Granular Security)**: Vì object này chứa dữ liệu từ nhiều bảng khác nhau (`matrix`, `protocol`, `parameter`), hàm lọc đệ quy sẽ kiểm tra quyền truy cập cho **TỪNG LOẠI ĐỐI TƯỢNG** một cách độc lập.
  - _Ví dụ_: Nếu user có quyền xem `matrix` nhưng bị chặn xem `protocol`, thông tin protocol trong object trả về sẽ bị ẩn (mask to null), trong khi thông tin matrix vẫn hiển thị bình thường.

---

## 3. Các Danh mục Đơn giản (`Parameters`, `Protocols`, `SampleTypes`)

**File nguồn**:

- `2_Parameters.js`
- `2_Protocols.js`
- `2_SampleType.js`

Các thực thể này tuân theo luồng chuẩn của `LibraryEntity`.

### A. Lấy Danh sách (`getList`)

1. **Kiểm tra quyền (`Check Permit`)**: Xác định quyền `READ` trên bảng tương ứng.

2. **Truy vấn (`Query`)**:
  - `SELECT * FROM ... LIMIT ... OFFSET ...`.
  - Hỗ trợ sắp xếp (`sortBy`) và tìm kiếm cơ bản.

3. **Trả về (`Return`)**:
  - Dữ liệu đã được lọc qua `filterDataResponse`.
  - **Hỗ trợ Lọc nâng cao**:
    - `IS NULL`: Lọc giá trị rỗng.
    - `BETWEEN`: Lọc theo khoảng giá trị (Ngày tháng, Số lượng).
    - Cú pháp: `{ column: "created_at", value: "BETWEEN '2023-01-01' AND '2023-12-31'" }`.

---

### B. Lấy Tùy chọn Lọc (`getFilterOptions`)

Dùng để lấy danh sách các giá trị duy nhất cho dropdown filter trên UI (ví dụ: Danh sách các Loại mẫu có sẵn).

1. **Kiểm tra quyền (`Check Permit`)**: Đảm bảo user có quyền đọc bảng.

2. **Truy vấn (`Query`)**:
  - `SELECT DISTINCT column ...`.
  - Chỉ lấy các giá trị duy nhất (Unique) của cột được yêu cầu.

3. **Trả về (`Return`)**: Danh sách giá trị (mảng string hoặc number).

---

### C. Chi tiết Đầy đủ (`getFullById`)

Các danh mục cơ sở cũng hỗ trợ lấy cấu hình đầy đủ bao gồm mảng các Nền mẫu (`matrices`) liên quan.

1. **Lấy thông tin gốc (`Base Entity`)**: Tận dụng `this.getById({ id, authToken })` để tra cứu object chính từ bộ nhớ Cache.
2. **Truy xuất liên kết (`Fetch Matrices`)**:
  - Truy vấn danh sách `"matrixId"` từ bảng `library.matrices` ánh xạ với `id`.
  - Sau đó Load mảng snapshot các record này từ trong Cache bằng cách lặp qua `Matrix.getById`.
3. **Trả về (`Return`)**: Không cần gọi mask ngoài vì kết quả cuối đã an toàn và chính xác từng record.

---

## 4. Quy trình Tạo mới, Cập nhật & Xóa (`Create, Update & Delete Operations`)

Vì các danh mục hệ thống đa phần kế thừa từ `LibraryEntity` (hoặc core `Entity`), quy trình CRUD có chung một pattern chuẩn.

### A. Quy trình Tạo mới (`Create Flow`)

**Phương thức**: `LibraryEntity.create({ data })`

1. **Kiểm tra Quyền (`Permission Check`)**: `checkPermit(sourceTable, "WRITE")`.
  - Yêu cầu user có quyền sửa đổi (`WRITE` permit).

2. **Khởi tạo `id` và metadata**:
  - Tự động sinh `id` hoặc PKey tương ứng (vd: `parameterId`, `protocolId`, `matrixId`) qua hệ thống generate ID định sẵn.
  - Reset các trường metadata: `createdAt = NOW()`, `createdById = userId`, `modifiedAt = NOW()`, `modifiedById = userId`, `deletedAt = null`.

3. **Thực thi Tạo mới (`Execute Insert`)**:
  - Ghi vào Database (`Valkey.syncInfo`).
  - Đồng bộ Cache.

4. **Trả về**: Một object đã lưu thành công kết hợp với các dữ liệu meta.

---

### B. Quy trình Cập nhật (`Update Flow`)

**Phương thức**: `LibraryEntity.prototype.update({ data })`

1. **Kiểm tra Quyền (`Permission Check`)**: `checkPermit(sourceTable, "WRITE")`.

2. **Thực thi Cập nhật (`Execute Update`)**:
  - Override dữ liệu truyền vào phần `data` của object.
  - Cập nhật thời gian và ID người thao tác (`modifiedAt`, `modifiedById`).
  - Lưu vào DB và Update Cache.

3. **Trả về**: Object sau khi cập nhật.

---

### C. Quy trình Xóa (`Delete Flow`)

**Phương thức**: `LibraryEntity.prototype.delete()`

1. **Kiểm tra Quyền (`Permission Check`)**: `checkPermit(sourceTable, "DELETE")`.

2. **Thực thi Xóa mềm (`Execute Soft Delete`)**:
  - Thực hiện "soft delete" (Xóa mềm), không xóa vật lý bản ghi khỏi hệ cơ sở dữ liệu.
  - Thay đổi trạng thái: `deletedAt = NOW()`.
  - Cập nhật Cache.

3. **Trả về**: Success status hoặc `true`.
