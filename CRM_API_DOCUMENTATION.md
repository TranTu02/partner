# CRM MODULE - API DOCUMENTATION

This document provides detailed documentation for the CRM module API endpoints, including request methods, paths, query parameters, and **explicit JSON response structures** based on actual API test results.

## 1. Authentication

All API endpoints require a valid JWT token in the `Authorization` header.

**Header Format**:

```http
Authorization: Bearer {authToken}
```

**Login Response Example**:

```json
{
    "token": "SS_...",
    "identity": "Nguyễn Mai Quỳnh",
    "roles": ["ROLE_SUPER_ADMIN", "..."]
}
```

---

## 2. CLIENT APIs

### 2.1 Get Client List

**Endpoint**: `GET /v2/clients/get/list`

**Query Parameters**:

- `page` (number): Page number (default: 1)
- `itemsPerPage` (number): Items per page (default: 20)
- `search` (string): Optional search text
- `sortBy` (string): Sort direction "ASC" or "DESC" (default: "DESC")
- `sortColumn` (string): Column to sort by (default: "createdAt")
- `option` (string): Response mode, e.g., "detail", "full", "pkey" (default: "detail")

**Response Structure**:

```json
{
    "data": [
        {
            "entity": {
                "type": "staff"
            },
            "clientId": "CL_W5K45ADWBV",
            "clientName": "Công ty cp tập đoàn đầu tư phát triển NTT Việt Nam",
            "legalId": "0111228391",
            "clientAddress": "SỐ 18 NGHIÊM XUÂN YÊM, PHƯỜNG THANH LIỆT, THÀNH PHỐ HÀ NỘI, VIỆT NAM",
            "clientPhone": "0984005086",
            "clientEmail": "CongtytapdoanNTT@gmail.com",
            "clientSaleScope": "private",
            "availableByIds": ["IDx4aee3"],
            "availableByName": ["Trần Thị Vân"],
            "clientContacts": [
                {
                    "contactId": "",
                    "identityId": "IDx4aee3",
                    "contactName": "Hà",
                    "contactEmail": "dothiha.ntt@gmail.com",
                    "contactPhone": "0396315593",
                    "contactAddress": "SỐ 18 NGHIÊM XUÂN YÊM, PHƯỜNG THANH LIỆT, THÀNH PHỐ HÀ NỘI, VIỆT NAM"
                }
            ],
            "invoiceInfo": {
                "taxCode": "0111228391",
                "taxName": "Công ty cp tập đoàn đầu tư phát triển NTT",
                "taxEmail": "congtytapdoanntt@gmail.com",
                "taxAddress": "SỐ 18 NGHIÊM XUÂN YÊM, PHƯỜNG THANH LIỆT, THÀNH PHỐ HÀ NỘI, VIỆT NAM"
            },
            "totalOrderAmount": 0,
            "createdAt": "2026-02-12T10:31:11.126Z",
            "modifiedAt": "2026-02-12T10:31:11.126Z"
        }
    ],
    "pagination": {
        "page": 1,
        "itemsPerPage": 20,
        "totalItems": 3481,
        "totalPages": 175
    }
}
```

### 2.2 Get Client Detail

**Endpoint**: `GET /v2/clients/get/detail?id={clientId}`

**Response Structure**:

```json
{
    "entity": {
        "type": "staff"
    },
    "availableByIds": ["IDx4aee3"],
    "clientId": "CL_W5K45ADWBV",
    "clientName": "Công ty cp tập đoàn đầu tư phát triển NTT Việt Nam",
    "clientEmail": "CongtytapdoanNTT@gmail.com",
    "clientSaleScope": "private",
    "availableByName": ["Trần Thị Vân"],
    "clientContacts": [
        {
            "contactId": "",
            "identityId": "IDx4aee3",
            "contactName": "Hà",
            "contactEmail": "dothiha.ntt@gmail.com",
            "contactPhone": "0396315593",
            "contactAddress": "SỐ 18 NGHIÊM XUÂN YÊM, PHƯỜNG THANH LIỆT, THÀNH PHỐ HÀ NỘI, VIỆT NAM"
        }
    ],
    "invoiceInfo": {
        "taxCode": "0111228391",
        "taxName": "Công ty cp tập đoàn đầu tư phát triển NTT",
        "taxEmail": "congtytapdoanntt@gmail.com",
        "taxAddress": "SỐ 18 NGHIÊM XUÂN YÊM, PHƯỜNG THANH LIỆT, THÀNH PHỐ HÀ NỘI, VIỆT NAM"
    },
    "legalId": "0111228391",
    "clientAddress": "SỐ 18 NGHIÊM XUÂN YÊM, PHƯỜNG THANH LIỆT, THÀNH PHỐ HÀ NỘI, VIỆT NAM",
    "clientPhone": "0984005086",
    "totalOrderAmount": 0,
    "createdAt": "2026-02-12T10:31:11.126Z",
    "modifiedAt": "2026-02-12T10:31:11.126Z"
}
```

### 2.3 Create Client

**Endpoint**: `POST /v2/clients/create`

**Description**: Creates a new client.

**Request Body Example**:

```json
{
    "clientName": "Tên công ty mới",
    "clientEmail": "email@congty.com",
    "clientPhone": "0123456789",
    "clientAddress": "Địa chỉ...",
    "legalId": "0123456789"
}
```

**Response Structure**: Returns the newly created client object.

### 2.4 Update Client

**Endpoint**: `POST /v2/clients/update`

**Description**: Updates an existing client.

**Request Body Example**:

```json
{
    "clientId": "CL_W5K45ADWBV",
    "clientName": "Công ty TNHH cập nhật"
}
```

**Response Structure**: Returns the updated client object.

---

## 3. ORDER APIs

### 3.1 Get Order List

**Endpoint**: `GET /v2/orders/get/list`

**Query Parameters**:

- `page` (number): Page number
- `itemsPerPage` (number): Items per page
- `search` (string): Search text
- `sortDirection` (string): Sort direction "ASC" or "DESC" (default: "DESC")
- `sortColumn` (string): Column to sort by
- `filterFrom` / `filterValue`: Filter by specific column

**Response Structure**:

```json
{
    "data": [
        {
            "entity": {
                "type": "staff"
            },
            "orderId": "DH26D0370",
            "quoteId": "",
            "clientId": "KH8526560974",
            "client": {
                "legalId": "0108335146",
                "clientId": "KH8526560974",
                "clientName": "CÔNG TY CỔ PHẦN GENA THÁI BÌNH DƯƠNG",
                "clientEmail": "genapacific@genapacific.com",
                "clientPhone": "0823736660",
                "invoiceInfo": {
                    "taxCode": "0108335146",
                    "taxName": "CÔNG TY CỔ PHẦN GENA THÁI BÌNH DƯƠNG",
                    "taxEmail": "genapacific@genapacific.com",
                    "taxAddress": "Số 3 Nguyễn Khắc Nhu, P.Trúc Bạch, Q. Ba Đình, Tp. Hà Nội, Việt Nam."
                },
                "clientAddress": "Số 3 Nguyễn Khắc Nhu, P.Trúc Bạch, Q. Ba Đình, Tp. Hà Nội, Việt Nam."
            },
            "salePerson": "Đỗ Thị Hồng",
            "samples": [
                {
                    "analyses": [
                        {
                            "id": "temp-analysis-1770954221500-cqvr5ghf4bh-0",
                            "parameterName": "Cảm quan",
                            "parameterPrice": 40000,
                            "feeBeforeTax": 40000,
                            "feeAfterTax": 42000,
                            "taxRate": 5,
                            "quantity": 1
                        }
                    ],
                    "sampleName": "Bông tẩy trang",
                    "sampleMatrix": "Water"
                }
            ],
            "totalAmount": 3621450,
            "orderStatus": "pending",
            "paymentStatus": "Unpaid",
            "createdAt": "2026-02-13T03:43:44.213Z",
            "modifiedAt": "2026-02-13T03:43:44.213Z",
            "contactPerson": {
                "contactName": "Trần Mai",
                "contactEmail": "genapacific@genapacific.com",
                "contactPhone": "0823736660"
            },
            "salePersonId": "IDx99363",
            "totalFeeBeforeTax": 3449000,
            "totalTaxValue": 172450,
            "totalDiscountValue": 0,
            "discountRate": 0
        }
    ],
    "pagination": {
        "page": 1,
        "itemsPerPage": 20,
        "totalItems": 7447,
        "totalPages": 373
    }
}
```

### 3.2 Get Order Detail

**Endpoint**: `GET /v2/orders/get/detail?id={orderId}`

**Response Structure**:

```json
{
    "entity": {
        "type": "staff"
    },
    "orderId": "DH26D0370",
    "quoteId": "",
    "clientId": "KH8526560974",
    "client": {
        "legalId": "0108335146",
        "clientId": "KH8526560974",
        "clientName": "CÔNG TY CỔ PHẦN GENA THÁI BÌNH DƯƠNG",
        "clientEmail": "genapacific@genapacific.com",
        "clientPhone": "0823736660",
        "invoiceInfo": {
            "taxCode": "0108335146",
            "taxName": "CÔNG TY CỔ PHẦN GENA THÁI BÌNH DƯƠNG",
            "taxEmail": "genapacific@genapacific.com",
            "taxAddress": "Số 3 Nguyễn Khắc Nhu, P.Trúc Bạch, Q. Ba Đình, Tp. Hà Nội, Việt Nam."
        },
        "clientAddress": "Số 3 Nguyễn Khắc Nhu, P.Trúc Bạch, Q. Ba Đình, Tp. Hà Nội, Việt Nam."
    },
    "salePerson": "Đỗ Thị Hồng",
    "samples": [
        {
            "analyses": [
                {
                    "id": "temp-analysis-1770954221500-cqvr5ghf4bh-0",
                    "parameterName": "Cảm quan",
                    "parameterPrice": 40000,
                    "feeBeforeTax": 40000,
                    "feeAfterTax": 42000,
                    "taxRate": 5,
                    "quantity": 1
                }
            ],
            "sampleName": "Bông tẩy trang",
            "sampleMatrix": "Water"
        }
    ],
    "totalAmount": 3621450,
    "orderStatus": "pending",
    "paymentStatus": "Unpaid",
    "createdAt": "2026-02-13T03:43:44.213Z",
    "modifiedAt": "2026-02-13T03:43:44.213Z",
    "contactPerson": {
        "contactName": "Trần Mai",
        "contactEmail": "genapacific@genapacific.com",
        "contactPhone": "0823736660"
    },
    "salePersonId": "IDx99363",
    "totalFeeBeforeTax": 3449000,
    "totalTaxValue": 172450,
    "totalDiscountValue": 0,
    "discountRate": 0
}
```

### 3.3 Get Order Statistics

**Endpoint**: `GET /v2/orders/get/stats`

**Description**: Retrieves key accounting metrics including the number of unpaid or problem orders, and orders awaiting invoice export.

**Response Structure**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "waitingExportInvoiceCount": 12,
        "paymentProblemOrderCount": 3,
        "totalPaymentDifferenceAmount": -5000000
    },
    "pagination": null,
    "meta": null,
    "error": null
}
```

### 3.4 Create Order

**Endpoint**: `POST /v2/orders/create`

**Description**: Creates a new order.

**Request Body Example**:

```json
{
    "clientId": "KH8526560974",
    "samples": [...],
    "totalAmount": 1000000
}
```

**Response Structure**: Returns the newly created order object.

### 3.5 Update Order

**Endpoint**: `POST /v2/orders/update`

**Description**: Updates an existing order.

**Request Body Example**:
```json
{
    "orderId": "DH26D0370",
    "orderStatus": "Processing",
    "totalPaid": 1000000
}
```

**Response Structure**: Returns the updated order object.

### 3.6 Generate Public URI

**Endpoint**: `POST /v2/orders/generate-uri` (or `POST /v1/order/generate-uri`)

**Description**: Generates a secure, encrypted public link for guest access (e.g., for Sample Request Form). Access expires after 7 days by default.

**Request Body**:
```json
{
    "orderId": "DH26D0370"
}
```

**Response Structure**:
```json
{
    "success": true,
    "data": {
        "uri": "SC_..."
    }
}
```

### 3.7 Check Public URI

**Endpoint**: `POST /v2/orders/check-uri` (or `POST /v1/order/check-uri`)

**Description**: Validates a public link and returns the associated order details. This endpoint does NOT require authentication.

**Request Body**:
```json
{
    "uri": "SC_...",
    "orderId": "DH26D0370" (optional validation)
}
```

**Response Structure**: Returns the `Order` object if valid.

---

## 4. QUOTE APIs

### 4.1 Get Quote List

**Endpoint**: `GET /v2/quotes/get/list`

**Query Parameters**:

- `page` (number): Page number
- `itemsPerPage` (number): Items per page
- `search` (string): Search text
- `sortDirection` (string): Sort direction "ASC" or "DESC" (default: "DESC")
- `sortColumn` (string): Column to sort by
- `filterFrom` / `filterValue`: Filter by specific column

**Response Structure**:

```json
{
    "data": [
        {
            "entity": {
                "type": "staff"
            },
            "quoteId": "BG26D0000280",
            "clientId": "KH8526561357",
            "client": {
                "legalId": "0108362319",
                "clientId": "KH8526561357",
                "clientName": "CÔNG TY TNHH DƯỢC PHẨM VÀ DƯỢC LIỆU ORGANIC",
                "clientEmail": "hanhpharmacy87@gmail.com",
                "clientPhone": "02432568888",
                "invoiceInfo": {
                    "taxCode": "0108362319",
                    "taxName": "CÔNG TY TNHH DƯỢC PHẨM VÀ DƯỢC LIỆU ORGANIC",
                    "taxEmail": "hanhpharmacy87@gmail.com",
                    "taxAddress": "hanhpharmacy87@gmail.com"
                },
                "clientAddress": "Số 24, phố Linh Lang, Phường Ngọc Hà, TP Hà Nội, Việt Nam"
            },
            "contactPerson": {
                "identityId": "",
                "contactName": "Ms.Hạnh",
                "contactEmail": "hanhpharmacy87@gmail.com",
                "contactPhone": "0948486006",
                "contactAddress": ""
            },
            "salePersonId": "IDx99363",
            "salePerson": "Đỗ Thị Hồng",
            "samples": [
                {
                    "analyses": [
                        {
                            "parameterName": "Định tính Húng chanh",
                            "parameterPrice": 750000,
                            "feeBeforeTax": 750000,
                            "feeAfterTax": 787500,
                            "taxRate": 5,
                            "quantity": 1
                        }
                    ],
                    "quantity": 1,
                    "sampleName": "Thực phẩm bảo vệ sức khỏe VIÊN NGẬM CRGANIC100"
                }
            ],
            "totalAmount": "28990500",
            "totalFeeBeforeTax": "27610000",
            "totalFeeBeforeTaxAndDiscount": "27610000",
            "totalTaxValue": "1380500",
            "totalDiscountValue": "0",
            "discountRate": "0",
            "quoteStatus": "draft",
            "createdAt": "2026-02-13T03:29:22.682Z",
            "modifiedAt": "2026-02-13T03:29:22.682Z"
        }
    ],
    "pagination": {
        "page": 1,
        "itemsPerPage": 20,
        "totalItems": 970,
        "totalPages": 49
    }
}
```

### 4.2 Get Quote Detail

**Endpoint**: `GET /v2/quotes/get/detail?id={quoteId}`

**Response Structure**:

```json
{
    "entity": {
        "type": "staff"
    },
    "quoteId": "BG26D0000280",
    "clientId": "KH8526561357",
    "client": {
        "legalId": "0108362319",
        "clientId": "KH8526561357",
        "clientName": "CÔNG TY TNHH DƯỢC PHẨM VÀ DƯỢC LIỆU ORGANIC",
        "clientEmail": "hanhpharmacy87@gmail.com",
        "clientPhone": "02432568888",
        "invoiceInfo": {
            "taxCode": "0108362319",
            "taxName": "CÔNG TY TNHH DƯỢC PHẨM VÀ DƯỢC LIỆU ORGANIC",
            "taxEmail": "hanhpharmacy87@gmail.com",
            "taxAddress": "hanhpharmacy87@gmail.com"
        },
        "clientAddress": "Số 24, phố Linh Lang, Phường Ngọc Hà, TP Hà Nội, Việt Nam"
    },
    "salePersonId": "IDx99363",
    "salePerson": "Đỗ Thị Hồng",
    "totalFeeBeforeTax": 27610000,
    "discountRate": 0,
    "quoteStatus": "draft",
    "contactPerson": {
        "identityId": "",
        "contactName": "Ms.Hạnh",
        "contactEmail": "hanhpharmacy87@gmail.com",
        "contactPhone": "0948486006",
        "contactAddress": ""
    },
    "samples": [
        {
            "analyses": [
                {
                    "parameterName": "Định tính Húng chanh",
                    "parameterPrice": 750000,
                    "feeBeforeTax": 750000,
                    "feeAfterTax": 787500
                }
            ],
            "quantity": 1,
            "sampleName": "Thực phẩm bảo vệ sức khỏe VIÊN NGẬM CRGANIC100"
        }
    ],
    "totalAmount": 28990500,
    "createdAt": "2026-02-13T03:29:22.682Z",
    "modifiedAt": "2026-02-13T03:29:22.682Z"
}
```

### 4.3 Create Quote

**Endpoint**: `POST /v2/quotes/create?option=full`

**Description**: Creates a new quote. Can add `?option=full` (if supported) to create a full quote hierarchy.

**Request Body Example**:
```json
{
    "clientId": "KH8526561357",
    "totalAmount": 500000,
    "quoteStatus": "draft"
}
```

**Response Structure**: Returns the newly created quote object.

### 4.4 Update Quote

**Endpoint**: `POST /v2/quotes/update`

**Description**: Updates an existing quote.

**Request Body Example**:
```json
{
    "quoteId": "BG26D0000280",
    "quoteStatus": "sent"
}
```

**Response Structure**: Returns the updated quote object.
