# Client URI Feature Documentation

## 1. Feature Overview

The **Client URI Feature** allows for the generation of temporary, secure, time-limited access links for **Orders** (previously Clients). This enables external users (clients) to access specific resources, such as the **Sample Request Form**, without requiring a full login account.

## 2. Technical Structure

### Encryption Algorithm

-   **Algorithm**: `AES-256-CBC`
-   **Key**: System-wide secret key (configured in environment variables).
-   **IV (Initialization Vector)**: Randomly generated for each URI to ensure uniqueness.

### Format

The generated URI follows this specific format:

```text
SC_<IV>:<ENCRYPTED_DATA>
```

-   `SC_`: A prefix to easily identify these special URIs.
-   `<IV>`: The hex-encoded Initialization Vector used for encryption.
-   `<ENCRYPTED_DATA>`: The hex-encoded encrypted payload.

### Payload Structure

The internal JSON payload before encryption typically contains:

```json
{
    "orderId": "DH26C0011",
    "uriExpiredAt": "2024-01-20T10:00:00.000Z"
}
```

## 3. Logic Flow

### Generation Flow (`generate-uri`)

1.  **Request**: Admin/Staff requests a URI for a specific `orderId`.
2.  **Expiration Calculation**: System calculates the expiration time (Default: **7 days** from generation).
3.  **Payload Creation**: System creates the JSON payload with `orderId` and `uriExpiredAt`.
4.  **Encryption**:
    -   Generate a random IV.
    -   Encrypt payload using AES-256-CBC + System Key + IV.
5.  **Formatting**: Combine prefix, IV, and encrypted data into the final URI string.
6.  **Database Update**: Update the `orders.orderUri` column with this new value (for reference).
7.  **Response**: Return the URI to the requester.

### Validation Flow (`check-uri`)

1.  **Request**: Client accesses a link containing the `uri`. Frontend sends this `uri` (along with `orderId` query param) to the backend.
2.  **Format Check**: Verify the `SC_` prefix.
3.  **Parsing**: Split IV and Encrypted Data.
4.  **Decryption**: Decrypt the data using the System Key and extracted IV.
5.  **Expiration Check**: Compare `uriExpiredAt` from the payload with the current server time.
    -   _If Expired_: Return Error.
6.  **Validation Success**: Return the full `order` object (including `requestForm` data).

## 4. API Usage Guide

### Generate URI

**Endpoint**: `POST /v1/order/generate-uri`

**Request Body**:

```json
{
    "orderId": "DH26C0011"
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "uri": "SC_a1b2...:d4e5..."
    }
}
```

### Check URI

**Endpoint**: `POST /v1/order/check-uri`

**Request Body**:

```json
{
    "uri": "SC_a1b2...:d4e5...",
    "orderId": "DH26C0011"
}
```

**Response**:

```json
{
    "success": true,
    "data": {
        "orderId": "DH26C0011",
        "requestForm": "<html>...</html>"
        // ... other order details
    }
}
```
