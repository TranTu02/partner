import { X, Trash2, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matrix } from "@/types/parameter";
import { SampleTypeSearch } from "@/components/common/SampleTypeSearch";

// Extended interfaces to support both view and create modes
export interface AnalysisWithQuantity extends Omit<Matrix, "createdAt" | "createdById" | "modifiedAt" | "modifiedById" | "feeAfterTax" | "taxRate"> {
    id: string;
    unitPrice: number;
    quantity: number;
    userQuantity?: number;
    feeAfterTax?: number; // Renamed from totalFeeBeforeTax, represents the line total (Thành tiền)
    taxRate?: number; // Ensure taxRate is also consistently typed as number
}

export interface SampleWithQuantity {
    id: string;
    sampleId?: string;
    sampleName: string;
    sampleMatrix: string;
    sampleNote?: string;
    analyses: AnalysisWithQuantity[];
}

interface SampleCardProps {
    sample: SampleWithQuantity;
    sampleIndex: number;
    onRemoveSample: () => void;
    onDuplicateSample: () => void;
    onUpdateSample: (updates: Partial<SampleWithQuantity>) => void;
    onAddAnalysis: () => void;
    onRemoveAnalysis: (analysisId: string) => void;
    isReadOnly?: boolean;
}

export function SampleCard({ sample, sampleIndex, onRemoveSample, onDuplicateSample, onUpdateSample, onAddAnalysis, onRemoveAnalysis, isReadOnly = false }: SampleCardProps) {
    const { t } = useTranslation();

    // Calculates the fee after tax for a line item.
    // If feeAfterTax is explicitly set, use it. Otherwise, calculate from unitPrice, quantity, and taxRate.
    const calculateFeeAfterTax = (analysis: AnalysisWithQuantity) => {
        if (analysis.feeAfterTax !== undefined) {
            return analysis.feeAfterTax;
        }
        const subtotal = (analysis.unitPrice || 0) * (analysis.quantity || 1);
        const tax = subtotal * ((analysis.taxRate || 0) / 100);
        return subtotal + tax;
    };

    const handleAnalysisChange = (analysisIndex: number, field: keyof AnalysisWithQuantity, value: any) => {
        const newAnalyses = [...sample.analyses];
        const updatedAnalysis = { ...newAnalyses[analysisIndex] };

        if (field === "parameterName") {
            updatedAnalysis.parameterName = value;
        } else if (field === "feeAfterTax") {
            const newFeeAfterTax = Number(value);
            updatedAnalysis.feeAfterTax = newFeeAfterTax;

            // Recalculate unitPrice based on the new feeAfterTax
            // Formula: unitPrice * quantity * (1 + taxRate/100) = feeAfterTax
            // So: unitPrice = feeAfterTax / quantity / (1 + taxRate/100)
            const quantity = updatedAnalysis.quantity || 1;
            const taxRate = updatedAnalysis.taxRate || 0;
            updatedAnalysis.unitPrice = newFeeAfterTax / quantity / (1 + taxRate / 100);
        } else if (field === "taxRate") {
            const newTaxRate = Number(value);
            updatedAnalysis.taxRate = newTaxRate;

            // Recalculate unitPrice to keep the feeAfterTax constant
            // User's requirement: "đơn giá sẽ điều chỉnh để đơn giá * ( 1+ thuế / 100) = thành tiền"
            // Ensure we have a feeAfterTax value to work with. If not explicitly set, calculate it.
            const currentFeeAfterTax = updatedAnalysis.feeAfterTax ?? calculateFeeAfterTax(updatedAnalysis);
            updatedAnalysis.feeAfterTax = currentFeeAfterTax; // Ensure feeAfterTax is explicitly set in state

            const quantity = updatedAnalysis.quantity || 1;
            updatedAnalysis.unitPrice = currentFeeAfterTax / quantity / (1 + newTaxRate / 100);
        }
        // unitPrice is now read-only and calculated, so no direct input change for it.

        newAnalyses[analysisIndex] = updatedAnalysis;
        onUpdateSample({ analyses: newAnalyses });
    };

    const handleAddEmptyAnalysis = () => {
        const newAnalysis: AnalysisWithQuantity = {
            id: `manual-${Date.now()}`,
            parameterName: "",
            method: "",
            unitPrice: 0,
            quantity: 1,
            taxRate: 8,
            feeAfterTax: 0, // Initialize feeAfterTax
            analysisType: "Manual",
            matrix: sample.sampleMatrix,
            feeBeforeTax: 0,
            description: "",
            priceListId: "",
            parameterId: "",
            dicUnitId: "",
            dicUnit: {},
            category: {},
            categoryId: "",
            protocolSource: "",
            protocolCode: "",
            testTime: "",
            vi: { name: "" },
            en: { name: "" },
        } as any;

        onUpdateSample({ analyses: [...sample.analyses, newAnalysis] });
    };

    return (
        <div className="bg-card rounded-lg border border-border p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <div className="flex-1 grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("order.sampleName")} #{sampleIndex + 1} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2  border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={sample.sampleName}
                            onChange={(e) => onUpdateSample({ sampleName: e.target.value })}
                            placeholder={t("order.sampleNamePlaceholder")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("order.sampleMatrix")} <span className="text-destructive">*</span>
                        </label>
                        <SampleTypeSearch
                            value={sample.sampleMatrix}
                            onChange={(val) => onUpdateSample({ sampleMatrix: val })}
                            placeholder={t("order.sampleMatrixPlaceholder")}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
                {!isReadOnly && (
                    <div className="flex gap-2 mt-8">
                        <button
                            onClick={onDuplicateSample}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title={t("order.duplicateSample")}
                        >
                            <Copy className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onRemoveSample}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title={t("order.removeSample")}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Analysis Table */}
            <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.stt")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.parameter")}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("order.print.unitPrice")}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("parameter.tax")}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("order.lineTotal")}</th>
                            {!isReadOnly && <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("common.action")}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sample.analyses.length === 0 ? (
                            <tr>
                                <td colSpan={isReadOnly ? 5 : 6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                    {t("order.noAnalyses")}
                                </td>
                            </tr>
                        ) : (
                            sample.analyses.map((analysis, index) => (
                                <tr key={analysis.id} className="border-t border-border hover:bg-muted">
                                    <td className="px-4 py-3 text-sm text-foreground">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-foreground">
                                        {isReadOnly ? (
                                            analysis.parameterName
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent"
                                                value={analysis.parameterName}
                                                onChange={(e) => handleAnalysisChange(index, "parameterName", e.target.value)}
                                                placeholder={t("order.print.parameter")}
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-foreground">
                                        {/* Unit Price is now read-only and calculated */}
                                        {(analysis.unitPrice || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-foreground">
                                        {isReadOnly ? (
                                            analysis.taxRate + "%"
                                        ) : (
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="number"
                                                    className="w-16 px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-center"
                                                    value={analysis.taxRate}
                                                    onChange={(e) => handleAnalysisChange(index, "taxRate", e.target.value)}
                                                />
                                                <span className="ml-1">%</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                                        {isReadOnly ? (
                                            calculateFeeAfterTax(analysis).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " đ"
                                        ) : (
                                            <input
                                                type="number"
                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right"
                                                value={analysis.feeAfterTax ?? calculateFeeAfterTax(analysis)} // Display feeAfterTax, calculate if not set
                                                onChange={(e) => handleAnalysisChange(index, "feeAfterTax", e.target.value)}
                                            />
                                        )}
                                    </td>
                                    {!isReadOnly && (
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => onRemoveAnalysis(analysis.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Analysis Button */}
            {!isReadOnly && (
                <div className="mt-4 flex gap-2">
                    <button onClick={onAddAnalysis} className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">
                        + {t("order.addAnalysis")}
                    </button>
                    <button onClick={handleAddEmptyAnalysis} className="px-4 py-2 text-foreground border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium">
                        + {t("order.addManualAnalysis", "Thêm chỉ tiêu")}
                    </button>
                </div>
            )}
        </div>
    );
}
