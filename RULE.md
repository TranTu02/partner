# Project Rules & Architecture

## 1. Project Overview

-   **Name**: Partner CRM (LIMS Extension)
-   **Type**: Frontend SPA (Single Page Application)
-   **Tech Stack**:
    -   **Core**: React 18 (Vite), TypeScript
    -   **Styling**: Tailwind CSS (with CSS Variables for Theming)
    -   **Icons**: Lucide React
    -   **I18n**: react-i18next (VI/EN)
    -   **State**: React Context API
    -   **Data**: Mock Data (currently), Interfaces defined in `src/types`
    -   **Utils**: date-fns, html2pdf.js, clsx, tailwind-merge

## 2. Directory Structure

```
partner/
├── public/                 # Static assets
├── src/
│   ├── app/                # App entry point
│   │   ├── App.tsx         # Main Routing
│   │   └── globals.css     # Global styles & Tailwind directives
│   ├── components/         # UI Components (Organized by Domain)
│   │   ├── client/         # Client management (AddClient, ClientSection)
│   │   ├── common/         # Shared components (Pagination, LanguageSwitcher)
│   │   ├── order/          # Order logic (SampleCard, PrintTemplate)
│   │   ├── parameter/      # Analysis/Parameter selection modals
│   │   ├── quote/          # Quote logic (Pricing, PrintTemplate)
│   │   ├── statistic/      # Dashboard widgets (StatCard, ActivityItem)
│   │   ├── Sidebar.tsx     # Main Navigation
│   │   └── ThemeToggle.tsx # Dark/Light/System mode toggle
│   ├── config/             # Configurations
│   │   ├── i18n/           # Localization setup
│   │   │   └── locales/    # Translation files (vi.ts, en.ts)
│   │   └── theme/          # Theme system (colors, context)
│   ├── contexts/           # React Contexts (Auth, Theme)
│   ├── data/               # Mock Data & seeders
│   ├── pages/              # Page Views
│   │   ├── DashboardPage.tsx
│   │   ├── OrdersListPage.tsx
│   │   ├── QuoteCreationPage.tsx
│   │   └── ...
│   ├── types/              # TypeScript Interfaces
│   │   ├── organization.ts
│   │   └── ...
│   └── main.tsx            # Entry point
└── ...
```

## 3. Core Principles

### A. Theming System

-   **Strict Rule**: NEVER use hardcoded colors (e.g., `bg-white`, `text-black`, `bg-[#123456]`).
-   **Use Semantic Classes**: Always use Tailwind variables defined in `globals.css` via `theme.config.ts`.
    -   Backgrounds: `bg-background`, `bg-card`, `bg-muted`
    -   Text: `text-foreground`, `text-muted-foreground`, `text-primary`
    -   Borders: `border-border`, `border-input`
-   **Reference**: See `THEME_SYSTEM.md` for the full palette.

### B. Internationalization (i18n)

-   **Strict Rule**: NO hardcoded text in UI components.
-   Use `useTranslation()` hook.
-   Keys must be categorized in `vi.ts` and `en.ts` (e.g., `sidebar.*`, `order.print.*`).
-   Organization info must be pulled from translations (`organization.data.*`).

### C. Types & Interfaces

-   Define shared interfaces in `src/types/` or at the top of relevant component files if local.
-   Use `interface` over `type` for object definitions where possible.
-   Ensure `Organization` and `Branch` types are consistent.

### D. Component Design

-   **Functional Components**: Use `export function ComponentName() {}`.
-   **Props**: Define clear interfaces for component props.
-   **Modularity**: Break down large components (e.g., `QuoteCreationPage` uses `ClientSection`, `SampleCard`, `PricingSummary`).

## 4. Git & Workflow

1.  **Changes**: Always verify `npm run dev` compiles without error.
2.  **Linting**: Fix ESLint warnings (unused vars, etc.) before committing.
3.  **Naming**:
    -   Files/Components: PascalCase (e.g., `OrderListPage.tsx`)
    -   Functions/Vars: camelCase (e.g., `handleExport`, `isModalOpen`)
    -   Constants: UPPER_SNAKE_CASE (if global).

## 5. API Standards

### A. Response Format

All API responses must strictly follow this JSON structure:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },     // Business Data
  "meta": {            // Pagination info (Optional)
    "page": 1,
    "total": 100
  },
  "error": null
}
```

**Error Response**:

```json
{
    "success": false,
    "statusCode": 404,
    "error": {
        "code": "SAMPLE_NOT_FOUND",
        "message": "User friendly message",
        "traceId": "req-123456"
    }
}
```

### B. URL Convention

Endpoints must follow the pattern: `/v1/<Entity>/<Action>/<Supplement>`

-   **Entity**: `client`, `order`, `sample`, `auth`, etc. (Singular, lowercase)
-   **Action**: `get`, `create`, `edit`, `delete`.
-   **Supplement**: `list`, `detail` (for GET actions), or empty/specific sub-action.

Examples:

-   `GET /v1/client/get/list`
-   `POST /v1/client/create`
-   `GET /v1/client/get/detail`
-   `POST /v1/client/edit`
-   `POST /v1/client/delete`

### C. Function Signatures & Implementation

-   All API functions in `src/api` must accept a **single configuration object**:
    ```typescript
    export const functionName = async ({ headers, body, query }: ApiInput): Promise<ApiResponse> => { ... }
    ```
-   **NO** explicit arguments (like `id`) in the function signature. IDs must be passed via `query` (for GET) or `body` (for POST).
-   **HTTP Methods**:
    -   `GET`: For retrieving data (List, Detail).
    -   `POST`: For `create`, `edit`, `delete` actions.
-   **Client Helper**: Use `src/api/client.ts` which handles Axios configuration, Token injection (from Cookies), and standard Error handling (Toast).
