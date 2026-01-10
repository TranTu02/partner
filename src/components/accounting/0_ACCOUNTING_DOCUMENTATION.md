# Accounting Components Documentation

This directory contains components related to the Accounting and Invoicing module.

## Files and Structure

### `AccountingTable.tsx`

**Purpose**: Displays the list of orders relevant to accounting (Pending/Completed Invoices).

**Key Features**:

-   **Columns**:
    -   **Order Code**: Link or text ID.
    -   **Client**: Displays Client Name and Tax Code (`legalId`).
    -   **Creator**: Sales Person (`salePerson` or `--`).
    -   **Status**: `orderStatus` badge (Pending/Processing/Completed/Cancelled).
    -   **Payment**: `paymentStatus` badge (Unpaid/Partial/Paid/Debt).
    -   **Financials**: Total Amount, Commission %.
    -   **Date**: Creation date.
-   **Actions**:
    -   **Edit**: Opens `AccountingDetailModal` to update status/transactions.
    -   **Invoice**: Opens `InvoiceModal` to generate an invoice.

### `AccountingDetailModal.tsx`

**Purpose**: A modal for editing Order details specific to accounting.

**Features**:

-   **Client & Invoice Info**: Read-only view of client's basic and tax information.
-   **Sample Analysis & Pricing**: Detailed read-only list of samples, parameters, and their fees.
-   **Status Management**: Update `orderStatus` and `paymentStatus`.
-   **Transaction History**: View and Edit the list of payments/transactions (`transactions` JSONB array).
    -   Fields: Amount, Date, Method, Note.
-   **Persistence**: Saves changes back to the API via `updateOrder`.

### `InvoiceModal.tsx`

**Purpose**: A confirmation modal for generating an invoice.
**Logic**: Displays a summary of the order (Client Tax Info, Totals) before confirming the invoice creation action.

### `AccountingStats.tsx`

**Purpose**: Displays summary cards for:

-   Pending Orders count.
-   Completed Orders count.
-   Total Pending Value.

---

## Data Schema Reference

The Accounting module primarily interacts with the `orders` table.

### `orders` Table Structure

| Column Name                    | Type      | Key    | Description                                                          |
| :----------------------------- | :-------- | :----- | :------------------------------------------------------------------- |
| `orderId`                      | `text`    | **PK** | Custom Text ID.                                                      |
| `quoteId`                      | `text`    | **FK** | Reference to source quote.                                           |
| `clientId`                     | `text`    | **FK** | Client ID.                                                           |
| `client`                       | `jsonb`   |        | Client Snapshot.                                                     |
| `contactPerson`                | `jsonb`   |        | Contact Person Snapshot.                                             |
| `salePersonId`                 | `text`    |        | Staff ID of creator/sales.                                           |
| `salePerson`                   | `text`    |        | Name of creator/sales.                                               |
| `saleCommissionPercent`        | `numeric` |        | Sales Commission %.                                                  |
| `samples`                      | `jsonb[]` |        | Sample Details: `[{ sampleName, sampleTypeName, analyses: [...] }]`. |
| `totalAmount`                  | `numeric` |        | Final Contract Value.                                                |
| `totalFeeBeforeTax`            | `numeric` |        | Subtotal (after discount, before tax).                               |
| `totalFeeBeforeTaxAndDiscount` | `numeric` |        | Gross Total.                                                         |
| `totalTaxValue`                | `numeric` |        | VAT Amount.                                                          |
| `totalDiscountValue`           | `numeric` |        | Discount Amount.                                                     |
| `orderStatus`                  | `text`    |        | `Pending`, `Processing`, `Completed`, `Cancelled`.                   |
| `taxRate`                      | `numeric` |        | VAT Rate (%).                                                        |
| `discountRate`                 | `numeric` |        | Discount (Amount or %).                                              |
| `paymentStatus`                | `text`    |        | `Unpaid`, `Partial`, `Paid`, `Debt`.                                 |
| `transactions`                 | `jsonb[]` |        | Payment History: `[{ amount, date, method, note }]`.                 |

### `parameterGroups` Table Structure

| Column Name               | Type      | Key    | Description                    |
| :------------------------ | :-------- | :----- | :----------------------------- |
| `groupId`                 | `text`    | **PK** | Custom Text ID.                |
| `groupName`               | `text`    |        | Tên nhóm chỉ tiêu.             |
| `matrixIds`               | `text[]`  |        | Danh sách matrixId.            |
| `sampleTypeId`            | `text`    | **FK** | Loại sản phẩm.                 |
| `feeBeforeTaxAndDiscount` | `numeric` |        | Giá trước giảm giá.            |
| `discountRate`            | `numeric` |        | Giảm giá (%).                  |
| `feeBeforeTax`            | `numeric` |        | Giá sau giảm giá (Trước thuế). |
| `taxRate`                 | `numeric` |        | Thuế suất (%).                 |
| `feeAfterTax`             | `numeric` |        | Giá sau thuế.                  |
