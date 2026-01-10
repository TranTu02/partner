import { X, Trash2, Copy, Unlink, GripVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matrix } from "@/types/parameter";

// ... (interfaces remain same)

export interface AnalysisWithQuantity extends Omit<Matrix, "createdAt" | "createdById" | "modifiedAt" | "modifiedById" | "feeAfterTax" | "taxRate"> {
    id: string;
    unitPrice: number;
    quantity: number;
    userQuantity?: number;
    feeAfterTax?: number; // Renamed from totalFeeBeforeTax, represents the line total (Thành tiền)
    taxRate?: number; // Ensure taxRate is also consistently typed as number
    groupId?: string;
    groupDiscount?: number;
    discountRate?: number;
}

import { useDrag, useDrop } from "react-dnd";
import { useRef, useMemo, useState } from "react";

const SortableAnalysisRow = ({ id, index, moveRow, children }: any) => {
    const ref = useRef<HTMLTableRowElement>(null);
    const [{ handlerId }, drop] = useDrop<any, void, { handlerId: string | symbol | null }>({
        accept: "analysis",
        collect(monitor) {
            return { handlerId: monitor.getHandlerId() };
        },
        hover(item: any, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            moveRow(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });
    const [{ isDragging }, drag, preview] = useDrag({
        type: "analysis",
        item: () => ({ id, index }),
        collect: (monitor: any) => ({ isDragging: monitor.isDragging() }),
    });
    preview(drop(ref));
    return (
        <tr ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }} data-handler-id={handlerId} className="border-t border-border hover:bg-muted">
            {children(drag)}
        </tr>
    );
};

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
    // User's formula: feeAfterTax = feeBeforeTax * ( 1 - discountRate/100) * ( 1 + taxRate/100)
    // where feeBeforeTax here implies unitPrice * quantity
    const calculateFeeAfterTax = (analysis: AnalysisWithQuantity) => {
        if (analysis.feeAfterTax !== undefined) {
            // If explicitly modified, logic might differ, but generally we rely on recalculation unless manual override?
            // Since we recalculate on change, let's use the formula dynamic check.
            // Actually, if we use the formula, we should probably return the calculated value, unless 'feeAfterTax' is an override.
            // Let's fallback to stored if set, but really, for display consistency, we should compute it unless user manually edited 'Total'.
            return analysis.feeAfterTax;
        }
        const unitPrice = analysis.unitPrice || 0;
        const quantity = analysis.quantity || 1;
        const discountRate = analysis.discountRate || 0;
        const taxRate = analysis.taxRate || 0;

        const feeBeforeTax = unitPrice * quantity;
        const afterDiscount = feeBeforeTax * (1 - discountRate / 100);
        const afterTax = afterDiscount * (1 + taxRate / 100);

        return afterTax;
    };

    const handleAnalysisChange = (analysisIndex: number, field: keyof AnalysisWithQuantity, value: any) => {
        const newAnalyses = [...sample.analyses];
        const updatedAnalysis = { ...newAnalyses[analysisIndex] };

        if (field === "parameterName") {
            updatedAnalysis.parameterName = value;
        } else if (field === "feeAfterTax") {
            // Reverse calculation is hard with discount.
            // Formula: feeAfterTax = unitPrice * quantity * (1-d%) * (1+t%)
            // So: unitPrice = feeAfterTax / (quantity * (1-d%) * (1+t%))
            const newFeeAfterTax = Number(value);
            updatedAnalysis.feeAfterTax = newFeeAfterTax;

            const quantity = updatedAnalysis.quantity || 1;
            const taxRate = updatedAnalysis.taxRate || 0;
            const discountRate = updatedAnalysis.discountRate || 0;

            const denominator = quantity * (1 - discountRate / 100) * (1 + taxRate / 100);
            if (denominator !== 0) {
                updatedAnalysis.unitPrice = newFeeAfterTax / denominator;
            }
        } else if (field === "unitPrice") {
            const newUnitPrice = Number(value);
            updatedAnalysis.unitPrice = newUnitPrice;
            const quantity = updatedAnalysis.quantity || 1;
            const taxRate = updatedAnalysis.taxRate || 0;
            const discountRate = updatedAnalysis.discountRate || 0;

            // Recalculate forward
            const feeBeforeTax = newUnitPrice * quantity;
            const afterDiscount = feeBeforeTax * (1 - discountRate / 100);
            updatedAnalysis.feeAfterTax = afterDiscount * (1 + taxRate / 100);
        } else if (field === "taxRate") {
            const newTaxRate = Number(value);
            updatedAnalysis.taxRate = newTaxRate;

            // Recalculate unitPrice to keep feeAfterTax constant?
            // Previous logic: "đơn giá sẽ điều chỉnh".
            // Let's stick to that: Maintain Total, adjust Unit Price.
            const currentFeeAfterTax = updatedAnalysis.feeAfterTax ?? calculateFeeAfterTax(updatedAnalysis);
            updatedAnalysis.feeAfterTax = currentFeeAfterTax;

            const quantity = updatedAnalysis.quantity || 1;
            const discountRate = updatedAnalysis.discountRate || 0;

            const denominator = quantity * (1 - discountRate / 100) * (1 + newTaxRate / 100);
            if (denominator !== 0) {
                updatedAnalysis.unitPrice = currentFeeAfterTax / denominator;
            }
        }
        // Discount rate change? Not exposed in UI per row yet, but if we did:

        newAnalyses[analysisIndex] = updatedAnalysis;
        onUpdateSample({ analyses: newAnalyses });
    };

    const handleUnlinkAnalysis = (analysisIndex: number) => {
        const newAnalyses = [...sample.analyses];
        newAnalyses[analysisIndex] = { ...newAnalyses[analysisIndex], parameterId: "" };
        onUpdateSample({ analyses: newAnalyses });
    };

    const handleRemoveGroup = (groupId: string) => {
        const newAnalyses = sample.analyses.filter((a) => a.groupId !== groupId);
        onUpdateSample({ analyses: newAnalyses });
    };

    const handleAddEmptyAnalysis = () => {
        const newAnalysis: AnalysisWithQuantity = {
            id: `manual-${Date.now()}`,
            parameterName: "",
            method: "",
            unitPrice: 0,
            quantity: 1,
            taxRate: 8, // Default tax rate
            feeAfterTax: 0,
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

    const moveAnalysis = (dragIndex: number, hoverIndex: number) => {
        const newAnalyses = [...sample.analyses];
        const [removed] = newAnalyses.splice(dragIndex, 1);
        newAnalyses.splice(hoverIndex, 0, removed);
        onUpdateSample({ analyses: newAnalyses });
    };

    // Calculate Summaries
    const summary = useMemo(() => {
        let totalUnitPrice = 0; // feeBeforeTaxAndDiscount
        let totalDiscount = 0;
        let totalBeforeTax = 0; // Net before tax
        let totalAfterTax = 0;

        sample.analyses.forEach((a) => {
            const unitPrice = a.unitPrice || 0;
            const quantity = a.quantity || 1;
            const discountRate = a.discountRate || 0;
            const taxRate = a.taxRate || 0;

            const feeRaw = unitPrice * quantity;
            const discountVal = feeRaw * (discountRate / 100);
            const feeNet = feeRaw - discountVal;

            // "Tổng tiền sau thuế" = Sum(feeAfterTax)
            const lineAfterTax = a.feeAfterTax ?? feeNet * (1 + taxRate / 100);

            totalUnitPrice += feeRaw;
            totalDiscount += discountVal;
            // "Tổng tiền trước thuế" = Sum(Net Price)
            totalBeforeTax += feeNet;
            totalAfterTax += lineAfterTax;
        });

        return { totalUnitPrice, totalDiscount, totalBeforeTax, totalAfterTax };
    }, [sample.analyses]);

    const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

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
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("sample.note")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={sample.sampleNote || ""}
                            onChange={(e) => onUpdateSample({ sampleNote: e.target.value })}
                            placeholder={t("sample.note")}
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

            <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            {!isReadOnly && <th className="px-4 py-3 w-10 text-center"></th>}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.stt")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.parameter")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.sampleMatrix")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[130px]">{t("order.print.unitPrice")}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("parameter.tax")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[150px]">{t("order.lineTotal")}</th>
                            {!isReadOnly && <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("common.action")}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sample.analyses.length === 0 ? (
                            <tr>
                                <td colSpan={isReadOnly ? 6 : 8} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                    {t("order.noAnalyses")}
                                </td>
                            </tr>
                        ) : (
                            sample.analyses.map((analysis, index) => {
                                return (
                                    <SortableAnalysisRow key={analysis.id} id={analysis.id} index={index} moveRow={moveAnalysis}>
                                        {(dragRef: any) => (
                                            <>
                                                {/* Group header row removed as per requirement */}
                                                {!isReadOnly && (
                                                    <td className={`px-4 py-3 w-10 text-center ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                        <div ref={dragRef} className="cursor-grab active:cursor-grabbing">
                                                            <GripVertical className="w-5 h-5 mx-auto text-muted-foreground hover:text-foreground" />
                                                        </div>
                                                    </td>
                                                )}
                                                <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>{index + 1}</td>
                                                <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
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
                                                <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    {analysis.sampleTypeName}
                                                </td>
                                                <td className={`px-2 py-3 text-right text-sm text-foreground w-[130px] ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    <div className="flex flex-col items-end">
                                                        {isReadOnly ? (
                                                            (analysis.unitPrice || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " đ"
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right"
                                                                value={analysis.unitPrice}
                                                                onChange={(e) => handleAnalysisChange(index, "unitPrice", e.target.value)}
                                                            />
                                                        )}
                                                        {analysis.discountRate && analysis.discountRate > 0 && <span className="text-xs text-green-600 font-medium">(-{analysis.discountRate}%)</span>}
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-3 text-center text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
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
                                                <td
                                                    className={`px-2 py-3 text-right text-sm font-medium text-foreground w-[150px] ${
                                                        analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""
                                                    }`}
                                                >
                                                    {isReadOnly ? (
                                                        calculateFeeAfterTax(analysis).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " đ"
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <input
                                                                type="number"
                                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right"
                                                                value={analysis.feeAfterTax ?? calculateFeeAfterTax(analysis)} // Display feeAfterTax, calculate if not set
                                                                onChange={(e) => handleAnalysisChange(index, "feeAfterTax", e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                {!isReadOnly && (
                                                    <td className={`px-4 py-3 text-center ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                        <div className="flex items-center justify-center gap-1">
                                                            {analysis.parameterId && (
                                                                <button
                                                                    onClick={() => handleUnlinkAnalysis(index)}
                                                                    className="p-1 text-muted-foreground hover:text-orange-500 transition-colors"
                                                                    title={t("parameter.unlink", "Ngắt liên kết")}
                                                                >
                                                                    <Unlink className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    if (analysis.groupId) {
                                                                        handleRemoveGroup(analysis.groupId);
                                                                    } else {
                                                                        onRemoveAnalysis(analysis.id);
                                                                    }
                                                                }}
                                                                onMouseEnter={() => {
                                                                    if (analysis.groupId) setHoveredGroupId(analysis.groupId);
                                                                }}
                                                                onMouseLeave={() => {
                                                                    setHoveredGroupId(null);
                                                                }}
                                                                className={`p-1 text-muted-foreground hover:text-destructive transition-colors ${
                                                                    analysis.groupId && hoveredGroupId === analysis.groupId ? "text-destructive bg-destructive/10 rounded" : ""
                                                                }`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </SortableAnalysisRow>
                                );
                            })
                        )}
                    </tbody>
                    <tfoot className="bg-muted/20 font-medium">
                        <tr>
                            <td colSpan={isReadOnly ? 5 : 6} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.sumUnitPrice", "Tổng đơn giá")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalUnitPrice.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 5 : 6} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.totalDiscount", "Giảm giá")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalDiscount.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 5 : 6} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.sumBeforeTax", "Tổng tiền trước thuế")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalBeforeTax.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 5 : 6} className="px-4 py-2 text-right border-t border-border font-bold">
                                {t("parameter.sumAfterTax", "Tổng tiền sau thuế")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border font-bold text-primary">{summary.totalAfterTax.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                    </tfoot>
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
