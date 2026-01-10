# Order Components Documentation

This directory contains components related to Order management, handling the lifecycle of testing orders from creation to printing.

## Core Components

### `OrderEditor.tsx`

**Purpose**: The central component for creating, viewing, and modifying Orders. It serves as the "source of truth" for the order state during editing.

**Props**:

-   `mode`: `EditorMode` (view | create | edit).
-   `initialData`: Optional `Order` object for Edit/View modes.
-   `initialQuoteId`: Optional string. If provided in `create` mode, triggers `handleLoadQuote` to pre-fill data.
-   `onSaveSuccess`: Callback `(data: Order) => void`. executed after successful save.
-   `onBack`: Callback for the back navigation.

**State Management**:

-   **Client**: Uses `selectedClient` state. If `initialQuoteId` is used, client is loaded from Quote.
-   **Samples**: Array of samples. Each sample contains an array of analyses (parameters).
-   **Pricing**:
    -   `discountRate`, `taxRate`: numeric values (%).
    -   `totalAmount`, `totalFeeBeforeTax`: Calculated fields.
-   **Status**: `orderStatus` defaults to `"Pending"` on create. `paymentStatus` defaults to `"Unpaid"`.
-   **UI Layout**: The pricing summary container width is set to `600px` to accommodate longer labels and improve readability.

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

3. **Order Level (Grand Totals)**:
    - `Subtotal` (TotalFeeBeforeTax) = Sum(All Analysis `Net Prices`)
    - `Discount Amount` (Tiền chiết khấu) = `Subtotal` \* (`Order Discount Rate` / 100)
    - `Net Before Tax` = `Subtotal` - `Discount Amount`
    - `Total Tax` = Sum(All Analysis `VAT`) \* (1 - `Order Discount Rate` / 100)
    - `Grand Total` = `Net Before Tax` + `Total Tax`

**Key Features**:

-   **Quote Integration**:
    -   Can "Load Quote" via header input or URL parameter (`initialQuoteId`), mapping Quote Samples and Client info to the Order.
    -   Uses `getQuoteDetail` API to ensure full structure (including all samples and parameters) is retrieved.
-   **Client Integration**: Uses `ClientSectionNew`. Supports syncing "Invoice Info" from "Basic Info".
-   **Sample Management**: Uses `SampleCard` for adding/removing/duplicating samples.
-   **Validation**: Checks for Client selection and at least one Sample with Analyses before saving.
-   **Navigation**: Redirects to Order Detail page upon successful creation via `onSaveSuccess`.

### `OrderEditModal.tsx`

**Purpose**: A full-screen modal wrapper for `OrderEditor`.

**Usage**: Used in contexts where the Order Editor needs to be overlaid on another view (e.g., fast creation from Dashboard - _future use case_). Currently, `OrdersListPage` uses `OrderEditor` directly, but this wrapper exists for flexibility.

### `SampleCard.tsx`

**Purpose**: Represents a single sample within the Order.

**Features**:

-   **Header**: Editable Sample Name and Matrix. "Duplicate" button copies the sample + all analyses to a new entry.
-   **Analysis Table**: Lists selected parameters (`AnalysisModalNew` integration).
    -   **Reordering**: Supports drag-and-drop reordering of analyses rows using the "grip" handle (icon).
    -   **ReadOnly**: When `isReadOnly` is true, editing inputs and drag handles are hidden.
-   **Pricing**: Displays unit price, tax, and line total for each parameter.
-   **Payload**: When saving, the full analysis object (including `unitPrice`, `discountRate`, `taxRate`, etc.) is preserved in the payload to ensuring accurate pricing recalculations, especially when created from a Quote.

## Print & Export Components

### `OrderPrintPreviewModal.tsx`

**Purpose**: Provides a rich-text preview of the Order for printing or PDF export.

**Dependencies**:

-   `tinymce-react`: For rendering the HTML preview.
-   `html2pdf.js`: For client-side PDF generation.
-   `OrderPrintTemplate`: Used as the visual reference (though logic handles HTML generation directly).

**Logic**:

-   Generates an HTML string based on the `Order` data.
-   Layout includes:
    1. **Header**: "ĐƠN HÀNG", Order ID, Date.
    2. **Section 1**: Client Information (Name, Address, Contact, Tax Info).
    3. **Section 2**: Service Provider (Institute info, excluding Phone).
    4. **Section 3**: Detailed Table of Samples (Name, Matrix) and Parameters (Method, Price, VAT).
    5. **Section 4**: Financial Summary (Subtotal, Discount, VAT, Total).
    6. **Footer**: Signatures and Bank Info.
-   **Export**: Configures `html2pdf` with margins (`10mm`) and footer paging ("Page X/Y").

### `SampleRequestPrintPreviewModal.tsx`

**Purpose**: Generates the "Phiếu gửi mẫu" (Sample Submission Form).

**Differentiation**:

-   Focuses on **Testing Requirements** rather than Pricing.
-   Layout adheres to ISO/regulatory forms (Section 1: Info, Section 2: Result Receiver, Section 3: Samples).
-   Includes specific Disclaimers and Notes regarding sample retention and method selection.
