# LIBRARY MODULE - API DOCUMENTATION

This document provides detailed documentation for the LIBRARY module API endpoints, including request methods, paths, query parameters, and **explicit JSON response structures** based on actual API test results.

## 1. Authentication

All API endpoints require a valid JWT token in the `Authorization` header.

**Header Format**:

```http
Authorization: Bearer {authToken}
```

**Login Response Example**:

```json
{
    "token": "SS_c6113d75-25ce-4575-a0b3-e6b64c9a2512",
    "identity": "Nguyễn Văn An",
    "roles": [
        "ROLE_SUPER_ADMIN",
        "ROLE_DOC_CONTROLLER",
        "ROLE_DIRECTOR",
        "ROLE_TECH_MANAGER",
        "ROLE_QA_MANAGER",
        "ROLE_SECTION_HEAD",
        "ROLE_VALIDATOR",
        "ROLE_SENIOR_ANALYST",
        "ROLE_TECHNICIAN",
        "ROLE_RECEPTIONIST",
        "ROLE_SAMPLE_CUSTODIAN",
        "ROLE_EQUIPMENT_MGR",
        "ROLE_INVENTORY_MGR",
        "ROLE_SALES_MANAGER",
        "ROLE_SALES_EXEC",
        "ROLE_CS",
        "ROLE_ACCOUNTANT",
        "ROLE_REPORT_OFFICER"
    ]
}
```

---

## 2. PARAMETER APIs (Chỉ tiêu)

### 2.1 Get Parameter List

**Endpoint**: `GET /v2/parameters/get/list`

**Query Parameters**:

- `page` (number): Page number
- `itemsPerPage` (number): Items per page
- `searchTerm` (string): Search text

**Response Structure**:

```json
{
    "data": [
        {
            "parameterId": "PM000001",
            "parameterName": "Enterococcus faecalis",
            "displayStyle": {
                "eng": "*Enterococcus faecalis*",
                "default": "*Enterococcus faecalis*"
            },
            "technicianAlias": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null,
            "technicianGroupId": null,
            "parameterSearchKeys": null,
            "parameterStatus": "Active",
            "parameterNote": null
        }
    ],
    "pagination": {
        "page": 1,
        "itemsPerPage": 1,
        "totalItems": 478,
        "totalPages": 478
    }
}
```

### 2.2 Get Parameter Detail

**Endpoint**: `GET /v2/parameters/get/detail?parameterId={parameterId}`

**Response Structure**:

```json
{
    "parameterId": "PM000001",
    "parameterName": "Enterococcus faecalis",
    "displayStyle": {
        "eng": "*Enterococcus faecalis*",
        "default": "*Enterococcus faecalis*"
    },
    "createdAt": "2026-01-31T02:16:35.747Z",
    "parameterStatus": "Active"
}
```

### 2.3 Get Parameter Full

**Endpoint**: `GET /v2/parameters/get/full?parameterId={parameterId}`

**Response Structure**:

```json
{
    "parameterId": "PM000001",
    "parameterName": "Enterococcus faecalis",
    "displayStyle": {
        "eng": "*Enterococcus faecalis*",
        "default": "*Enterococcus faecalis*"
    },
    "createdAt": "2026-01-31T02:16:35.747Z",
    "parameterStatus": "Active",
    "matrices": [
        {
            "matrixId": "MAT000001",
            "parameterId": "PM000001",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0001",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Nước sản xuất.",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "1200000",
            "LOD": "0.349",
            "LOQ": "0.804",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000002",
            "parameterId": "PM000001",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0002",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Nước sinh hoạt",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "500000",
            "LOD": "0.303",
            "LOQ": "1.874",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000003",
            "parameterId": "PM000001",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0003",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Nước uống",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "50000",
            "LOD": "0.331",
            "LOQ": "1.175",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000004",
            "parameterId": "PM000001",
            "protocolId": "PRO-0002",
            "sampleTypeId": "ST0004",
            "protocolCode": "Pro 6202 ML (TCVN 6189-2:2009 (ISO 7899-2:2000))",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Sản phẩm sữa bổ sung vi chất dinh dưỡng",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "1200000",
            "LOD": "0.193",
            "LOQ": "1.660",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000005",
            "parameterId": "PM000001",
            "protocolId": "PRO-0002",
            "sampleTypeId": "ST0005",
            "protocolCode": "Pro 6202 ML (TCVN 6189-2:2009 (ISO 7899-2:2000))",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Thức ăn chăn nuôi",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "50000",
            "LOD": "0.300",
            "LOQ": "0.660",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000006",
            "parameterId": "PM000001",
            "protocolId": "PRO-0002",
            "sampleTypeId": "ST0006",
            "protocolCode": "Pro 6202 ML (TCVN 6189-2:2009 (ISO 7899-2:2000))",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Thực phẩm",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "1200000",
            "LOD": "0.483",
            "LOQ": "0.717",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000007",
            "parameterId": "PM000001",
            "protocolId": "PRO-0002",
            "sampleTypeId": "ST0007",
            "protocolCode": "Pro 6202 ML (TCVN 6189-2:2009 (ISO 7899-2:2000))",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Thực phẩm bảo vệ sức khỏe",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "250000",
            "LOD": "0.284",
            "LOQ": "1.644",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000008",
            "parameterId": "PM000001",
            "protocolId": "PRO-0002",
            "sampleTypeId": "ST0008",
            "protocolCode": "Pro 6202 ML (TCVN 6189-2:2009 (ISO 7899-2:2000))",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Thực phẩm chức năng",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "1200000",
            "LOD": "0.197",
            "LOQ": "1.206",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        }
    ]
}
```

### 2.4 Create Parameter

**Endpoint**: `POST /v2/parameters/create`

**Request Body Example**:

```json
{
    "parameterName": "Enterococcus faecalis",
    "displayStyle": {
        "eng": "*Enterococcus faecalis*",
        "default": "*Enterococcus faecalis*"
    }
}
```

**Response Structure**: `201 Created` - Returns the newly created Parameter object.

### 2.5 Update Parameter

**Endpoint**: `POST /v2/parameters/update`

**Request Body Example**:

```json
{
    "parameterId": "PM000001",
    "parameterName": "Enterococcus faecalis (updated)"
}
```

**Response Structure**: `200 OK` - Returns the updated Parameter object.

### 2.6 Delete Parameter

**Endpoint**: `POST /v2/parameters/delete`

**Request Body Example**:

```json
{
    "parameterId": "PM000001"
}
```

**Response Structure**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "id": "PM000001",
        "status": "Deleted"
    },
    "meta": null,
    "error": null
}
```

---

## 3. PROTOCOL APIs (Quy trình)

### 3.1 Get Protocol List

**Endpoint**: `GET /v2/protocols/get/list`

**Response Structure**:

```json
{
    "data": [
        {
            "protocolId": "PRO-0001",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": "IRDOP",
            "protocolAccreditation": {
                "TDC": true,
                "VILAS997": false
            },
            "createdAt": "2026-01-31T02:16:35.747Z"
        }
    ],
    "pagination": {
        "page": 1,
        "itemsPerPage": 1,
        "totalItems": 452,
        "totalPages": 452
    }
}
```

### 3.2 Get Protocol Detail

**Endpoint**: `GET /v2/protocols/get/detail?protocolId={protocolId}`

**Response Structure**:

```json
{
    "protocolId": "PRO-0001",
    "protocolCode": "TCVN 6189-2:1996",
    "protocolSource": "IRDOP",
    "protocolAccreditation": {
        "TDC": true,
        "VILAS997": false
    },
    "createdAt": "2026-01-31T02:16:35.747Z"
}
```

### 3.3 Get Protocol Full

**Endpoint**: `GET /v2/protocols/get/full?protocolId={protocolId}`

**Response Structure**:

```json
{
    "protocolId": "PRO-0001",
    "protocolCode": "TCVN 6189-2:1996",
    "protocolSource": "IRDOP",
    "protocolAccreditation": {
        "TDC": true,
        "VILAS997": false
    },
    "createdAt": "2026-01-31T02:16:35.747Z",
    "matrices": [
        {
            "matrixId": "MAT000001",
            "parameterId": "PM000001",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0001",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Nước sản xuất.",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "1200000",
            "LOD": "0.349",
            "LOQ": "0.804",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000002",
            "parameterId": "PM000001",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0002",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Nước sinh hoạt",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "500000",
            "LOD": "0.303",
            "LOQ": "1.874",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000003",
            "parameterId": "PM000001",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0003",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Nước uống",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "50000",
            "LOD": "0.331",
            "LOQ": "1.175",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000949",
            "parameterId": "PM000224",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0001",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Tổng số vi khuẩn khử sulfit (kỵ khí)",
            "sampleTypeName": "Nước sản xuất.",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "500000",
            "LOD": "0.446",
            "LOQ": "1.599",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000950",
            "parameterId": "PM000224",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0002",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Tổng số vi khuẩn khử sulfit (kỵ khí)",
            "sampleTypeName": "Nước sinh hoạt",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "100000",
            "LOD": "0.410",
            "LOQ": "0.896",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        },
        {
            "matrixId": "MAT000951",
            "parameterId": "PM000224",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0003",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Tổng số vi khuẩn khử sulfit (kỵ khí)",
            "sampleTypeName": "Nước uống",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "100000",
            "LOD": "0.158",
            "LOQ": "1.409",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        }
    ]
}
```

### 3.4 Create Protocol

**Endpoint**: `POST /v2/protocols/create`

**Request Body Example**:

```json
{
    "protocolCode": "TCVN 6189-2:1996",
    "protocolSource": "IRDOP"
}
```

**Response Structure**: `201 Created` - Returns the newly created Protocol object.

### 3.5 Update Protocol

**Endpoint**: `POST /v2/protocols/update`

**Request Body Example**:

```json
{
    "protocolId": "PRO-0001",
    "protocolSource": "Updated Source"
}
```

**Response Structure**: `200 OK` - Returns the updated Protocol object.

### 3.6 Delete Protocol

**Endpoint**: `POST /v2/protocols/delete`

**Request Body Example**:

```json
{
    "protocolId": "PRO-0001"
}
```

**Response Structure**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "id": "PRO-0001",
        "status": "Deleted"
    },
    "meta": null,
    "error": null
}
```

---

## 4. MATRIX APIs (Nền mẫu)

### 4.1 Get Matrix List

**Endpoint**: `GET /v2/matrices/get/list`

**Response Structure**:

```json
{
    "data": [
        {
            "matrixId": "MAT000001",
            "parameterId": "PM000001",
            "protocolId": "PRO-0001",
            "sampleTypeId": "ST0001",
            "protocolCode": "TCVN 6189-2:1996",
            "protocolSource": null,
            "protocolAccreditation": null,
            "parameterName": "Enterococcus faecalis",
            "sampleTypeName": "Nước sản xuất.",
            "feeBeforeTax": null,
            "taxRate": null,
            "feeAfterTax": "1200000",
            "LOD": "0.349",
            "LOQ": "0.804",
            "thresholdLimit": null,
            "turnaroundTime": null,
            "technicianGroupId": null,
            "createdAt": "2026-01-31T02:16:35.747Z",
            "createdById": null,
            "modifiedAt": null,
            "modifiedById": null,
            "deletedAt": null
        }
    ],
    "pagination": {
        "page": 1,
        "itemsPerPage": 1,
        "totalItems": 1936,
        "totalPages": 1936
    }
}
```

### 4.2 Get Matrix Detail

**Endpoint**: `GET /v2/matrices/get/detail?matrixId={matrixId}`

**Response Structure**:

```json
{
    "matrixId": "MAT000001",
    "parameterId": "PM000001",
    "protocolId": "PRO-0001",
    "sampleTypeId": "ST0001",
    "protocolCode": "TCVN 6189-2:1996",
    "protocolSource": null,
    "protocolAccreditation": null,
    "parameterName": "Enterococcus faecalis",
    "sampleTypeName": "Nước sản xuất.",
    "feeBeforeTax": null,
    "taxRate": null,
    "feeAfterTax": "1200000",
    "LOD": "0.349",
    "LOQ": "0.804",
    "thresholdLimit": null,
    "turnaroundTime": null,
    "technicianGroupId": null,
    "createdAt": "2026-01-31T02:16:35.747Z",
    "createdById": null,
    "modifiedAt": null,
    "modifiedById": null,
    "deletedAt": null
}
```

### 4.3 Get Matrix Full

**Endpoint**: `GET /v2/matrices/get/full?matrixId={matrixId}`

**Response Structure**:

```json
{
    "matrixId": "MAT000001",
    "parameterId": "PM000001",
    "protocolId": "PRO-0001",
    "sampleTypeId": "ST0001",
    "protocolCode": "TCVN 6189-2:1996",
    "protocolSource": null,
    "protocolAccreditation": null,
    "parameterName": "Enterococcus faecalis",
    "sampleTypeName": "Nước sản xuất.",
    "feeBeforeTax": null,
    "taxRate": null,
    "feeAfterTax": "1200000",
    "LOD": "0.349",
    "LOQ": "0.804",
    "thresholdLimit": null,
    "turnaroundTime": null,
    "technicianGroupId": null,
    "createdAt": "2026-01-31T02:16:35.747Z",
    "createdById": null,
    "modifiedAt": null,
    "modifiedById": null,
    "deletedAt": null,
    "protocol": {
        "protocolId": "PRO-0001",
        "protocolCode": "TCVN 6189-2:1996",
        "protocolSource": "IRDOP",
        "protocolAccreditation": {
            "TDC": true,
            "VILAS997": false
        },
        "createdAt": "2026-01-31T02:16:35.747Z"
    },
    "parameter": {
        "parameterId": "PM000001",
        "parameterName": "Enterococcus faecalis",
        "displayStyle": {
            "eng": "*Enterococcus faecalis*",
            "default": "*Enterococcus faecalis*"
        },
        "createdAt": "2026-01-31T02:16:35.747Z",
        "parameterStatus": "Active"
    },
    "sampleType": {
        "sampleTypeId": "ST0001",
        "sampleTypeName": "Nước sản xuất.",
        "displayTypeStyle": {
            "en": "Nước sản xuất.",
            "vi": "Nước sản xuất."
        },
        "createdAt": "2026-01-31T02:16:35.747Z"
    },
    "parameterGroup": null
}
```

### 4.4 Create Matrix

**Endpoint**: `POST /v2/matrices/create`

**Request Body Example**:

```json
{
    "parameterId": "PM000001",
    "protocolId": "PRO-0001",
    "sampleTypeId": "ST0001",
    "feeAfterTax": "1200000"
}
```

**Response Structure**: `201 Created` - Returns the newly created Matrix object.

### 4.4 Update Matrix

**Endpoint**: `POST /v2/matrices/update`

**Request Body Example**:

```json
{
    "matrixId": "MAT000001",
    "LOD": "0.5",
    "LOQ": "1.0"
}
```

**Response Structure**: `200 OK` - Returns the updated Matrix object.

### 4.5 Delete Matrix

**Endpoint**: `POST /v2/matrices/delete`

**Request Body Example**:

```json
{
    "matrixId": "MAT000001"
}
```

**Response Structure**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "id": "MAT000001",
        "status": "Deleted"
    },
    "meta": null,
    "error": null
}
```

---

## 5. SAMPLE TYPE APIs (Loại mẫu)

### 5.1 Get Sample Type List

**Endpoint**: `GET /v2/sample-types/get/list`

**Response Structure**:

```json
{
    "data": [
        {
            "sampleTypeId": "ST0001",
            "sampleTypeName": "Nước sản xuất.",
            "displayTypeStyle": {
                "en": "Nước sản xuất.",
                "vi": "Nước sản xuất."
            },
            "createdAt": "2026-01-31T02:16:35.747Z"
        }
    ],
    "pagination": {
        "page": 1,
        "itemsPerPage": 1,
        "totalItems": 140,
        "totalPages": 140
    }
}
```

### 5.2 Get Sample Type Detail

**Endpoint**: `GET /v2/sample-types/get/detail?sampleTypeId={sampleTypeId}`

**Response Structure**:

```json
{
    "sampleTypeId": "ST0001",
    "sampleTypeName": "Nước sản xuất.",
    "displayTypeStyle": {
        "en": "Nước sản xuất.",
        "vi": "Nước sản xuất."
    },
    "createdAt": "2026-01-31T02:16:35.747Z"
}
```

### 5.3 Get Sample Type Full

**Endpoint**: `GET /v2/sample-types/get/full?sampleTypeId={sampleTypeId}`

**Response Structure**:

```json
None
```

### 5.3 Create Sample Type

**Endpoint**: `POST /v2/sample-types/create`

**Request Body Example**:

```json
{
    "sampleTypeName": "Nước sản xuất.",
    "displayTypeStyle": {
        "en": "Nước sản xuất.",
        "vi": "Nước sản xuất."
    }
}
```

**Response Structure**: `201 Created` - Returns the newly created Sample Type object.

### 5.4 Update Sample Type

**Endpoint**: `POST /v2/sample-types/update`

**Request Body Example**:

```json
{
    "sampleTypeId": "ST0001",
    "sampleTypeName": "Nước sản xuất (Updated)"
}
```

**Response Structure**: `200 OK` - Returns the updated Sample Type object.

### 5.5 Delete Sample Type

**Endpoint**: `POST /v2/sample-types/delete`

**Request Body Example**:

```json
{
    "sampleTypeId": "ST0001"
}
```

**Response Structure**:

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "id": "ST0001",
        "status": "Deleted"
    },
    "meta": null,
    "error": null
}
```
