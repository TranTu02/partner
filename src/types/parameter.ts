export interface Parameter {
    parameterId: string; // Custom Text ID (PK)
    parameterName: string; // Tên gọi chuẩn
    displayStyle?: any; // jsonb
    technicianAlias?: string;

    // Audit columns
    createdAt: string;
    createdById: string;
    modifiedAt?: string;
    modifiedById?: string;
}

export interface Protocol {
    protocolId: string;
    protocolCode: string;
    protocolSource?: string;
    protocolAccreditation?: { VILAS: boolean; TDC: boolean };
    createdAt?: string;
    createdById?: string;
}

export interface SampleType {
    sampleTypeId: string;
    sampleTypeName: string;
    displayTypeStyle?: any;
    createdAt?: string;
    createdById?: string;
}

export interface Matrix {
    matrixId: string; // PK
    parameterId?: string; // FK (Optional)
    protocolId?: string; // FK (Optional)
    sampleTypeId: string; // FK

    // Snapshot / Denormalized Data
    protocolCode?: string;
    protocolSource?: string;
    protocolAccreditation?: any;
    parameterName: string;
    sampleTypeName: string;
    scientificField?: "chemistry" | "physics" | "microbiology";

    // Pricing
    feeBeforeTax?: number;
    feeAfterTax?: number;
    taxRate?: number;
    LOD?: string;
    LOQ?: string;
    thresholdLimit?: string;
    turnaroundTime?: number;
    technicianGroupId?: string;

    // Audit
    createdAt?: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;

    // Group Info (Optional)
    groupId?: string;
    groupDiscount?: number;
    discountRate?: number;
}

export interface ParameterGroup {
    parameterGroupId: string; // PK
    groupName: string;
    matrixIds: string[]; // List of matrix IDs
    groupNote?: string;
    sampleTypeId: string; // FK
    sampleTypeName: string; // Snapshot
    feeBeforeTaxAndDiscount: number;
    discountRate: number;
    feeBeforeTax: number;
    taxRate: number;
    feeAfterTax: number;
    matrices?: Matrix[]; // Snapshot included in list response
    // Audit
    createdAt?: string;
    createdById?: string;
}
