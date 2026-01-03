# Business Analysis & Feature Specifications

## 1. Actors & Roles

-   **Admin**: Full system access.
-   **Client**: Can view own orders, quotes, and create requests.
-   **Collaborator (CTV)**: Can view/manage assigned clients (Private scope) and orders.
-   **Sales**: Manage quotes and orders for customers.
-   **Accountant**: View accounting and debt information.
-   **CustomerService**: View all clients, support ticket management.
-   **Guest**: Limited view (Public catalog).

## 2. Core Modules

### A. Dashboard (`DashboardPage`)

-   **Overview**: Provides a snapshot of business performance.
-   **Key Metrics**: Total Requests, Completed Orders, Pending Processing, Revenue.
-   **Visuals**:
    -   _StatCards_: Quick numbers with trend indicators.
    -   _ActivityItem_: Recent system logs/actions.
    -   _ParameterBar_: Popular analysis parameters.
-   **Features**: Filter by Date Range (Day/Week/Month).

### G. UX/UI Constraints

-   **Popups/Modals**: Must have a fixed minimum width (`min-w`) to prevent layout collapse on empty content.
-   **Notifications**: Flash messages (Toast) must appear for exactly **1 second** and float above all other layers (Z-index Max).

### B. Order Management (`OrdersListPage`, `OrderCreationPage`)

-   **Process**: Create Order -> Add Client -> Add Samples -> Select Analyses -> Save/Print.
-   **Data Structure**: Order -> Samples -> Analyses (Parameters).
-   **Features**:
    -   **Dynamic Form**: Add multiple samples, duplicate samples.
    -   **Analysis Selection**: Search/Select parameters from modal (`AnalysisModalNew`).
    -   **Pricing**: Auto-calculate Subtotal, VAT, Discount.
    -   **Print/Preview**: Generate "Phieu yeu cau thu nghiem" (A4 format) with `OrderPrintPreviewModal`.
-   **Status Flow**: Pending -> Approved -> In Progress -> Completed.

### C. Quote Management (`QuotesListPage`, `QuoteCreationPage`)

-   **Process**: Similar to Orders but for pre-sales.
-   **Features**:
    -   Create/Edit Quotes.
    -   **Export**: Generate PDF Quote for customers (`QuotePrintPreviewModal`).
    -   **Pricing**: Includes discount and commission handling.
    -   **Conversion**: Can convert Quote -> Order (planned).

### D. Client Management (`ClientsPage`)

-   **Types**:
    -   _Public_: Standard clients, visible to Sales/CS.
    -   _Private_: Managed specifically by Collaborators.
-   **Info**: Basic info, Address, Contact Person, Tax ID.
-   **Stats**: Total orders, total revenue per client.

### E. Parameter/Analysis Catalog (`ParametersPage`)

-   **Data**: List of test parameters (e.g., pH, COD, BOD5).
-   **Fields**: Method (Protocol), Unit Price, Scientific Field (Hóa/Lý/Sinh), TAT.
-   **Usage**: Used in Orders and Quotes for selection.

### F. Accounting (`AccountingPage`)

-   **Focus**: Tracking financial status of orders.
-   **Statuses**: Unpaid, Partially Paid, Paid.
-   **Features**: Debt tracking, payment history.

## 3. Data Entities

### Organization

-   `organizationName` (text-primary)
-   `address`, `taxId`, `email`, `phone`
-   **Branches**: List of physical office locations.

### Order / Quote

-   ID Format: `ORD-YYYYMMDD-XX` / `QT-YYYYMMDD-XX`
-   `clientId`: Link to Client.
-   `samples`: Array of samples.
-   `pricing`: `{ subtotal, tax, total }`.

## 4. Workflows

### Printing/Exporting

1. User clicks "Print" or "Export PDF".
2. System gathers current state data.
3. Opens _Preview Modal_ with WYSIWYG editor (TinyMCE).
4. HTML template is rendered with data placeholders.
5. `html2pdf.js` converts the rendered HTML to PDF for download.

## 5. API Integration

### A. Standards

-   **Endpoint Pattern**: `/v1/<Entity>/<Action>/<Supplement>`
-   **Response Format**: Standardized JSON with `success`, `statusCode`, `data`, `meta`, `error`.
-   **Function Signature**: `({ headers, body, query })` - Single object argument.

### B. Core Entity Maps

-   **Auth**: `/v1/auth/login`, `/v1/auth/logout`
-   **Clients**:
    -   List: `GET /v1/client/get/list`
    -   Detail: `GET /v1/client/get/detail` (ID in query)
    -   CRUD: `POST /v1/client/create`, `edit`, `delete`
-   **Orders**:
    -   List: `GET /v1/order/get/list`
    -   Detail: `GET /v1/order/get/detail` (ID in query)
    -   CRUD: `POST /v1/order/create`, `edit`, `delete`
-   **Samples**:
    -   List: `GET /v1/sample/get/list`
    -   CRUD: `POST /v1/sample/create`, `edit`, `delete`

### C. Implementation Rules

-   **No Path Params in Function Signatures**: Do not define functions like `getClient(id)`. Use `getClient({ query: { id } })`.
-   **Methods**: Use `GET` for fetching data (List/Detail) and `POST` for all state changes (Create/Edit/Delete).
