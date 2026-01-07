# Types Documentation

This directory contains TypeScript definitions for the core data entities and API responses used throughout the application.

## Core Entities

### `auth.ts`

Definitions related to User Authentication and Authorization.

-   **`User`**: Represents the authenticated user structure stored in the Auth Context.
    -   `roles`: Object mapping role names (e.g., `admin`, `technician`) to booleans.
    -   `identityId`: Unique identifier for the user.
-   **`LoginResponse`**: Response structure from the login API, containing the JWT `token` and `identity` details.
-   **`Identity`**: Detailed user profile information including permissions and status.

### `client.ts`

Definitions for Client Management.

-   **`Client`**: The main Client entity.
    -   `clientId`: Custom Text ID (Primary Key).
    -   `clientName`, `legalId` (Tax ID), `clientAddress`: Basic info.
    -   `clientSaleScope`: `"public"` or `"private"`, determining visibility.
    -   `invoiceInfo`: JSONB structure storing specific invoicing details (`taxName`, `taxCode`, `taxAddress`, `taxEmail`).
    -   `clientContacts`: List of contact persons.
-   **`InvoiceInfo`**: Interface for the invoice-specific fields.
-   **`ClientContact`**: Interface for contact details.

### `order.ts`

Definitions for Order Management.

-   **`Order`**: The Order entity.
    -   `orderId`: Custom Text ID.
    -   `orderStatus`: Lifecycle state (`Pending`, `Processing`, `Completed`, `Cancelled`).
    -   `paymentStatus`: Financial state (`Unpaid`, `Partial`, `Paid`, `Debt`).
    -   `samples`: JSONB array containing the samples and their analysis parameters for this order.
    -   `totalAmount`, `totalFeeBeforeTax`: Pricing fields.
    -   `client`: Snapshot of the client data at the time of order creation.

### `quote.ts`

Definitions for Quote Management.

-   **`Quote`**: The Quote entity, sharing many structures with `Order` but representing a pre-order state.
    -   `quoteStatus`: Lifecycle state (`Draft`, `Sent`, `Approved`, `Expired`).
    -   `samples`: JSONB array of proposed samples.
    -   `totalAmount`, `discount`, `taxRate`: Pricing details.

### `parameter.ts`

Definitions for the LIMS Analysis Parameters.

-   **`Parameter`**: A specific analysis attribute (e.g., "pH").
-   **`Protocol`**: The testing method/standard (e.g., "ISO 10523").
-   **`Matrix`**: The intersection of a Parameter, Protocol, and Sample Type.
    -   Reference table defining price, turnaround time, limit of detection (LOD), and limit of quantification (LOQ).
    -   This is the entity selected by users when adding analyses to an order/quote.

## Shared/Utility Types

### `common.ts`

(If present) Contains shared Enums or utility types used across multiple modules.
