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
    -   `discount`, `taxRate`: numeric values (%).
    -   `totalAmount`, `totalFeeBeforeTax`: Calculated fields.
-   **Status**: `orderStatus` defaults to `"Pending"` on create. `paymentStatus` defaults to `"Unpaid"`.

**Key Features**:

-   **Quote Integration**: Can "Load Quote" via header input or URL parameter (`initialQuoteId`), mapping Quote Samples and Client info to the Order.
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
-   **Pricing**: Displays unit price, tax, and line total for each parameter.

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
    1.  **Header**: "ĐƠN HÀNG", Order ID, Date.
    2.  **Section 1**: Client Information (Name, Address, Contact, Tax Info).
    3.  **Section 2**: Service Provider (Institute info).
    4.  **Section 3**: Detailed Table of Samples (Name, Matrix) and Parameters (Method, Price, VAT).
    5.  **Section 4**: Financial Summary (Subtotal, Discount, VAT, Total).
    6.  **Footer**: Signatures and Bank Info.
-   **Export**: Configures `html2pdf` with margins (`10mm`) and footer paging ("Page X/Y").

### `SampleRequestPrintPreviewModal.tsx`

**Purpose**: Generates the "Phiếu gửi mẫu" (Sample Submission Form).

**Differentiation**:

-   Focuses on **Testing Requirements** rather than Pricing.
-   Layout adheres to ISO/regulatory forms (Section 1: Info, Section 2: Result Receiver, Section 3: Samples).
-   Includes specific Disclaimers and Notes regarding sample retention and method selection.
