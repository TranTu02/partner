# Quote Components Documentation

This directory contains components related to Quote (Báo giá) management.

## Core Components

### `QuoteEditor.tsx`

**Purpose**: The main interface for managing Quotes.

**Props**:

-   `mode`: `EditorMode`.
-   `initialData`: Optional `Quote`.
-   `onSaveSuccess`: Callback `(data: Quote) => void`.

**State Management**:

-   **Status**: `quoteStatus` defaults to `"Draft"` on create.
-   **Pricing**: Handles `discount`, `taxRate`, and `commission` (Sale commission).

**Key Features**:

-   **Create Order Integration**: In `view` mode, displays a **"Create Order"** (Tạo đơn hàng) button. This navigates to the Order Creation page passing the `quoteId` to pre-fill the order.
-   **Client Integration**: Uses `ClientSectionNew` with search and "Copy Basic Info" features.
-   **Navigation**: Redirects to Quote Detail page on successful save.
-   **Export**: Integration with `QuotePrintPreviewModal` for PDF generation.

### `PricingSummary.tsx`

**Purpose**: A specific component for the Quote Editor to manage financial totals.

**Features**:

-   Displays: Subtotal, Discount Amount, Fee Before Tax, VAT, Grand Total.
-   **Commission**: Allows inputting a Commission % for the sales person, calculates the absolute value, but excludes it from the client-facing Grand Total (internal metric).

## Print & Export Components

### `QuotePrintPreviewModal.tsx`

**Purpose**: Generates the "Báo giá" (Quote) document.

**Logic**:

-   Constructs HTML structure similar to Order but titled "BÁO GIÁ".
-   **Pricing Table**: Distinctly displays Unit Price and Totals.
-   **Bank Info**: Includes specific bank transfer details for the Institute.
-   **PDF Export**: Supports multi-page exports with "Page X/Y" footer using `html2pdf.js`.

### `QuotePrintTemplate.tsx`

**Purpose**: Defines the data structure `QuotePrintData` used for generating the print view.
