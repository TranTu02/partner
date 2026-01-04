# Quy tắc & Kiến trúc Dự án (Project Rules & Architecture)

## 1. Tổng quan Dự án

-   **Tên dự án**: Partner CRM (Phần mở rộng Partner cho LIMS)
-   **Loại ứng dụng**: Frontend SPA (Single Page Application)
-   **Công nghệ cốt lõi**:
    -   **Nền tảng**: React 18 (Vite), JavaScript (Chuyển đổi từ TypeScript nhưng vẫn giữ Type checking cơ bản qua JSDoc/Check JS nếu cần). _Lưu ý: Tài liệu này được cập nhật để phản ánh việc ưu tiên JavaScript trong triển khai nhanh, tuy nhiên code hiện tại vẫn đang dùng TypeScript cho sự an toàn._
    -   **Styling**: Tailwind CSS (kết hợp CSS Variables cho hệ thống Theme).
    -   **Icons**: Lucide React.
    -   **Đa ngôn ngữ**: react-i18next (Tiếng Việt/Tiếng Anh).
    -   **Quản lý trạng thái**: React Context API.
    -   **Dữ liệu**: Fetch từ API Backend.
    -   **Xác thực**: Session-based authentication với `sessionId` và `authToken`.
    -   **Tiện ích**: date-fns (xử lý ngày tháng), html2pdf.js (xuất PDF), clsx, tailwind-merge (xử lý class CSS).

## 2. Cấu trúc Thư mục (Directory Structure)

```
partner/
├── public/                 # Tài nguyên tĩnh (images, fonts, favicon)
├── src/
│   ├── app/                # Điểm khởi đầu ứng dụng
│   │   ├── App.tsx         # Routing chính và Layout
│   │   └── globals.css     # CSS toàn cục & cấu hình Tailwind directives
│   ├── components/         # Thành phần UI (Tổ chức theo nghiệp vụ)
│   │   ├── client/         # Quản lý khách hàng (AddClient, ClientSection...)
│   │   ├── common/         # Component dùng chung (Pagination, LanguageSwitcher...)
│   │   ├── order/          # Nghiệp vụ Đơn hàng (SampleCard, PrintTemplate...)
│   │   ├── parameter/      # Modal chọn chỉ tiêu/tham số
│   │   ├── quote/          # Nghiệp vụ Báo giá (Pricing, PrintTemplate...)
│   │   ├── statistic/      # Widget thống kê Dashboard (StatCard, ActivityItem)
│   │   ├── Sidebar.tsx     # Menu điều hướng chính bên trái
│   │   └── ThemeToggle.tsx # Nút chuyển đổi giao diện Sáng/Tối/Hệ thống
│   ├── config/             # Các tệp cấu hình
│   │   ├── i18n/           # Cấu hình đa ngôn ngữ
│   │   │   └── locales/    # File dịch (vi.ts, en.ts) -> Phải cập nhật đồng thời
│   │   └── theme/          # Hệ thống giao diện (màu sắc, hook context)
│   ├── contexts/           # React Contexts (AuthContext, ThemeContext)
│   ├── data/               # Constants và dữ liệu tĩnh (constants.ts)
│   ├── api/                # Hàm gọi API (index.ts, client.ts)
│   ├── pages/              # Các trang màn hình chính (Views)
│   │   ├── DashboardPage.tsx
│   │   ├── OrdersListPage.tsx
│   │   ├── QuoteCreationPage.tsx
│   │   └── ...
│   ├── types/              # Định nghĩa Interface TypeScript (Quan trọng để đồng bộ với API)
│   │   ├── client.ts
│   │   ├── order.ts
│   │   ├── quote.ts
│   │   ├── parameter.ts
│   │   └── ...
│   └── main.tsx            # Entry point để render React vào DOM
└── ...
```

## 3. Nguyên tắc Cốt lõi (Core Principles)

### A. Hệ thống Giao diện (Theming System)

-   **Quy tắc Bất di bất dịch**: KHÔNG BAO GIỜ sử dụng mã màu cứng (hardcoded colors) như `bg-white`, `text-black`, `bg-[#123456]`.
-   **Sử dụng Class theo Ngữ nghĩa**: Luôn sử dụng các biến Tailwind được định nghĩa trong `globals.css` thông qua `theme.config.ts`.
    -   Nền: `bg-background`, `bg-card`, `bg-muted`
    -   Chữ: `text-foreground`, `text-muted-foreground`, `text-primary`
    -   Viền: `border-border`, `border-input`
-   **Tham chiếu**: Xem chi tiết trong file `THEME_SYSTEM.md`.

### B. Đa ngôn ngữ (Internationalization - i18n)

-   **Quy tắc**: KHÔNG viết cứng văn bản trong code UI (No hardcoded text).
-   Sử dụng hook `useTranslation()`.
-   Từ khóa (Keys) phải được phân nhóm rõ ràng trong `vi.ts` và `en.ts` (VD: `sidebar.*`, `order.print.*`).
-   Dữ liệu tĩnh từ Server (VD: tên công ty, địa chỉ) nên được lấy từ API hoặc file cấu hình, không hardcode trong file ngôn ngữ nếu nó có thể thay đổi.

### C. Types & Interfaces

-   Định nghĩa Interface dùng chung trong `src/types/`.
-   Nếu Interface chỉ dùng nội bộ cho một component, có thể định nghĩa ngay đầu file component đó.
-   Ưu tiên dùng `interface` hơn `type` để định nghĩa Object.
-   Đảm bảo các type như `Client`, `Order`, `Quote` phải đồng bộ với cấu trúc trả về từ API.
-   **Tham chiếu**: Khi lưu thông tin tham chiếu đơn giản (như người phụ trách), ưu tiên dùng cặp `xxxId` (FK) và `xxxName` (Text) thay vì lưu JSONB object phức tạp, trừ khi cần snapshot lịch sử.

### D. Thiết kế Component

-   **Functional Components**: Sử dụng cú pháp `export function ComponentName() {}`.
-   **Props**: Định nghĩa Interface Props rõ ràng.
-   **Tính Module hóa**: Chia nhỏ các component lớn. Ví dụ `QuoteCreationPage` nên được chia thành `ClientSection`, `SampleCard`, `PricingSummary`... để dễ bảo trì và tái sử dụng.

## 4. Quy trình Git & Công việc (Git & Workflow)

1.  **Kiểm tra**: Luôn đảm bảo `npm run dev` chạy không lỗi trước khi commit.
2.  **Linting**: Sửa các cảnh báo ESLint (biến không sử dụng, sai kiểu dữ liệu...) trước khi đẩy code.
3.  **Đặt tên (Naming Convention)**:
    -   File/Component: PascalCase (VD: `OrdersListPage.tsx`, `SampleCard.tsx`).
    -   Biến/Hàm: camelCase (VD: `handleExport`, `isModalOpen`, `fetchData`).
    -   Hằng số: UPPER_SNAKE_CASE (VD: `DEFAULT_PAGE_SIZE`, `API_BASE_URL`).

## 5. Tiêu chuẩn API (API Standards)

### A. Định dạng Phản hồi (Response Format)

Tất cả các API phải trả về JSON theo cấu trúc chuẩn:

```json
{
  "success": true,        // true/false
  "statusCode": 200,      // HTTP Status Code
  "data": { ... },        // Dữ liệu nghiệp vụ
  "meta": {               // Metadata (dùng cho phân trang) - Tùy chọn
    "page": 1,
    "total": 100
  },
  "error": null           // Chứa object lỗi nếu success = false
}
```

### B. Quy ước URL (URL Convention)

Endpoint phải tuân theo mẫu: `/v1/<Thực thể>/<Hành động>/<Bổ sung>`

-   **Thực thể (Entity)**: `client`, `order`, `sample`, `auth`... (Số ít, chữ thường).
-   **Hành động (Action)**: `get`, `create`, `edit`, `delete`.
-   **Bổ sung**: `list`, `detail` (cho hành động get), hoặc để trống.

Ví dụ:

-   `GET /v1/client/get/list`
-   `POST /v1/client/create`
-   `GET /v1/client/get/detail`

### C. Chữ ký hàm & Triển khai (Function Signatures)

-   Tất cả các hàm gọi API trong `src/api` chỉ nhận một tham số là object cấu hình:
    ```typescript
    export const tenHamApi = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => { ... }
    ```
-   **KHÔNG** truyền tham số rời rạc (như `id`) vào chữ ký hàm. ID phải được đặt trong `query` (nếu GET) hoặc `body` (nếu POST).
-   **Phương thức HTTP**:
    -   `GET`: Lấy dữ liệu (List, Detail).
    -   `POST`: Tạo mới, Cập nhật, Xóa (Mọi thay đổi trạng thái đều dùng POST).
-   **Xác thực (Authentication)**:
    -   Sử dụng `/v1/auth/login` để lấy `token` và `sessionId`.
    -   Gọi `/v1/auth/check-status` khi ứng dụng khởi động để đồng bộ thông tin định danh (`identityId`, `identityName`) và kiểm tra hiệu lực session.
    -   `sessionId` được lưu trong `localStorage` để duy trì phiên làm việc.
