# Pages Documentation

This directory contains the top-level Page components that correspond to routes in the application. These components are responsible for data fetching, layout wrapping, and coordinating lower-level components.

## Page Components

### `LoginPage.tsx`

-   **Route**: `/login`
-   **Purpose**: Authentication entry point.
-   **Key Logic**:
    -   Manages `username` and `password` state.
    -   Calls `login` API.
    -   On success, updates `AuthContext` with user data and redirects to the Dashboard or previous attempted URL.
    -   Handles error display via Toast notifications.

### `DashboardPage.tsx`

-   **Route**: `/` (Home)
-   **Purpose**: Overview of system activity.
-   **Key Logic**:
    -   Fetches summary statistics (Order counts, Revenue, etc.).
    -   Displays charts or lists of recent activities (New Orders, New Clients).
    -   Serves as the landing page for authenticated users.

### `ClientsPage.tsx`

-   **Route**: `/clients`
-   **Purpose**: Management interface for Clients.
-   **Key Logic**:
    -   **List View**: Displays paginated table of clients using `getClients` API.
    -   **Search**: Implements debounced search by name or tax code.
    -   **Actions**:
        -   **Create**: Opens `AddClientModal`.
        -   **Edit**: Opens `EditClientModal`.
        -   **Detail**: Opens `ClientDetailModal`.
    -   Manages state for modals and current selection.

### `QuotesListPage.tsx`

-   **Route**: `/quotes`, `/quotes/create`, `/quotes/edit`, `/quotes/detail`
-   **Purpose**: Management and Editor interface for Quotes.
-   **Key Logic**:
    -   **Routing**: Determines View Mode (`list`, `create`, `edit`, `view`) based on URL path and query parameters (`quoteId`).
    -   **List Mode**: Renders a table of quotes with filters.
    -   **Editor Mode**: Renders the `QuoteEditor` component for creating/modifying quotes.
    -   **Navigation**: Handles redirects after Save (to Detail view) or Back events.
    -   **Features**: Includes "Create Order" button in Detail view to convert a quote to an order.
    -   **Pricing Logic**: Ensures "Total Before Tax" represents sum of Net Prices (custom requirement).

### `OrdersListPage.tsx`

- **Route**: `/orders`, `/orders/create`, `/orders/edit`, `/orders/detail`
- **Purpose**: Management and Editor interface for Orders.
- **Key Logic**:
  - **Routing**: Similar to Quotes, handles `list`, `create`, `edit`, `view` modes.
  - **Query Params**: Handles `quoteId` in `create` mode to pre-fill order data from an existing quote.
  - **List Mode**: Renders `OrderTable` (or internal table structure).
  - **Editor Mode**: Renders `OrderEditor`.
  - **Navigation**: Redirects to Detail view upon successful Save.
    - **Pricing Logic**: Ensures "Total Before Tax" represents sum of Net Prices.

### `SampleRequestFormPage.tsx`

- **Route**: `orders/form/request?orderId`
- **Purpose**: Generates the Sample Submission Form for an Order with rich-text preview and PDF export..
- **Key Logic**:
  - **Query Params**: Reads orderId from the URL (useSearchParams). If missing, shows a Toast error and stops.
  - **Data Fetching**: Calls getOrderDetail({ query: { orderId } }) to retrieve full Order information.
  - **Normalization**: Maps the API response into OrderPrintData via mapOrderDetailResponseToPrintData (handles nested response shapes).
  - **Template Rendering**: Generates initial HTML using generateSampleRequestHtml(data, t) and renders it inside tinymce-react.
  - **Editor Guard**: Uses editorReady overlay + visibility: hidden to prevent raw HTML flash before TinyMCE init completes.
  - **Protected Blocks**: Uses TinyMCE noneditable plugin and intercepts Backspace/Delete to prevent accidental removal of .mceNonEditable sections.
  - **PDF Preview/Export**: Supports Preview (open new tab) and Export (download file).

### `ParametersPage.tsx`

-   **Route**: `/parameters`
-   **Purpose**: Catalogue of Analysis Parameters (Matrices).
-   **Key Logic**:
    -   **List View**: Displays Analysis Matrices (Parameter + Method + Sample Type).
    -   **Filters**: Allows filtering by Scientific Field (Chemistry, Physics, Microbiology).
    -   **Search**: Debounced search by parameter name.
    -   **Actions**: Add/Delete matrices.

### `AccountingPage.tsx`

-   **Route**: `/accounting`
-   **Purpose**: Invoice management for completed orders.
-   **Key Logic**:
    -   **Statistics**: Shows counts of Pending/Completed invoices and total pending value.
    -   **Filters**: Toggles between "Pending Invoice", "Completed Invoice", and "Total Pending".
    -   **Table**: Lists orders relevant to the selected filter.
    -   **Invoicing**: Opens `InvoiceModal` to generate invoices for selected orders.

### `SettingsPage.tsx`

-   **Route**: `/settings`
-   **Purpose**: System or User settings.
-   **Key Logic**:
    -   Configuration for Theme (Light/Dark).
    -   Profile management (optional).
    -   Other system-wide preferences.
