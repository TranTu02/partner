# AUTHENTICATION API DOCUMENTATION

**Module**: Authentication (Xác thực & Quản lý Phiên)  
**Version**: 2.0  
**Base URL**: `/v2/auth`  
**Generated**: 2026-02-14

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Endpoints](#authentication-endpoints)
    - [LOGIN](#login)
    - [VERIFY TOKEN](#verify-token)
    - [LOGOUT](#logout)
3. [Data Models](#data-models)
4. [Error Codes](#error-codes)
5. [Security Notes](#security-notes)

---

## Overview

Authentication module cung cấp các endpoint để:

- **Đăng nhập**: Xác thực người dùng và tạo session token
- **Xác minh token**: Kiểm tra tính hợp lệ của token
- **Đăng xuất**: Hủy session (client-side)

**Authentication Flow**:

```
1. Client → POST /v2/auth/login (email + password)
2. Server → Verify credentials → Create session → Return token
3. Client → Store token (localStorage/cookie)
4. Client → Use token in subsequent requests (Authorization: Bearer <token>)
5. Client → POST /v2/auth/logout → Clear token
```

---

## Authentication Endpoints

### LOGIN

Xác thực người dùng và tạo session token.

**Endpoint**: `POST /v2/auth/login`

**Content-Type**: `application/json`

**Request Body**:

| Field      | Type   | Required | Description     |
| ---------- | ------ | -------- | --------------- |
| `email`    | string | Yes      | Email đăng nhập |
| `password` | string | Yes      | Mật khẩu        |

**Example Request**:

```http
POST /v2/auth/login
Content-Type: application/json

{
  "email": "admin@lims.com",
  "password": "password123"
}
```

**Example Response (Success)**:

```json
{
    "token": "SS_e69c0391-e14d-4b16-8bf8-f0e243a51eab",
    "identity": {
        "identityId": "IDx3ea18",
        "identityName": "Nguyễn Mai Quỳnh",
        "identityEmail": "admin@lims.com",
        "alias": "",
        "identityRoles": ["ROLE_SUPER_ADMIN", "ROLE_DIRECTOR", "ROLE_TECH_MANAGER"],
        "identityPolicies": {
            "POL_QA_AUDIT": "ALLOW",
            "POL_LIB_MANAGE": "ALLOW",
            "POL_SYS_CONFIG": "ALLOW"
        }
    }
}
```

**Response Fields**:

- `token`: Session token (format: `SS_<uuid>`)
- `identity`: Thông tin người dùng
    - `identityId`: ID người dùng
    - `identityName`: Tên đầy đủ
    - `identityEmail`: Email
    - `identityRoles`: Danh sách roles
    - `identityPolicies`: Policies được phép

**Error Responses**:

1. **Wrong Password**:

```json
{
    "error": "Invalid credentials",
    "code": 401
}
```

2. **User Not Found**:

```json
{
    "error": "Invalid credentials",
    "code": 401
}
```

3. **Missing Credentials**:

```json
{
    "error": "Email and password required",
    "code": 400
}
```

**Status Codes**:

- `200`: Login successful
- `400`: Missing email or password
- `401`: Invalid credentials
- `403`: Account inactive/banned

**Notes**:

- Token có thời hạn 24h (default)
- Mật khẩu được hash bằng bcrypt
- Không giới hạn số lần đăng nhập sai (cân nhắc rate limiting)

---

### VERIFY TOKEN

Xác minh tính hợp lệ của token và lấy thông tin người dùng.

**Endpoint**: `GET /v2/auth/verify`

**Headers**:

```
Authorization: Bearer SS_e69c0391-e14d-4b16-8bf8-f0e243a51eab
```

**Example Request**:

```http
GET /v2/auth/verify
Authorization: Bearer SS_e69c0391-e14d-4b16-8bf8-f0e243a51eab
```

**Example Response (Valid Token)**:

```json
{
    "valid": true,
    "identity": {
        "identityId": "IDx3ea18",
        "identityName": "Nguyễn Mai Quỳnh",
        "identityEmail": "admin@lims.com",
        "identityRoles": ["ROLE_SUPER_ADMIN", "ROLE_DIRECTOR", "ROLE_TECH_MANAGER"]
    },
    "permissions": {
        "crm.orders": {
            "orderId": 7,
            "clientId": 7,
            "totalAmount": 7
        },
        "lab.sample": {
            "sampleId": 3,
            "status": 3
        }
    }
}
```

**Response Fields**:

- `valid`: `true` nếu token hợp lệ
- `identity`: Thông tin người dùng
- `permissions`: Permissions đã resolve (sample)

**Error Responses**:

1. **Invalid Token Format**:

```json
{
    "error": "Invalid token format",
    "code": 400
}
```

2. **Expired Token**:

```json
{
    "error": "Session invalid or expired",
    "code": 401
}
```

3. **Missing Token**:

```json
{
    "error": "No auth token",
    "code": 401
}
```

**Status Codes**:

- `200`: Token valid
- `400`: Invalid token format
- `401`: Token expired or missing

**Use Cases**:

- Kiểm tra token trước khi load app
- Refresh user info
- Validate token sau khi page reload

---

### LOGOUT

Đăng xuất người dùng (client-side token removal).

**Endpoint**: `POST /v2/auth/logout`

**Headers**:

```
Authorization: Bearer SS_e69c0391-e14d-4b16-8bf8-f0e243a51eab
```

**Example Request**:

```http
POST /v2/auth/logout
Authorization: Bearer SS_e69c0391-e14d-4b16-8bf8-f0e243a51eab
```

**Example Response**:

```json
{
    "message": "Logged out successfully",
    "note": "Client should clear token from localStorage/cookies"
}
```

**Status Codes**:

- `200`: Logout successful

**Implementation**:

- Server-side: Không cần xử lý gì (stateless)
- Client-side: Xóa token khỏi localStorage/cookies
- Optional: Server có thể invalidate token trong cache

**Client-Side Example**:

```javascript
// Logout
await fetch("/v2/auth/logout", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
    },
});

// Clear token
localStorage.removeItem("authToken");
// or
document.cookie = "sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
```

---

## Data Models

### Login Request

```json
{
    "email": "string",
    "password": "string"
}
```

### Login Response

```json
{
    "token": "string",
    "identity": {
        "identityId": "string",
        "identityName": "string",
        "identityEmail": "string",
        "alias": "string",
        "identityRoles": ["string"],
        "identityPolicies": {
            "POLICY_CODE": "ALLOW|DENY|LIMIT"
        }
    }
}
```

### Verify Response

```json
{
  "valid": true,
  "identity": {
    "identityId": "string",
    "identityName": "string",
    "identityEmail": "string",
    "identityRoles": ["string"]
  },
  "permissions": {
    "table.name": {
      "columnName": 0 | 1 | 3 | 7 | 0.5 | 2.5 | 6.5
    }
  }
}
```

### Error Response

```json
{
  "error": "string",
  "code": 400 | 401 | 403 | 500
}
```

---

## Error Codes

| HTTP Status | Error Code | Message                     | Description                     |
| ----------- | ---------- | --------------------------- | ------------------------------- |
| 400         | 400        | Email and password required | Thiếu email hoặc password       |
| 400         | 400        | Invalid token format        | Token không đúng định dạng      |
| 401         | 401        | Invalid credentials         | Email hoặc password sai         |
| 401         | 401        | Session invalid or expired  | Token hết hạn hoặc không hợp lệ |
| 401         | 401        | No auth token               | Thiếu token trong request       |
| 403         | 403        | Account inactive            | Tài khoản chưa kích hoạt        |
| 403         | 403        | Account banned              | Tài khoản bị khóa               |

---

## Security Notes

### 1. Password Security

- Passwords được hash bằng **bcrypt** với salt rounds = 12
- Không bao giờ lưu plain text password
- Không trả về password trong response

### 2. Token Security

- Token format: `SS_<uuid>`
- Thời hạn: 24h (configurable)
- Lưu trong:
    - **Recommended**: HTTP-only cookie
    - **Alternative**: localStorage (dễ bị XSS)

### 3. Session Management

- Session được cache trong Valkey
- Tự động expire sau 24h
- Không có refresh token (cân nhắc implement)

### 4. Best Practices

**Client-Side**:

```javascript
// Store token securely
const login = async (email, password) => {
    const res = await fetch("/v2/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
        // Store token
        localStorage.setItem("authToken", data.token);
        // Store user info
        localStorage.setItem("user", JSON.stringify(data.identity));
    }
};

// Use token in requests
const fetchData = async () => {
    const token = localStorage.getItem("authToken");

    const res = await fetch("/v2/identities/get/list", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        // Token expired, redirect to login
        window.location.href = "/login";
    }
};

// Logout
const logout = async () => {
    const token = localStorage.getItem("authToken");

    await fetch("/v2/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });

    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
};
```

### 5. Rate Limiting (Recommended)

Implement rate limiting để chống brute force:

- Max 5 login attempts per IP per 15 minutes
- Max 100 requests per user per minute

### 6. HTTPS Only

**CRITICAL**: Chỉ sử dụng HTTPS trong production để bảo vệ token và credentials.

---

## Integration Examples

### React Example

```javascript
import { useState, useEffect } from "react";

const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem("authToken");

            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch("/v2/auth/verify", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data.identity);
                } else {
                    localStorage.removeItem("authToken");
                }
            } catch (error) {
                console.error("Verify failed:", error);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
    }, []);

    const login = async (email, password) => {
        const res = await fetch("/v2/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error);
        }

        const data = await res.json();
        localStorage.setItem("authToken", data.token);
        setUser(data.identity);
        return data;
    };

    const logout = async () => {
        const token = localStorage.getItem("authToken");

        await fetch("/v2/auth/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });

        localStorage.removeItem("authToken");
        setUser(null);
    };

    return { user, loading, login, logout };
};

export default useAuth;
```

### Axios Interceptor Example

```javascript
import axios from "axios";

// Add token to all requests
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// Handle 401 errors
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("authToken");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    },
);
```

---

**End of Documentation**
