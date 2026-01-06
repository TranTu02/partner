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
    parameterId: string; // FK
    protocolId: string; // FK
    sampleTypeId: string; // FK

    // Snapshot / Denormalized Data
    parameterName: string;
    protocolCode: string;
    protocolSource?: string;
    protocolAccreditation?: { VILAS: boolean; TDC: boolean };
    sampleTypeName: string;
    scientificField?: "chemistry" | "physics" | "microbiology";

    // Pricing & Limits
    feeBeforeTax: number;
    feeAfterTax: number;
    taxRate: number;
    LOD?: string;
    LOQ?: string;
    thresholdLimit?: string;
    turnaroundTime?: number;
    technicianGroupId?: string;

    // Audit
    createdAt?: string;
    createdById?: string;
}
