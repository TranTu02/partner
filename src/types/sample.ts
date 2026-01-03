export interface Analysis {
    analysisId: string; // Custom Text ID (PK)
    receiptId: string; // FK
    sampleId: string; // FK

    // Matrix Link
    matrixId: string; // FK

    // Snapshots
    parameterName: string;
    protocolCode: string;
    protocolAccreditation?: { VILAS: boolean; TDC: boolean }; // jsonb

    technicianId?: string; // FK
    relatedTechnicianIds?: string[];

    resultValue?: string;
    resultUnit?: string;
    resultReference?: string;
    analysisStatus: "Pending" | "Testing" | "Reviewing" | "Approved" | "Rejected";

    // Pricing (often joined or snapshotted)
    feeBeforeTax?: number;
    taxRate?: number;

    // Audit
    createdAt?: string;
    modifiedAt?: string;
}

export interface Sample {
    sampleId: string; // Custom Text ID (PK)
    sampleCode: string; // UQ <SP>...
    receiptId: string; // FK
    sampleName: string;
    sampleInformation?: any[]; // jsonb[]
    sampleMatrix: string;
    sampleStatus: "Received" | "Analyzing" | "Done";
    analyses: Analysis[]; // Frontend helper to nest analyses

    // Audit
    createdAt: string;
    createdById: string;
    modifiedAt?: string;
    modifiedById?: string;

    // Helpers
    sampleNote?: string; // Mapped from sampleInformation
}
