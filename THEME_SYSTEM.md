# Theme System Documentation

## Tổng quan

Hệ thống theme của ứng dụng được thiết kế để hỗ trợ 3 modes: **Light**, **Dark**, và **System** (theo OS preference). Tất cả các màu sắc được quản lý tập trung thông qua CSS variables và Tailwind CSS.

## Cấu trúc

```
src/
├── config/
│   └── theme/
│       ├── ThemeContext.tsx    # Theme Provider và hooks
│       ├── theme.config.ts     # Cấu hình màu sắc cho 3 modes
│       └── index.ts            # Exports
├── app/
│   └── globals.css             # CSS variables definitions
└── tailwind.config.js          # Tailwind configuration
```

## Cấu hình Theme

### 1. Theme Modes

Ứng dụng hỗ trợ 3 modes:

-   **`light`**: Chế độ sáng với bảng màu tùy chỉnh
-   **`dark`**: Chế độ tối với bảng màu tùy chỉnh
-   **`system`**: Tự động theo OS preference

### 2. Color Palette

#### Light Mode

```typescript
{
  primary: '#0058a3',      // Màu chủ đạo
  secondary: '#3366CC',    // Màu phụ
  tertiary: '#89CFF0',     // Màu thứ ba
  background: '#f5f5f5',   // Nền chính
  foreground: 'rgba(0, 0, 0, 0.85)', // Chữ chính
  card: '#ffffff',         // Nền card
  border: '#d9d9d9',       // Viền
  muted: '#ececf0',        // Màu mờ
  mutedForeground: 'rgba(0, 0, 0, 0.45)', // Chữ mờ
  success: '#52c41a',      // Thành công
  warning: '#faad14',      // Cảnh báo
  destructive: '#d4183d',  // Nguy hiểm
}
```

#### Dark Mode

```typescript
{
  primary: '#1890ff',
  secondary: '#3366CC',
  tertiary: '#89CFF0',
  background: '#141414',
  foreground: '#ffffff',
  card: '#1f1f1f',
  border: '#303030',
  muted: '#434343',
  mutedForeground: 'rgba(255, 255, 255, 0.45)',
  success: '#49aa19',
  warning: '#d89614',
  destructive: '#d4183d',
}
```

#### System Mode

Sử dụng palette của Light Mode nhưng tự động chuyển sang Dark Mode khi OS preference là dark.

## Sử dụng

### 1. Setup Provider

Trong `main.tsx`:

```tsx
import { ThemeProvider } from "./config/theme";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider storageKey="vite-ui-theme">
            <App />
        </ThemeProvider>
    </StrictMode>,
);
```

### 2. Sử dụng Theme Hook

```tsx
import { useTheme } from "@/config/theme";

function MyComponent() {
    const { theme, setTheme, actualTheme } = useTheme();

    // theme: "light" | "dark" | "system" (user choice)
    // actualTheme: "light" | "dark" (resolved theme)

    return <button onClick={() => setTheme("dark")}>Switch to Dark Mode</button>;
}
```

### 3. Sử dụng Tailwind Classes

**✅ ĐÚNG - Sử dụng theme variables:**

```tsx
<div className="bg-card text-foreground border border-border">
    <h1 className="text-primary">Title</h1>
    <p className="text-muted-foreground">Description</p>
    <button className="bg-primary text-primary-foreground hover:bg-primary/90">Click me</button>
</div>
```

**❌ SAI - Hardcoded colors:**

```tsx
<div className="bg-white text-black border border-gray-300">
    <h1 className="text-blue-600">Title</h1>
    <p className="text-gray-500">Description</p>
    <button className="bg-[#1890FF] text-white hover:bg-[#096dd9]">Click me</button>
</div>
```

## Tailwind Utility Classes

### Background Colors

-   `bg-background` - Nền chính
-   `bg-card` - Nền card/container
-   `bg-muted` - Nền mờ
-   `bg-primary` - Màu chủ đạo
-   `bg-secondary` - Màu phụ
-   `bg-tertiary` - Màu thứ ba
-   `bg-success` - Thành công
-   `bg-warning` - Cảnh báo
-   `bg-destructive` - Nguy hiểm

### Text Colors

-   `text-foreground` - Chữ chính
-   `text-muted-foreground` - Chữ mờ
-   `text-primary` - Chữ màu chủ đạo
-   `text-primary-foreground` - Chữ trên nền primary
-   `text-success` - Chữ thành công
-   `text-warning` - Chữ cảnh báo
-   `text-destructive` - Chữ nguy hiểm

### Border Colors

-   `border-border` - Viền chuẩn
-   `border-primary` - Viền màu chủ đạo
-   `border-destructive` - Viền nguy hiểm

### Opacity Variants

Sử dụng `/` để thêm opacity:

-   `bg-primary/10` - Primary với 10% opacity
-   `bg-muted/50` - Muted với 50% opacity
-   `hover:bg-primary/90` - Primary với 90% opacity khi hover

## Theme Toggle Component

Ứng dụng đã có sẵn `ThemeToggle` component:

```tsx
import { ThemeToggle } from "@/components/ThemeToggle";

function Header() {
    return (
        <div>
            <ThemeToggle />
        </div>
    );
}
```

Component này hiển thị 3 nút: Sun (Light), Moon (Dark), Laptop (System).

## Best Practices

### 1. Anti-Hardcoding Rule

**TUYỆT ĐỐI KHÔNG** hardcode màu sắc trong code:

```tsx
// ❌ KHÔNG BAO GIỜ LÀM NHƯ VẦY
<div style={{ color: '#1890FF' }}>Text</div>
<div className="bg-[#F0F2F5]">Content</div>

// ✅ LUÔN SỬ DỤNG THEME VARIABLES
<div className="text-primary">Text</div>
<div className="bg-muted/20">Content</div>
```

### 2. Semantic Colors

Sử dụng tên màu theo ý nghĩa, không theo màu sắc:

```tsx
// ❌ SAI
<button className="bg-blue-500">Submit</button>
<div className="text-red-600">Error</div>

// ✅ ĐÚNG
<button className="bg-primary">Submit</button>
<div className="text-destructive">Error</div>
```

### 3. Status Colors

Sử dụng đúng màu cho từng trạng thái:

```tsx
// Success state
<span className="bg-success/10 text-success">Completed</span>

// Warning state
<span className="bg-warning/10 text-warning">Pending</span>

// Error/Destructive state
<span className="bg-destructive/10 text-destructive">Failed</span>

// Info/Primary state
<span className="bg-primary/10 text-primary">In Progress</span>
```

### 4. Hover States

Sử dụng opacity variants cho hover:

```tsx
<button className="bg-primary hover:bg-primary/90">
  Hover me
</button>

<div className="bg-card hover:bg-muted/50">
  Hover card
</div>
```

## Thêm màu mới

### 1. Cập nhật `globals.css`

```css
:root {
    --new-color: #hexcode;
}

.dark {
    --new-color: #hexcode-dark;
}
```

### 2. Cập nhật `tailwind.config.js`

```javascript
colors: {
  newColor: {
    DEFAULT: 'hsl(var(--new-color))',
    foreground: 'hsl(var(--new-color-foreground))',
  },
}
```

### 3. Cập nhật `theme.config.ts`

```typescript
export const LIGHT_THEME = {
    // ... existing colors
    newColor: "#hexcode",
};

export const DARK_THEME = {
    // ... existing colors
    newColor: "#hexcode-dark",
};
```

## Troubleshooting

### Màu không thay đổi khi switch theme

-   Kiểm tra xem có sử dụng hardcoded colors không
-   Đảm bảo CSS variables được định nghĩa trong `globals.css`
-   Xóa cache và restart dev server

### Tailwind class không hoạt động

-   Kiểm tra `tailwind.config.js` đã định nghĩa color chưa
-   Đảm bảo class name đúng format: `bg-primary`, `text-foreground`
-   Restart dev server sau khi thay đổi config

### System theme không tự động chuyển

-   Kiểm tra browser có hỗ trợ `prefers-color-scheme` không
-   Thử chuyển OS theme để test
-   Kiểm tra `ThemeContext` đã được wrap đúng chưa

## Migration Guide

Để migrate component cũ sang theme system mới:

1. **Tìm tất cả hardcoded colors:**

    ```tsx
    // Search for:
    - bg-[#...]
    - text-[#...]
    - style={{ color: '...' }}
    - className="bg-white"
    - className="text-gray-500"
    ```

2. **Thay thế bằng theme variables:**

    ```tsx
    bg-white → bg-card
    bg-gray-50 → bg-muted/50
    text-gray-500 → text-muted-foreground
    text-black → text-foreground
    border-gray-300 → border-border
    bg-blue-500 → bg-primary
    text-blue-600 → text-primary
    ```

3. **Remove inline styles:**
    ```tsx
    style={{ fontSize: '14px' }} → className="text-sm"
    style={{ fontWeight: 600 }} → className="font-semibold"
    style={{ color: '#1890FF' }} → className="text-primary"
    ```

## Ví dụ hoàn chỉnh

```tsx
import { useTheme } from "@/config/theme";

function ExampleComponent() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border px-6 py-4">
                <h1 className="text-2xl font-bold text-foreground">My Application</h1>
            </header>

            {/* Content */}
            <main className="p-6">
                {/* Card */}
                <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Welcome</h2>
                    <p className="text-muted-foreground mb-4">This is a theme-aware component.</p>

                    {/* Buttons */}
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Primary Action</button>
                        <button className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted/50">Secondary Action</button>
                        <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90">Delete</button>
                    </div>

                    {/* Status Badges */}
                    <div className="flex gap-2 mt-4">
                        <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">Success</span>
                        <span className="px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">Warning</span>
                        <span className="px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">Error</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
```

## Kết luận

Theme system mới giúp:

-   ✅ Quản lý màu sắc tập trung
-   ✅ Dễ dàng thêm/sửa theme
-   ✅ Tự động hỗ trợ dark mode
-   ✅ Consistent UI across app
-   ✅ Maintainable và scalable

**Quy tắc vàng:** KHÔNG BAO GIỜ hardcode màu sắc. Luôn sử dụng theme variables!
