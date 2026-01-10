# Frontend Agent Rules & Coding Standards

## 1. Technical Stack Constraints

-   **Framework**: React 18+ (Vite)
-   **Language**: TypeScript (Strict mode)
-   **Styling**: Tailwind CSS (Utility-first)
-   **Icons**: Lucide React (Standard set)
-   **Forms**: Controlled components (React `useState` or `react-hook-form` if complex)
-   **Date**: `date-fns` for formatting
-   **PDF**: `html2pdf.js` (via wrappers)

## 2. Styling & Theming (CRITICAL)

-   **NEVER use hardcoded colors**.
    -   ❌ `bg-white`, `text-black`, `border-gray-200`, `text-[#123456]`
    -   ✅ `bg-card`, `text-foreground`, `border-border`, `text-primary`
-   **Follow the Theme System**:
    -   Use `bg-muted/50` for table headers or secondary backgrounds.
    -   Use `hover:bg-muted` for interactive rows/items.
    -   Use `text-muted-foreground` for secondary text (labels, subtitles).
    -   Use `text-destructive` for delete/danger actions.
    -   Use `text-success` for positive status/actions.
-   **Reference**: Always check `src/config/theme/theme.config.ts` and `src/app/globals.css`.

## 3. Component Architecture

-   **Directory**: Place components in `src/components/[domain]/`.
    -   E.g., `src/components/quote/PricingSummary.tsx`
-   **Exports**: Use Named Exports: `export function MyComponent() {}`.
-   **Props**: Define `interface MyComponentProps` immediately above the component.
-   Modals:
    -   Manage state (`isOpen`) in the parent page.
    -   Pass `onClose` and `onConfirm` handlers.
    -   Use fixed overlays with `z-50`, backdrop blur, and animations (`animate-in fade-in zoom-in-95`).
    -   **Sizing**: Always define a `min-width` (e.g., `min-w-[500px]` for forms, `min-w-[800px]` for tables) to ensure content is not squashed.

## 4. Notifications (Toaster)

-   **Implementation**: Centralized in `src/app/App.tsx`.
-   **Configuration**:
    -   Duration: **1000ms** (1 second).
    -   Z-Index: **99999** (Must be on top of everything, including modals).
    -   Component: `sonner` (from `@/components/ui/sonner`).

## 5. Internationalization (i18n)

-   **Always use `useTranslation`**.
-   **Keys**: Structure keys hierarchically in `locales/vi.ts` and `en.ts`.
    -   `module.submodule.key` (e.g., `quote.print.title`).
-   **Organization Info**: Never hardcode company name/address. Use `t("organization.data.*")`.

## 6. Coding Patterns

-   **Hooks**: Use `useAuth` for user context (handles `checkSessionStatus` internally), `useTheme` for theme switching.
-   **Pagination**: Use the shared `Pagination` component in `src/components/common/`.
    -   Must implement `itemsPerPage` selector (default **20**).
    -   Pass `onItemsPerPageChange` handler to reset page to 1.
-   **Tables**:
    -   Use sticky headers: `<thead className="bg-card sticky top-0 z-10 shadow-sm">`.
    -   Handle scrolling properly (wrap inner div with `flex-1 overflow-auto`).
-   **Printing**:
    -   Use `OrderPrintPreviewModal` or `QuotePrintPreviewModal`.
    -   Templates must support A4 sizing (`210mm` width).

### Input Fields (Numbers)

-   **No Default 0**: Do not initialize number inputs with 0 unless strictly required (e.g., Tax Rate = 5 or 8). Allow empty states (initialize as `""` or `undefined`).
-   **No Spinners**: Hide browser default spin buttons (up/down arrows) for a cleaner UI.
    -   Use the following Tailwind classes: `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`.
-   **Type Safety**: State should support `number | string` to allow empty inputs. Always cast to `Number()` safely before performing calculations.

## 7. Implementation Checklist

Before marking a task as done, verify:

1. [ ] Does it work in **Dark Mode**? (Check contrast).
2. [ ] Is all text **translated**? (No English hardcoded in Vietnamese view).
3. [ ] Are **types** defined? (No `any` unless absolutely necessary for external libs).
4. [ ] Is the **folder structure** respected?
5. [ ] Are **imports** clean? (Use `@/` alias).
