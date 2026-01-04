import { X, Trash2, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matrix } from "@/types/parameter";
import { SampleTypeSearch } from "@/components/common/SampleTypeSearch";

// Extended interfaces to support both view and create modes
interface AnalysisWithQuantity extends Omit<Matrix, "createdAt" | "createdById" | "modifiedAt" | "modifiedById"> {
    id: string;
    unitPrice: number;
    quantity: number;
    userQuantity?: number;

    // Ensure compatibility with previous specific fields if needed,
    // but Matrix has feeBeforeTax, taxRate, parameterName, etc.
}

interface SampleWithQuantity {
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

    const calculateLineTotal = (analysis: AnalysisWithQuantity) => {
        const subtotal = analysis.unitPrice * analysis.quantity;
        const tax = subtotal * (analysis.taxRate / 100);
        return subtotal + tax;
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
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <td className="px-4 py-3 text-sm text-foreground">{analysis.parameterName}</td>
                                    <td className="px-4 py-3 text-right text-sm text-foreground">{analysis.unitPrice.toLocaleString("vi-VN")} đ</td>
                                    <td className="px-4 py-3 text-center text-sm text-foreground">{analysis.taxRate}%</td>
                                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">{calculateLineTotal(analysis).toLocaleString("vi-VN")} đ</td>
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
                <button onClick={onAddAnalysis} className="mt-4 px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">
                    + {t("order.addAnalysis")}
                </button>
            )}
        </div>
    );
}
