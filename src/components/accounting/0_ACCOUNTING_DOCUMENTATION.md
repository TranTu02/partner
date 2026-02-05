# Accounting Components Documentation

This directory contains components related to the Accounting and Invoicing module.

## Overview

The Accounting module manages order payment tracking, invoice generation, and financial reporting. It provides interfaces for:

- Viewing and filtering orders by payment status
- Updating payment information and transaction history
- Generating invoices
- Bulk payment updates
- Financial statistics and reporting

---

## Components

### `AccountingPage.tsx`

**Purpose**: Main page for the Accounting module.

**Key Features**:

- **Statistics Dashboard**: Displays 3 key metrics via `AccountingStats` component
- **Order Filtering**: Filter by payment status (pending invoice, payment problems, etc.)
- **Search**: Search by order code or client name
- **Table View**: List of orders with accounting-relevant information
- **Actions**: Edit payment details, create invoices, bulk payment updates

**State Management**:

- `filterType`: Current active filter (`"pending"` | `"completed"` | `"totalPending"` | `"all"`)
- `stats`: Accounting statistics from API
- `orders`: List of orders matching current filters
- `searchQuery`: Search text input

**Filter Logic**:
| Filter Type | Conditions |
|------------|------------|
| `pending` (Chưa xuất hóa đơn) | `orderStatus IN ('Processing', 'Completed')` AND `invoiceNumbers IS NULL` AND `paymentStatus IN ('Paid', 'Debt')` |
| `completed` (Lệch/Chờ thanh toán) | `paymentStatus IN ('Unpaid', 'Partial', 'Variance')` AND `requestDate IS NOT NULL` |
| `totalPending` (Tổng giá trị lệch/chờ) | Same as `completed` filter |

### `AccountingStats.tsx`

**Purpose**: Displays summary statistics cards for the accounting dashboard.

**Features**:

- **3 Stat Cards**:
    1. **Chưa xuất hóa đơn** (`waitingExportInvoiceCount`): Number of orders waiting for invoice export
    2. **Lệch/Chờ thanh toán** (`paymentProblemOrderCount`): Number of orders with payment issues
    3. **Tổng giá trị lệch/chờ** (`totalPaymentDifferenceAmount`): Total value of payment differences (VND)
- **Interactive Filtering**: Click on a card to filter orders, click again to clear filter
- **Visual Feedback**: Active filter highlighted with border and background color

**Props**:

```typescript
interface AccountingStatsProps {
    stats: AccountingStatsType;
    filterType: "pending" | "completed" | "totalPending" | "all";
    onFilterChange: (type: "pending" | "completed" | "totalPending" | "all") => void;
}
```

### `AccountingTable.tsx`

**Purpose**: Displays the list of orders with accounting-relevant information.

**Columns**:

- **Order Code** (`orderId`): Order ID and Created Date
- **Reception Info**: Lab receipt reference (`receiptId`) and Request Date (`requestDate`)
- **Client** (`client.clientName`): Client name
- **Tax Code** (`client.invoiceInfo.taxCode`): Tax identification
- **Total** (`totalAmount`): Order total value
- **Total Paid** (`totalPaid`): Amount paid + payment date
- **Status** (`orderStatus`, `paymentStatus`): Order and payment status badges
- **Actions**: Edit button, Note icon

**Features**:

- **Advanced Filtering**: Column-based filters for status, dates, amounts
- **Pagination**: Configurable items per page
- **Note Indicator**:
    - Outline icon if `orderNote` is null/empty
    - Filled icon if `orderNote` has value
    - Tooltip shows note content on hover
- **Responsive Design**: Horizontal scroll for smaller screens

### `AccountingDetailModal.tsx`

**Purpose**: Modal for editing order payment and accounting details.

**Sections**:

1. **Client & Invoice Info** (Read-only):
    - Basic Info: Name, Address, Phone
    - Invoice Info: Tax Name, Tax Code, Tax Address, Tax Email

2. **Sample Details** (Read-only):
    - List of samples with parameters and fees
    - Pricing summary: Subtotal, VAT, Total

3. **Editable Fields**:
    - **Order Status** (Read-only display): Shows current status
    - **Payment Status** (Dropdown): Unpaid, Partial, Paid, Debt, Variance
    - **Invoice Numbers** (Read-only): List of issued invoices
    - **Total Paid** (Currency input): Amount paid with VND formatting
    - **Payment Date** (Date input): Date of payment
    - **Order Note** (Textarea): Notes about the order

**Update Logic**:

- Only sends changed fields to API
- `totalPaid`: Sends `null` if value is 0
- `paymentDate`: Converts to ISO timestamp, sends `null` if empty
- `orderNote`: Trims whitespace, sends `null` if empty string
- Shows "No changes" message if nothing was modified

**API Call**:

```typescript
updateOrder({
    body: {
        orderId: string,
        paymentStatus?: string,
        totalPaid?: number | null,
        paymentDate?: string | null,
        invoiceNumbers?: string[],
        orderNote?: string | null
    }
})
```

### `BulkPaymentModal.tsx`

**Purpose**: Modal for bulk updating payment information for multiple orders.

**Features**:

- **Spreadsheet-like Interface**: Table with editable cells
- **Excel/Sheets Paste Support**: Paste TSV data directly
- **Auto-row Addition**: Press Enter/Tab on last cell to add new row
- **Currency Formatting**: Automatic thousand separators for amounts
- **Date Parsing**: Supports DD-MM-YYYY, DD/MM/YYYY formats

**Columns**:

- **Order ID** (`orderId`): Order identifier
- **Amount** (`totalPaid`): Payment amount with currency formatting
- **Payment Date** (`paymentDate`): Date in DD-MM-YYYY format

**Update Behavior**:

- **Success**: Row is removed from table
- **Failure**: Row remains with red border and error indicator
- **Error Display**: Red left border, "Error" label, error tooltip
- **Partial Success**: Modal stays open with only failed rows

**Date Conversion**:

- Parses DD-MM-YYYY and DD/MM/YYYY formats
- Converts to ISO timestamp for API
- Handles invalid dates gracefully

**API Integration**:

```typescript
// For each valid row:
updateOrder({
    body: {
        orderId: string,
        totalPaid?: number | null,
        paymentDate?: string | null
    }
})
```

### `InvoiceModal.tsx`

**Purpose**: Confirmation modal for invoice generation.

**Features**:

- Displays order summary (Client, Tax Info, Totals)
- Confirmation before invoice creation
- Updates `invoiceNumbers` array on success

---

## Data Flow

### Accounting Statistics Flow

```
AccountingPage
  ↓ (on mount / filter change)
GET /v1/order/stats/accounting
  ↓
AccountingStats (display)
  ↓ (user clicks stat card)
AccountingPage.setFilterType()
  ↓
GET /v1/order/get/list (with filters)
  ↓
AccountingTable (display filtered orders)
```

### Order Update Flow

```
AccountingTable
  ↓ (user clicks Edit)
AccountingDetailModal (open with order data)
  ↓ (user modifies fields)
handleSave() → updateOrder API
  ↓ (on success)
onRefresh() → reload orders
  ↓
AccountingTable (updated data)
```

### Bulk Payment Flow

```
AccountingPage
  ↓ (user clicks Bulk Payment)
BulkPaymentModal (open)
  ↓ (user pastes/enters data)
handleSubmit() → updateOrder API (for each row)
  ↓ (process results)
Remove successful rows, mark failed rows
  ↓ (if all success)
Close modal, refresh table
```

---

## Type Definitions

### `AccountingStats`

```typescript
interface AccountingStats {
    waitingExportInvoiceCount: number; // Orders waiting for invoice
    paymentProblemOrderCount: number; // Orders with payment issues
    totalPaymentDifferenceAmount: number; // Total payment difference (VND)
}
```

### `Order` (Accounting-relevant fields)

```typescript
interface Order {
    orderId: string;
    receiptId?: string;
    client: Client;
    orderStatus: "Pending" | "Processing" | "Completed" | "Cancelled";
    paymentStatus: "Unpaid" | "Partial" | "Paid" | "Debt" | "Variance";
    totalAmount: number;
    totalPaid?: number;
    paymentDate?: string;
    invoiceNumbers?: string[];
    requestDate?: string;
    orderNote?: string;
    // ... other fields
}
```

---

## API Endpoints

### Get Accounting Statistics

```
GET /v1/order/stats/accounting
Response: {
    waitingExportInvoiceCount: number,
    paymentProblemOrderCount: number,
    totalPaymentDifferenceAmount: number
}
```

### Get Orders List (with filters)

```
GET /v1/order/get/list?page=1&itemsPerPage=20&orderStatus[]=Processing&paymentStatus[]=Unpaid
```

### Update Order

```
POST /v1/order/update
Body: {
    orderId: string,
    paymentStatus?: string,
    totalPaid?: number | null,
    paymentDate?: string | null,
    invoiceNumbers?: string[],
    orderNote?: string | null
}
```

---

## Business Rules

### Payment Status Logic

- **Unpaid**: No payment received (`totalPaid` is null or 0)
- **Partial**: `0 < totalPaid < totalAmount`
- **Paid**: `totalPaid >= totalAmount` (exact match)
- **Debt**: `totalPaid > totalAmount` (overpayment)
- **Variance**: Payment amount doesn't match expected (requires review)

### Invoice Export Rules

- Order must have `orderStatus` = "Processing" or "Completed"
- Order must have valid client tax information
- Once invoice is exported, `invoiceNumbers` array is updated

### Filter Conditions

See `AccountingPage.tsx` section above for detailed filter logic.

---

## i18n Keys

### Vietnamese (`vi.ts`)

```typescript
accounting: {
    stats: {
        pending: "Chưa xuất hóa đơn",
        completed: "Lệch/Chờ thanh toán",
        totalPendingValue: "Tổng giá trị lệch/chờ"
    },
    // ... other keys
}

order: {
    note: "Ghi chú",
    notePlaceholder: "Nhập ghi chú...",
    sampleList: "Danh sách mẫu",
    // ... other keys
}
```

### English (`en.ts`)

```typescript
accounting: {
    stats: {
        pending: "Pending Invoice",
        completed: "Payment Problem",
        totalPendingValue: "Total Difference Value"
    },
    // ... other keys
}

order: {
    note: "Note",
    notePlaceholder: "Enter note...",
    sampleList: "Sample List",
    // ... other keys
}
```

---

## UI/UX Guidelines

### Currency Display

- Use thousand separators (e.g., 1.000.000)
- Right-align currency values
- Show "VND" suffix
- Input accepts only numeric characters

### Date Format

- Display: DD-MM-YYYY
- Input: HTML5 date picker (YYYY-MM-DD)
- API: ISO 8601 timestamp

### Status Badges

- Color coding for different statuses
- Consistent badge styling across components
- Hover tooltips for additional context

### Error Handling

- Red border for validation errors
- Toast notifications for API errors
- Inline error messages where appropriate
- Keep failed rows in bulk update for correction

---

## Performance Considerations

- Debounce search input (300ms)
- Paginate large order lists
- Lazy load order details in modal
- Batch API calls in bulk update
- Cache statistics data (refresh on filter change)
