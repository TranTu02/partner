# API Documentation

## Overview

This document outlines the API endpoints used in the LIMS Multi-Lab SaaS Platform (Partner / Frontend).

### Standard Response Format

All responses strictly follow this JSON structure:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },     // Business Data (Object or Array)
  "meta": {            // Metadata (Pagination, etc.) - Optional
    "page": 1,
    "itemsPerPage": 10,
    "total": 100,
    "totalPages": 10
  },
  "error": null        // Error object if success is false
}
```

### Common Query Parameters (For List APIs)

For any endpoint ending in `/get/list`, the following standard query parameters apply:

| Parameter      | Type     | Default | Description                                     |
| :------------- | :------- | :------ | :---------------------------------------------- |
| `page`         | `number` | `1`     | The page number to retrieve (1-indexed).        |
| `itemsPerPage` | `number` | `10`    | Number of items per page.                       |
| `sortBy`       | `string` | `null`  | Field to sort by (e.g., `createdAt:desc`).      |
| `search`       | `string` | `null`  | General search keyword (matches name, code...). |

---

## 1. Authentication

#### **POST /v1/auth/login**

-   **Description**: Login to the system.
-   **Input**:
    -   Body: `{ "username": "admin", "password": "password" }`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "token": "eyJhbGciOiJIUzI1...",
        "user": {
            "id": "USR-001",
            "username": "admin",
            "fullName": "System Administrator",
            "role": "ADMIN"
        }
    },
    "meta": null,
    "error": null
}
```

#### **POST /v1/auth/logout**

-   **Description**: Logout from the system.
-   **Input**: `{}`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "message": "Logged out successfully"
    },
    "error": null
}
```

#### **POST /v1/auth/check-status**

-   **Description**: Check the status of a session token.
-   **Input**:
    -   Body: `{ "sessionId": "UUID" }`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "sessionId": "...",
        "identityId": "...",
        "sessionStatus": "active",
        "createdAt": "...",
        "sessionExpiry": "...",
        "identity": {
            "identityId": "...",
            "username": "..."
        }
    },
    "error": null
}
```

-   **Error Responses**:
    -   **404**: Session not found or Invalid session ID.
    -   **403**: Session expired.
    -   **500**: Session revoked or other internal server errors.

---

## 2. Client Management (`/v1/client`)

#### **GET /v1/client/get/list**

-   **Description**: Get a list of clients.
-   **Input**: `page=1&itemsPerPage=10&search=Company`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": [
        {
            "clientId": "CLI-2024-001",
            "clientName": "Cong Ty TNHH ABC",
            "address": "123 Street, City",
            "taxId": "0101234567",
            "totalOrders": 15,
            "totalRevenue": 150000000
        },
        {
            "clientId": "CLI-2024-002",
            "clientName": "Nguyen Van A",
            "address": "456 Avenue, City",
            "taxId": null,
            "totalOrders": 2,
            "totalRevenue": 5000000
        }
    ],
    "meta": {
        "page": 1,
        "itemsPerPage": 10,
        "total": 50,
        "totalPages": 5
    },
    "error": null
}
```

#### **POST /v1/client/create**

-   **Description**: Create a new client.
-   **Input**:
    -   Body:
    ```json
    {
        "clientName": "New Company Ltd",
        "address": "789 Road",
        "taxId": "0987654321",
        "contact": [{ "name": "Mr. B", "phone": "0909000111", "email": "b@new.com" }]
    }
    ```
-   **Output**:

```json
{
    "success": true,
    "statusCode": 201,
    "data": {
        "clientId": "CLI-2024-003",
        "clientName": "New Company Ltd",
        "address": "789 Road",
        "createdAt": "2024-01-01T10:00:00Z"
    },
    "error": null
}
```

#### **GET /v1/client/get/detail**

-   **Description**: Get client details, including related FKs (contacts, etc.).
-   **Input**: `clientId=CLI-2024-001`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "clientId": "CLI-2024-001",
        "clientName": "Cong Ty TNHH ABC",
        "address": "123 Street, City",
        "taxId": "0101234567",
        "contacts": [{ "name": "Ms. Manager", "phone": "0912345678", "email": "manager@abc.com", "position": "Director" }],
        "invoiceInfo": {
            "companyName": "Cong Ty TNHH ABC",
            "taxId": "0101234567",
            "address": "123 Street, City"
        },
        "audit": {
            "createdAt": "2023-01-01T00:00:00Z",
            "createdBy": "admin"
        }
    },
    "error": null
}
```

#### **POST /v1/client/edit**

-   **Description**: Update an existing client.
-   **Input**: Body includes `clientId` and fields to update.
-   **Output**: Returns updated client object in `data`.

#### **POST /v1/client/delete**

-   **Description**: Delete a client (Soft delete).
-   **Input**: Body `{ "clientId": "CLI-2024-001" }`
-   **Output**: `{ "success": true, ... }`

---

## 3. Order Management (`/v1/order`)

#### **GET /v1/order/get/list**

-   **Description**: Get a list of orders.
-   **Input**: `page=1&itemsPerPage=20&status=Pending`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": [
        {
            "orderId": "ORD-20240101-01",
            "client": { "clientId": "CLI-001", "clientName": "ABC Corp" },
            "totalAmount": 5000000,
            "orderStatus": "Pending",
            "paymentStatus": "Unpaid",
            "createdAt": "2024-01-01T08:30:00Z"
        }
    ],
    "meta": {
        "page": 1,
        "itemsPerPage": 20,
        "total": 1,
        "totalPages": 1
    },
    "error": null
}
```

#### **GET /v1/order/get/detail**

-   **Description**: Get full order details including samples.
-   **Input**: `orderId=ORD-20240101-01`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "orderId": "ORD-20240101-01",
        "client": {
            "clientId": "CLI-001",
            "clientName": "ABC Corp",
            "address": "..."
        },
        "samples": [
            {
                "sampleId": "SMP-001",
                "sampleName": "Mau Nuoc Thai",
                "sampleMatrix": "Wastewater",
                "analyses": [{ "parameterName": "pH", "method": "TCVN 6492:2011", "price": 50000 }]
            }
        ],
        "pricing": {
            "subtotal": 5000000,
            "tax": 400000,
            "total": 5400000
        },
        "orderStatus": "Pending",
        "createdAt": "2024-01-01T08:30:00Z"
    },
    "error": null
}
```

#### **POST /v1/order/create**

-   **Description**: Create a new order.
-   **Input**:
    ```json
    {
      "clientId": "CLI-001",
      "samples": [ ... ],
      "note": "Urgent"
    }
    ```
-   **Output**: Created Order object.

#### **POST /v1/order/edit**

-   **Description**: Update order (e.g., status change).
-   **Input**: `{ "orderId": "ORD-...", "orderStatus": "Processing" }`
-   **Output**: Updated Order object.

---

## 4. Quote Management (`/v1/quote`)

#### **GET /v1/quote/get/list**

-   **Description**: Get a list of quotes.
-   **Input**: `page=1&itemsPerPage=20&status=Sent`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": [
        {
            "quoteId": "QT-2024-001",
            "quoteCode": "QT2401-001",
            "client": { "clientId": "CLI-001", "clientName": "ABC Corp" },
            "totalAmount": 5500000,
            "quoteStatus": "Sent",
            "createdAt": "2024-01-01T08:00:00Z"
        }
    ],
    "meta": { "page": 1, "itemsPerPage": 20, "total": 5, "totalPages": 1 },
    "error": null
}
```

#### **GET /v1/quote/get/detail**

-   **Description**: Get quote details.
-   **Input**: `quoteId=QT-2024-001`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "quoteId": "QT-2024-001",
        "quoteCode": "QT2401-001",
        "client": { "clientId": "CLI-001", "clientName": "ABC Corp" },
        "samples": [
            {
                "sampleName": "Water Sample",
                "analyses": [{ "matrixId": "MAT-001", "parameterName": "pH", "price": 50000 }]
            }
        ],
        "totalAmount": 5500000,
        "quoteStatus": "Sent"
    },
    "error": null
}
```

#### **POST /v1/quote/create**

-   **Description**: Create a new quote.
-   **Input**: Body `{ "clientId": "...", "samples": [...] }`
-   **Output**: Created Quote Object.

#### **POST /v1/quote/edit**

-   **Description**: Update a quote.
-   **Input**: Body `{ "quoteId": "QT-...", ... }`
-   **Output**: Updated Quote Object.

#### **POST /v1/quote/delete**

-   **Description**: Delete a quote.
-   **Input**: Body `{ "quoteId": "QT-..." }`
-   **Output**: Success message.

---

## 5. Parameter Management (`/v1/parameter`)

#### **GET /v1/parameter/get/list**

-   **Description**: Get list of parameters (Analytes).
-   **Input**: `page=1&itemsPerPage=50`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": [
        {
            "parameterId": "PAR-001",
            "parameterName": "pH",
            "displayStyle": { "decimal": 2 }
        }
    ],
    "meta": { "page": 1, "itemsPerPage": 50, "total": 100, "totalPages": 2 },
    "error": null
}
```

#### **GET /v1/parameter/get/detail**

-   **Description**: Get parameter details.
-   **Input**: `parameterId=PAR-001`
-   **Output**: Detailed Parameter object.

#### **POST /v1/parameter/create**

-   **Description**: Create parameter.
-   **Input**: Body `{ "parameterName": "..." }`
-   **Output**: Created Parameter.

#### **POST /v1/parameter/edit**

-   **Description**: Update parameter.
-   **Input**: Body `{ "parameterId": "PAR-001", ... }`
-   **Output**: Updated Parameter.

#### **POST /v1/parameter/delete**

-   **Description**: Delete parameter.
-   **Input**: Body `{ "parameterId": "PAR-001" }`
-   **Output**: Success message.

---

## 6. Matrix Management (`/v1/matrix`)

#### **GET /v1/matrix/get/list**

-   **Description**: Get list of matrix configurations (Price/Method).
-   **Input**: `page=1&itemsPerPage=50`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": [
        {
            "matrixId": "MAT-001",
            "parameterName": "pH",
            "sampleTypeName": "Water",
            "feeBeforeTax": 50000,
            "protocolCode": "TCVN 6492:2011"
        }
    ],
    "meta": { "page": 1, "itemsPerPage": 50, "total": 200, "totalPages": 4 },
    "error": null
}
```

#### **GET /v1/matrix/get/detail**

-   **Description**: Get matrix details.
-   **Input**: `matrixId=MAT-001`
-   **Output**: Detailed Matrix object.

#### **POST /v1/matrix/create**

-   **Description**: Create matrix config.
-   **Input**: Body `{ "parameterId": "...", "protocolId": "...", "price": 50000 }`
-   **Output**: Created Matrix.

#### **POST /v1/matrix/edit**

-   **Description**: Update matrix.
-   **Input**: Body `{ "matrixId": "MAT-001", ... }`
-   **Output**: Updated Matrix.

#### **POST /v1/matrix/delete**

-   **Description**: Delete matrix.
-   **Input**: Body `{ "matrixId": "MAT-001" }`
-   **Output**: Success message.

---

## 7. Sample Type Management (`/v1/sample-type`)

#### **GET /v1/sample-type/get/list**

-   **Description**: Get list of sample types.
-   **Input**: `page=1`
-   **Output**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": [
        {
            "sampleTypeId": "ST-001",
            "sampleTypeName": "Wastewater"
        }
    ],
    "meta": { "page": 1, "itemsPerPage": 100, "total": 10, "totalPages": 1 },
    "error": null
}
```

#### **GET /v1/sample-type/get/detail**

-   **Description**: Get sample type details.
-   **Input**: `sampleTypeId=ST-001`
-   **Output**: Detailed SampleType object.

#### **POST /v1/sample-type/create**

-   **Description**: Create sample type.
-   **Input**: Body `{ "sampleTypeName": "..." }`
-   **Output**: Created SampleType.

#### **POST /v1/sample-type/edit**

-   **Description**: Update sample type.
-   **Input**: Body `{ "sampleTypeId": "ST-001", ... }`
-   **Output**: Updated SampleType.

#### **POST /v1/sample-type/delete**

-   **Description**: Delete sample type.
-   **Input**: Body `{ "sampleTypeId": "ST-001" }`
-   **Output**: Success message.
