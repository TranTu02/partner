# Client Components Documentation

This directory contains components related to Client management, including creation, editing, viewing details, and selection within other modules (Order/Quote).

## Files and Structure

### `AddClientModal.tsx`

**Purpose**: A modal component for creating a new Client entity.

**Structure**:

-   **Props**:
    -   `isOpen`: Boolean to control visibility.
    -   `onClose`: Callback to close modal.
    -   `onConfirm`: Callback execution on successful creation.
    -   `currentIdentityId`: ID of the current user (default "ID001") to automatically assign to `availableByIds`.
    -   `currentIdentityName`: Name of the current user (default "Collaborator") to automatically assign to `availableByName`.
-   **State**: Manages form fields for Basic Info, Contact Info, and Invoice Info (including `taxEmail`).
-   **Logic**:
    -   Validates required fields (Name, Address).
    -   **Copy Basic Info**: Button to automatically populate Invoice Info (Tax Name, Address, Email) using the Client's basic information.
    -   Constructs `Client` object with initial status `private` and assiged to current user.
    -   Calls `onConfirm` with the new client payload.

### `EditClientModal.tsx`

**Purpose**: A modal for updating existing client information.

**Structure**:

-   **Props**: `isOpen`, `onClose`, `client` (data to edit), `onConfirm` (update callback).
-   **Logic**:
    -   Pre-fills form with existing client data. Allows updating all fields including Contacts and Invoice Info (`taxEmail` included).
    -   Includes **Copy Basic Info** button to quickly sync Invoice fields with Basic details.

### `ClientDetailModal.tsx`

**Purpose**: A read-only view of full client information.

**Structure**:

-   **Props**: `isOpen`, `onClose`, `client`.
-   **UI**:
    -   Tabs for "Overview", "Orders", "Quotes", etc. (Future expansion).
    -   Currently displays arranged sections for General Info, Contact Person, and Invoice Details.
    -   Shows `availableByIds` list (Access scope).

### `ClientSectionNew.tsx`

**Purpose**: A reusable component used in `OrderEditor.tsx` and `QuoteEditor.tsx` to handle client selection.

**Structure**:

-   **Props**:
    -   `clients`: List of available clients.
    -   `selectedClient`: Currently selected client object.
    -   `onClientChange`: Callback when selection changes.
    -   Various callbacks for updating individual fields (address, contact, email, etc.) when the user manually overrides client info for a specific Order/Quote.
    -   `onAddNewClient`: Trigger to open the `AddClientModal` from within the editor.
-   **Functionality**:
    -   Provides a Searchable Dropdown (combobox) to find clients.
    -   Displays editable fields for Address, Contact, and Tax info, populated from the selected client but mutable for the specific transaction.
    -   Includes a "Create New Client" button for quick access.
    -   Includes **Copy Basic Info** button in the Invoice Info section to populate tax fields from the selected client's basic details.

## Integration workflows

### Client Creation from Order/Quote

When creating a client directly from the Order or Quote editor:

1.  The `OrderEditor` or `QuoteEditor` passes the current logged-in user's identity (`identityId`, `identityName`) from `AuthContext` to `AddClientModal`.
2.  The new client is created with `clientSaleScope: "private"`.
3.  The client's `availableByIds` and `availableByName` arrays are pre-filled with the current user, ensuring they have immediate access to the client they just created.
