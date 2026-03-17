// =============================================================================
// SAMPLE & ANALYSIS TYPES - Sync với DB: lab.samples, lab.analyses
// DATABASE.md: Section D - SCHEMA LAB
// =============================================================================

/**
 * Trạng thái vòng đời mẫu vật lý.
 * DB: lab.samples.sampleStatus
 */
export type SampleStatus =
    | "Received"    // Đã nhận (đang ở bộ phận nhận mẫu)
    | "InPrep"      // Đang xử lý sơ bộ (nghiền, sấy, tách...)
    | "Distributed" // Đang ở phòng thí nghiệm (đã giao cho KTV)
    | "Retained"    // Lưu mẫu (lưu kho sau khi thử nghiệm xong)
    | "Disposed"    // Đã tiêu hủy
    | "Returned";   // Đã trả lại khách hàng

/**
 * Trạng thái tiến trình phân tích.
 * DB: lab.analyses.analysisStatus
 */
export type AnalysisStatus =
    | "Pending"     // Chờ xếp lịch / phân công
    | "Ready"       // Đủ điều kiện bàn giao, chưa giao KTV
    | "HandedOver"  // Đã cấp phát vật tư / bàn giao mẫu
    | "Testing"     // Đang thử nghiệm
    | "DataEntered" // Đã nhập kết quả sơ bộ (chờ soát xét kỹ thuật)
    | "TechReview"  // Đã qua soát xét kỹ thuật (Leader check)
    | "Approved"    // QA/Manager đã duyệt chốt kết quả
    | "ReTest"      // Yêu cầu thử nghiệm lại
    | "Complained"  // Khiếu nại từ khách hàng
    | "Cancelled";  // Hủy chỉ tiêu

/**
 * Kết quả đánh giá chỉ tiêu.
 * DB: lab.analyses.analysisResultStatus
 */
export type AnalysisResultStatus = "Pass" | "Fail" | "NotEvaluated";

/**
 * Phép thử / Chỉ tiêu phân tích.
 * DB: lab.analyses
 * NOTE: Đây là entity phòng thí nghiệm - KHÁC với OrderAnalysis trong order.ts
 */
export interface Analysis {
    analysisId: string;     // PK - Custom Text ID
    sampleId: string;       // FK lab.samples
    matrixId?: string;      // FK library.matrices

    // Identifiers
    parameterId?: string;   // ID chỉ tiêu (để filter nhanh)

    // Snapshots
    parameterName?: string;
    protocolCode?: string;
    protocolAccreditation?: Record<string, boolean>; // jsonb { VILAS997: true, TDC: true }
    analysisUnit?: string;  // Đơn vị đo (mg/L, CFU...)
    analysisMethodLOD?: string;
    analysisMethodLOQ?: string;

    // Technician
    technicianId?: string;
    technicianIds?: string[];
    technicianGroupId?: string;
    technicianGroupName?: string;
    equipmentId?: string;

    // Status
    analysisStatus: AnalysisStatus;
    analysisResultStatus?: AnalysisResultStatus;
    analysisMarks?: string[]; // Lưu các status đã trải qua

    // Result
    analysisResult?: string;  // Raw value
    analysisUncertainty?: string; // ± U

    // Timestamps
    analysisStartedAt?: string;
    analysisCompletedAt?: string;
    analysisDeadline?: string;
    analysisPriority?: number;

    // Notes & Extra
    analysisNotes?: string;
    retestReason?: string;

    // Pricing (từ OrderAnalysis snapshot)
    feeBeforeTax?: number;
    taxRate?: number;
    feeAfterTax?: number;

    // Audit
    createdAt?: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;
}

/**
 * Mẫu thử nghiệm vật lý.
 * DB: lab.samples
 * NOTE: Đây là entity vật lý LAB - KHÁC với OrderSample trong order.ts
 */
export interface LabSample {
    sampleId: string;       // PK - Custom Text ID
    sampleName?: string;
    receiptId: string;      // FK lab.receipts

    // Loại mẫu
    sampleTypeId?: string;
    sampleTypeName?: string;
    productType?: string;

    // Thông tin mẫu
    sampleClientInfo?: string;
    sampleInfo?: Array<{ label: string; value: string }>; // jsonb[]
    sampleReceiptInfo?: Array<{ label: string; value: string }>; // jsonb[]

    // Trạng thái
    sampleStatus: SampleStatus;
    sampleMarks?: string[]; // Lưu các status đã trải qua

    // Vật lý
    sampleVolume?: string;
    sampleWeight?: number;
    samplePreservation?: string;
    physicalState?: string;

    // Lưu kho
    sampleStorageLoc?: string;
    sampleRetentionDate?: string;
    sampleDisposalDate?: string;
    sampleIsReference?: boolean;
    retentionServiceFee?: number;

    // Lấy mẫu hiện trường
    samplingInfo?: Record<string, any>; // jsonb

    // Chain of custody
    parentSampleId?: string;
    custodyLog?: Array<{ from: string; to: string; timestamp: string; note?: string }>;

    // Priority
    samplePriority?: number;
    sampleNote?: string;

    // Analyses (populated on fetch)
    analyses?: Analysis[];

    // Audit
    createdAt?: string;
    createdById?: string;
    modifiedAt?: string;
    modifiedById?: string;
}

/**
 * @deprecated Sử dụng LabSample thay thế để rõ ràng hơn.
 * Alias giữ để backward compatibility với components cũ.
 */
export type Sample = LabSample;
