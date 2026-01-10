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
-   **Pricing**: Handles `discountRate`, `taxRate`, and `commission` (Sale commission).

**Pricing Logic & Formulas (CRITICAL)**:

1. **Analysis Level**:

    - `List Price` = `Unit Price` \* `Quantity`
    - `Net Price` = `List Price` \* (1 - `Discount Rate` / 100)
    - `VAT` = `Net Price` \* (`Tax Rate` / 100)
    - `Line Total` (After Tax) = `Net Price` + `VAT`

2. **Sample Level (Footer Summaries)**:

    - `Total Unit Price` (Tổng đơn giá toàn bộ mẫu) = Sum(`List Price`)
    - `Total Discount` (Chiết khấu toàn đơn) = Sum(`List Price` - `Net Price`)
    - **`Total Before Tax` (Tổng tiền trước thuế)** = Sum(`Net Price`)
        - _Note: Sum of Net Price (List Price - Item Discount)._
    - `Total After Tax` (Tổng tiền thanh toán (đã bao gồm VAT)) = Sum(`Line Total`)
        - _Note: Sum of (Net Price + VAT)._

3. **Quote Level (Grand Totals)**:
    - `Subtotal` (TotalFeeBeforeTax) = Sum(All Analysis `Net Prices`)
    - `Discount Amount` (Tiền chiết khấu) = `Subtotal` \* (`Quote Discount Rate` / 100)
    - `Net Before Tax` = `Subtotal` - `Discount Amount`
    - `Total Tax` = Sum(All Analysis `VAT`) \* (1 - `Quote Discount Rate` / 100)
    - `Grand Total` = `Net Before Tax` + `Total Tax`

**Key Features**:

-   **Create Order Integration**: In `view` mode, displays a **"Create Order"** (Tạo đơn hàng) button. This navigates to the Order Creation page passing the `quoteId` to pre-fill the order.
-   **Client Integration**: Uses `ClientSectionNew` with search and "Copy Basic Info" features.
-   **Analysis Reordering**: Supports drag-and-drop reordering of analyses (parameters) within the sample table.
-   **Navigation**: Redirects to Quote Detail page on successful save.
-   **Export**: Integration with `QuotePrintPreviewModal` for PDF generation.

### `PricingSummary.tsx`

**Purpose**: A specific component for the Quote Editor to manage financial totals.

**Features**:

-   Displays: Subtotal, Discount Amount, Fee Before Tax, VAT, Grand Total.
-   Use standard labels: "Tổng đơn giá toàn bộ mẫu", "Chiết khấu toàn đơn", "Tổng tiền trước thuế", "Tổng tiền thanh toán (đã bao gồm VAT)".
-   **UI Layout**: The pricing summary container width is set to `600px` to accommodate longer labels and improve readability.
-   **Commission**: Allows inputting a Commission % for the sales person, calculates the absolute value, but excludes it from the client-facing Grand Total (internal metric).

## Print & Export Components

### `QuotePrintPreviewModal.tsx`

**Purpose**: Generates the "Báo giá" (Quote) document.

**Logic**:

-   Constructs HTML structure similar to Order but titled "BÁO GIÁ".
-   **Provider Section**: Displays Institute info (Name, Address, Email) but excludes Phone number as per configuration.
-   **Discount Display**: Discount percentage is shown in the **Unit Price** column (e.g., `(-10%)`) alongside the value.
-   **Pricing Logic**:
    -   `feeBeforeTaxAndDiscount`: Gross Price (Unit Price \* Quantity).
    -   `feeBeforeTax`: Net Price (after discount) = `feeBeforeTaxAndDiscount * (1 - discount/100)`.
    -   `feeAfterTax`: Final Price (after tax) = `feeBeforeTax * (1 + tax/100)`.
-   **Print Preview**: Includes summary rows ("Total Unit Price", "Discount", etc.) and uses `feeBeforeTaxAndDiscount` for the item amount column.
-   **Pricing Table**: Distinctly displays Unit Price and Totals.
-   **Notes**:
    -   Validity Note ("Đơn hàng có giá trị...") includes the export date (DD/MM/YYYY).
    -   Disclaimer ("Thời gian thử nghiệm...") does not include the date.
-   **Bank Info**: Includes specific bank transfer details for the Institute.
-   **PDF Export**: Supports multi-page exports with "Page X/Y" footer using `html2pdf.js`.

### `QuotesListPage.tsx`

**Purpose**: Displays the list of quotes.
**Columns**: Code, Client, Sale Person (Người liên hệ), Total Value (Giá trị), Created Date, Status, Actions.

### `QuotePrintTemplate.tsx`

**Purpose**: Defines the data structure `QuotePrintData` used for generating the print view.
