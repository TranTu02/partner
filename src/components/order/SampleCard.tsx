import { X, Trash2, Copy, Unlink, GripVertical, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Matrix } from "@/types/parameter";

export interface AnalysisWithQuantity extends Omit<Matrix, "createdAt" | "createdById" | "modifiedAt" | "modifiedById" | "feeAfterTax" | "taxRate"> {
    id: string;
    unitPrice: number;
    quantity: number;
    userQuantity?: number;
    feeAfterTax?: number; // Renamed from totalFeeBeforeTax, represents the line total (ThÃ nh tiá» n)
    taxRate?: number; // Ensure taxRate is also consistently typed as number
    groupId?: string;
    groupDiscount?: number;
    discountRate?: number;
    displayStyle?: any;
    isCustom?: boolean;
}

import { useDrag, useDrop } from "react-dnd";
import { useRef, useMemo, useState, useEffect } from "react";
import { getSampleTypes, getParameters } from "@/api/index";

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
    sampleTypeId?: string;
    sampleTypeName?: string;
    sampleName: string;
    sampleNote?: string;
    analyses: AnalysisWithQuantity[];
    quantity?: number;
    sampleInfo?: { label: string; value: string }[];
}

const DEFAULT_SAMPLE_INFO_LABELS = ["Số lô", "Ngày sản xuất", "Hạn sử dụng", "Nơi sản xuất", "Số công bố", "Số đăng ký", "Thông tin khác"];

interface SampleCardProps {
    sample: SampleWithQuantity;
    sampleIndex: number;
    onRemoveSample: () => void;
    onDuplicateSample: (count: number) => void;
    onUpdateSample: (updates: Partial<SampleWithQuantity>) => void;
    onAddAnalysis: () => void;
    onAddCustomAnalysis?: () => void;
    onRemoveAnalysis: (analysisId: string) => void;
    isReadOnly?: boolean;
    showSampleQuantity?: boolean;
    isQuote?: boolean;
    globalDiscountRate?: number;
}

export function SampleCard({
    sample,
    sampleIndex,
    onRemoveSample,
    onDuplicateSample,
    onUpdateSample,
    onAddAnalysis,
    onAddCustomAnalysis,
    onRemoveAnalysis,
    isReadOnly = false,
    showSampleQuantity = false,
    isQuote = false,
    globalDiscountRate = 0,
}: SampleCardProps) {
    const { t } = useTranslation();

    const handleUpdateSampleInfoByLabel = (label: string, value: string) => {
        const currentInfo = [...(sample.sampleInfo || [])];
        const foundIdx = currentInfo.findIndex((i) => i.label === label);
        if (foundIdx >= 0) {
            currentInfo[foundIdx] = { ...currentInfo[foundIdx], value };
        } else {
            currentInfo.push({ label, value });
        }
        onUpdateSample({ sampleInfo: currentInfo });
    };

    // Calculates the fee after tax for a line item.
    // User's formula: feeAfterTax = feeBeforeTax * ( 1 - discountRate/100) * ( 1 + taxRate/100)
    // where feeBeforeTax here implies unitPrice * quantity
    const calculateFeeAfterTax = (analysis: AnalysisWithQuantity) => {
        const unitPrice = analysis.unitPrice || 0;
        const quantity = (sample.quantity || 1) * (analysis.quantity || 1);
        const discountRate = analysis.discountRate || 0;
        const taxRate = analysis.taxRate || 0;

        const feeBeforeTax = unitPrice * quantity;
        const afterDiscount = feeBeforeTax * (1 - discountRate / 100);
        const afterGlobalDiscount = afterDiscount * (1 - globalDiscountRate / 100);
        const afterTax = afterGlobalDiscount * (1 + taxRate / 100);

        return Math.round(afterTax);
    };

    const [duplicateCount, setDuplicateCount] = useState(1);
    const [isDuplicatePopoverOpen, setIsDuplicatePopoverOpen] = useState(false);

    const [sampleTypes, setSampleTypes] = useState<any[]>([]);
    const [showSampleTypeDropdown, setShowSampleTypeDropdown] = useState(false);

    const [searchedParameters, setSearchedParameters] = useState<any[]>([]);
    const [searchedSampleTypes, setSearchedSampleTypes] = useState<any[]>([]);
    const [activeParamDropdownIndex, setActiveParamDropdownIndex] = useState<number | null>(null);
    const [activeSampleTypeDropdownIndex, setActiveSampleTypeDropdownIndex] = useState<number | null>(null);

    const activeParamName = activeParamDropdownIndex !== null ? (sample.analyses[activeParamDropdownIndex]?.parameterName || "") : "";
    const activeSampleTypeName = activeSampleTypeDropdownIndex !== null ? (sample.analyses[activeSampleTypeDropdownIndex]?.sampleTypeName || "") : "";

    useEffect(() => {
        if (activeParamDropdownIndex === null) {
            setSearchedParameters([]);
            return;
        }
        const timer = setTimeout(() => {
            getParameters({
                query: {
                    search: activeParamName || undefined,
                    page: 1,
                    itemsPerPage: 50,
                    sortColumn: "createdAt",
                    sortDirection: "DESC",
                },
            }).then((res) => {
                if (res.success && res.data) {
                    setSearchedParameters(res.data as any[]);
                }
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [activeParamName, activeParamDropdownIndex]);

    useEffect(() => {
        if (activeSampleTypeDropdownIndex === null) {
            setSearchedSampleTypes([]);
            return;
        }
        const timer = setTimeout(() => {
            getSampleTypes({
                query: {
                    search: activeSampleTypeName || undefined,
                    page: 1,
                    itemsPerPage: 50,
                    sortColumn: "createdAt",
                    sortDirection: "DESC",
                },
            }).then((res) => {
                if (res.success && res.data) {
                    setSearchedSampleTypes(res.data as any[]);
                }
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [activeSampleTypeName, activeSampleTypeDropdownIndex]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (showSampleTypeDropdown) {
                getSampleTypes({
                    query: {
                        search: sample.sampleTypeName || undefined,
                        page: 1,
                        itemsPerPage: 20,
                        sortColumn: "createdAt",
                        sortDirection: "DESC",
                    },
                }).then((res) => {
                    if (res.success && res.data) {
                        setSampleTypes(res.data as any[]);
                    }
                });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [sample.sampleTypeName, showSampleTypeDropdown]);

    const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    };

    const initialAnalysesRef = useRef<Record<string, { protocolCode: string | null; protocolId: string | null }>>({});

    useEffect(() => {
        sample.analyses.forEach((a) => {
            if (!initialAnalysesRef.current[a.id]) {
                initialAnalysesRef.current[a.id] = {
                    protocolCode: (a as any).protocolCode || null,
                    protocolId: (a as any).protocolId || null,
                };
            }
        });
    }, [sample.analyses]);

    const handleAnalysisChange = (
        analysisIndex: number, 
        fieldOrUpdates: keyof AnalysisWithQuantity | Partial<AnalysisWithQuantity>, 
        value?: any
    ) => {
        const newAnalyses = [...sample.analyses];
        const updatedAnalysis = { ...newAnalyses[analysisIndex] };

        if (typeof fieldOrUpdates === "object" && fieldOrUpdates !== null) {
            Object.assign(updatedAnalysis, fieldOrUpdates);
        } else {
            const field = fieldOrUpdates as keyof AnalysisWithQuantity;
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

                const quantity = updatedAnalysis.quantity || 1;
                const discountRate = updatedAnalysis.discountRate || 0;
                const currentUnitPrice = updatedAnalysis.unitPrice || 0;

                const feeBeforeTax = currentUnitPrice * quantity;
                const afterDiscount = feeBeforeTax * (1 - discountRate / 100);
                updatedAnalysis.feeAfterTax = afterDiscount * (1 + newTaxRate / 100);
            } else if (field === ("protocolCode" as any)) {
                const newValue = value;
                const initial = initialAnalysesRef.current[updatedAnalysis.id];
                if (newValue) {
                    (updatedAnalysis as any).protocolCode = newValue;
                    (updatedAnalysis as any).protocolId = null;
                } else {
                    if (initial && initial.protocolId) {
                        (updatedAnalysis as any).protocolCode = initial.protocolCode;
                        (updatedAnalysis as any).protocolId = initial.protocolId;
                    } else {
                        (updatedAnalysis as any).protocolCode = "";
                        (updatedAnalysis as any).protocolId = null;
                    }
                }
            } else {
                (updatedAnalysis as any)[field] = value;
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
            const lineDiscountRate = a.discountRate || 0;
            const taxRate = a.taxRate || 0;

            const feeRaw = unitPrice * quantity;

            // Apply line discount
            const lineDiscountVal = feeRaw * (lineDiscountRate / 100);
            const feeNetLine = feeRaw - lineDiscountVal;

            // Apply global discount (Quote specific)
            const globalDiscountVal = feeNetLine * (globalDiscountRate / 100);
            const feeNetFinal = feeNetLine - globalDiscountVal;

            // Compute total discount combining both
            const combinedDiscountVal = lineDiscountVal + globalDiscountVal;

            const lineAfterTax = feeNetFinal * (1 + taxRate / 100);

            totalUnitPrice += feeRaw;
            totalDiscount += combinedDiscountVal;
            totalBeforeTax += feeNetFinal;
            totalAfterTax += isQuote ? lineAfterTax : (a.feeAfterTax || lineAfterTax);
        });

        const sampleQuantity = sample.quantity || 1;

        return { totalUnitPrice, totalDiscount, totalBeforeTax, totalAfterTax, sampleQuantity };
    }, [sample.analyses, sample.quantity, isQuote, globalDiscountRate]);

    const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

    return (
        <div className="bg-card rounded-lg border border-border p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <div className={`flex-1 grid gap-4 ${showSampleQuantity ? "grid-cols-6" : "grid-cols-5"}`}>
                    <div className="col-span-2">
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
                    <div className="col-span-1 relative">
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("order.sampleMatrix")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={sample.sampleTypeName || ""}
                            onChange={(e) => onUpdateSample({ sampleTypeName: e.target.value, sampleTypeId: "" })}
                            onFocus={() => setShowSampleTypeDropdown(true)}
                            onBlur={() => setTimeout(() => setShowSampleTypeDropdown(false), 200)}
                            placeholder={t("order.sampleMatrixPlaceholder", "Nền mẫu")}
                            disabled={isReadOnly}
                        />
                        {showSampleTypeDropdown && !isReadOnly && sampleTypes.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {sampleTypes.map((st) => (
                                    <div
                                        key={st.sampleTypeId}
                                        className="px-3 py-2 cursor-pointer hover:bg-muted text-sm text-foreground border-b border-border/50 last:border-0"
                                        onClick={() => {
                                            onUpdateSample({
                                                sampleTypeId: st.sampleTypeId,
                                                sampleTypeName: st.sampleTypeName,
                                            });
                                            setShowSampleTypeDropdown(false);
                                        }}
                                    >
                                        {st.sampleTypeName}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className={showSampleQuantity ? "col-span-2" : "col-span-2"}>
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
                    {showSampleQuantity && (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">{t("order.print.quantity")}</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={sample.quantity || 1}
                                onChange={(e) => onUpdateSample({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                onKeyDown={handleNumberKeyDown}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={1}
                                disabled={isReadOnly}
                            />
                        </div>
                    )}
                </div>
                {!isReadOnly && (
                    <div className="flex gap-2 mt-8">
                        <Popover open={isDuplicatePopoverOpen} onOpenChange={setIsDuplicatePopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title={t("order.duplicateSample")}>
                                    <Copy className="w-5 h-5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-3" align="end">
                                <div className="space-y-3">
                                    <div className="text-xs font-medium text-muted-foreground">{t("order.duplicateCount", "Sá»‘ lÆ°á»£ng nhÃ¢n báº£n")}</div>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={duplicateCount}
                                            onChange={(e) => setDuplicateCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    onDuplicateSample(duplicateCount);
                                                    setIsDuplicatePopoverOpen(false);
                                                    setDuplicateCount(1);
                                                }
                                            }}
                                            className="h-8 text-sm"
                                            autoFocus
                                            min={1}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                                onDuplicateSample(duplicateCount);
                                                setIsDuplicatePopoverOpen(false);
                                                setDuplicateCount(1);
                                            }}
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
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

            {/* Detailed Sample Info */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 p-4 bg-muted/20 rounded-xl border border-border/50 shadow-inner">
                {DEFAULT_SAMPLE_INFO_LABELS.map((label) => {
                    const info = (sample.sampleInfo || []).find((i) => i.label === label);
                    const isTextArea = label === "Thông tin khác";
                    return (
                        <div key={label} className={isTextArea ? "col-span-2 sm:col-span-2 lg:col-span-2" : "col-span-1"}>
                            <label className="block mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
                            {isTextArea ? (
                                <textarea
                                    className="w-full px-3 py-1.5 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={info?.value || ""}
                                    onChange={(e) => handleUpdateSampleInfoByLabel(label, e.target.value)}
                                    placeholder={label}
                                    disabled={isReadOnly}
                                />
                            ) : (
                                <input
                                    type="text"
                                    className="w-full px-3 py-1.5 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={info?.value || ""}
                                    onChange={(e) => handleUpdateSampleInfoByLabel(label, e.target.value)}
                                    placeholder={label}
                                    disabled={isReadOnly}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            {!isReadOnly && <th className="px-4 py-3 w-10 text-center"></th>}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.stt")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.parameter")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.sampleMatrix")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("parameter.protocol", "Phương pháp")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("parameter.accreditation", "Chỉ định")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[130px]">{t("order.print.unitPrice")}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("parameter.tax")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[150px]">{t("order.lineTotal")}</th>
                            {!isReadOnly && <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("common.action")}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sample.analyses.length === 0 ? (
                            <tr>
                                <td colSpan={isReadOnly ? 8 : 10} className="px-4 py-8 text-center text-muted-foreground text-sm">
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
                                                        <div>
                                                            <div>{analysis.parameterName}</div>
                                                            {analysis.parameterId && <div className="text-xs text-muted-foreground">{analysis.parameterId}</div>}
                                                        </div>
                                                    ) : analysis.isCustom ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-background text-sm font-semibold mb-1"
                                                                value={analysis.parameterName || ""}
                                                                onChange={(e) => {
                                                                    handleAnalysisChange(index, {
                                                                        parameterName: e.target.value,
                                                                        parameterId: ""
                                                                    });
                                                                    setActiveParamDropdownIndex(index);
                                                                }}
                                                                onFocus={() => {
                                                                    setActiveParamDropdownIndex(index);
                                                                    setActiveSampleTypeDropdownIndex(null);
                                                                }}
                                                                onBlur={() => {
                                                                    setTimeout(() => {
                                                                        setActiveParamDropdownIndex(prev => prev === index ? null : prev);
                                                                    }, 200);
                                                                }}
                                                                placeholder={t("order.print.parameter") || "Nhập tên chỉ tiêu..."}
                                                            />
                                                            {!analysis.parameterId && (
                                                                <div className="text-[10px] text-destructive font-medium mt-0.5 animate-pulse">
                                                                    * Yêu cầu chọn từ danh sách
                                                                </div>
                                                            )}
                                                            {activeParamDropdownIndex === index && (
                                                                <div className="absolute z-50 w-72 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto left-0 top-full">
                                                                    {searchedParameters.length === 0 ? (
                                                                        <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                                                            Không tìm thấy chỉ tiêu
                                                                        </div>
                                                                    ) : (
                                                                        searchedParameters.map((p) => (
                                                                            <div
                                                                                key={p.parameterId}
                                                                                className="px-3 py-2 cursor-pointer hover:bg-muted text-xs text-foreground border-b border-border/50 last:border-0 font-semibold"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    handleAnalysisChange(index, {
                                                                                        parameterId: p.parameterId,
                                                                                        parameterName: p.parameterName,
                                                                                        displayStyle: p.displayStyle
                                                                                    });
                                                                                    setActiveParamDropdownIndex(null);
                                                                                }}
                                                                            >
                                                                                {p.parameterName}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <input
                                                                type="text"
                                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent mb-1"
                                                                value={analysis.parameterName}
                                                                onChange={(e) => handleAnalysisChange(index, "parameterName", e.target.value)}
                                                                placeholder={t("order.print.parameter")}
                                                            />
                                                            {analysis.parameterId && <div className="text-xs text-muted-foreground px-2">{analysis.parameterId}</div>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    {isReadOnly ? (
                                                        analysis.sampleTypeName
                                                    ) : analysis.isCustom ? (
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-background text-sm font-semibold"
                                                                value={analysis.sampleTypeName || sample.sampleTypeName || ""}
                                                                onChange={(e) => {
                                                                    handleAnalysisChange(index, {
                                                                        sampleTypeName: e.target.value,
                                                                        sampleTypeId: ""
                                                                    });
                                                                    setActiveSampleTypeDropdownIndex(index);
                                                                }}
                                                                onFocus={() => {
                                                                    setActiveSampleTypeDropdownIndex(index);
                                                                    setActiveParamDropdownIndex(null);
                                                                }}
                                                                onBlur={() => {
                                                                    setTimeout(() => {
                                                                        setActiveSampleTypeDropdownIndex(prev => prev === index ? null : prev);
                                                                    }, 200);
                                                                }}
                                                                placeholder={t("order.sampleMatrixPlaceholder", "Chọn nền mẫu...")}
                                                            />
                                                            {activeSampleTypeDropdownIndex === index && (
                                                                <div className="absolute z-50 w-64 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto left-0 top-full">
                                                                    {searchedSampleTypes.length === 0 ? (
                                                                        <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                                                                            Không tìm thấy nền mẫu
                                                                        </div>
                                                                    ) : (
                                                                        searchedSampleTypes.map((st) => (
                                                                            <div
                                                                                key={st.sampleTypeId}
                                                                                className="px-3 py-2 cursor-pointer hover:bg-muted text-xs text-foreground border-b border-border/50 last:border-0 font-semibold"
                                                                                onMouseDown={(e) => {
                                                                                    e.preventDefault();
                                                                                    handleAnalysisChange(index, {
                                                                                        sampleTypeId: st.sampleTypeId,
                                                                                        sampleTypeName: st.sampleTypeName
                                                                                    });
                                                                                    setActiveSampleTypeDropdownIndex(null);
                                                                                }}
                                                                            >
                                                                                {st.sampleTypeName}
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        analysis.sampleTypeName || sample.sampleTypeName
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    {isReadOnly ? (
                                                        (analysis as any).protocolCode
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent"
                                                            value={(analysis as any).protocolId ? "" : ((analysis as any).protocolCode || "")}
                                                            onChange={(e) => handleAnalysisChange(index, "protocolCode" as any, e.target.value)}
                                                            placeholder="Thống nhất với IRDOP"
                                                        />
                                                    )}
                                                </td>
                                                <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    {(() => {
                                                        let accHtml = "--";
                                                        let accObj = analysis.protocolAccreditation;
                                                        if (typeof accObj === "string" && accObj.startsWith("{")) {
                                                            try {
                                                                accObj = JSON.parse(accObj);
                                                            } catch {
                                                                accObj = null;
                                                            }
                                                        }
                                                        if (accObj && typeof accObj === "object") {
                                                            const accs = Object.entries(accObj)
                                                                .filter(([, v]) => v)
                                                                .map(([k]) => k);
                                                            if (accs.length > 0) accHtml = accs.join(", ");
                                                        }
                                                        return accHtml;
                                                    })()}
                                                </td>
                                                <td className={`px-2 py-3 text-right text-sm text-foreground w-[130px] ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    <div className="flex flex-col items-end">
                                                        {isReadOnly ? (
                                                            (() => {
                                                                const sampleQty = sample.quantity || 1;
                                                                const analysisQty = analysis.quantity || 1;
                                                                const totalQty = isQuote ? (sampleQty * analysisQty) : 1;

                                                                const originalUP = (Number(analysis.unitPrice) || 0) * totalQty;
                                                                const lineDiscountRate = Number(analysis.discountRate) || 0;
                                                                const actualUP = originalUP * (1 - lineDiscountRate / 100);
                                                                const discountedUP = actualUP * (1 - globalDiscountRate / 100);
                                                                const hasDiscount = isQuote && discountedUP < originalUP - 0.1;

                                                                if (hasDiscount) {
                                                                    return (
                                                                        <>
                                                                            <span className="font-bold">{discountedUP.toLocaleString("vi-VN")} đ</span>
                                                                            <span className="text-[10px] text-muted-foreground line-through">{originalUP.toLocaleString("vi-VN")} đ</span>
                                                                        </>
                                                                    );
                                                                }
                                                                return originalUP.toLocaleString("vi-VN") + " đ";
                                                            })()
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right"
                                                                value={Math.round((analysis.unitPrice || 0) * (isQuote ? (sample.quantity || 1) * (analysis.quantity || 1) : 1))}
                                                                onChange={(e) => {
                                                                    const totalQty = isQuote ? (sample.quantity || 1) * (analysis.quantity || 1) : 1;
                                                                    handleAnalysisChange(index, "unitPrice", Number(e.target.value) / totalQty);
                                                                }}
                                                                onKeyDown={handleNumberKeyDown}
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                            />
                                                        )}
                                                        {!isQuote && (Number(analysis.discountRate) || 0) > 0 && (
                                                            <span className="text-xs text-green-600 font-medium leading-none block mt-1">(-{analysis.discountRate}%)</span>
                                                        )}
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
                                                                onFocus={(e) => e.target.select()}
                                                                onKeyDown={handleNumberKeyDown}
                                                                onWheel={(e) => e.currentTarget.blur()}
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
                                                        (() => {
                                                            const quantity = (sample.quantity || 1) * (analysis.quantity || 1);
                                                            const originalUP = Number(analysis.unitPrice) || 0;
                                                            const taxRate = Number(analysis.taxRate) || 0;

                                                            const originalTotal = originalUP * quantity * (1 + taxRate / 100);
                                                            const finalTotal = calculateFeeAfterTax(analysis);
                                                            const hasDiscount = isQuote && finalTotal < originalTotal - 0.1;

                                                            if (hasDiscount) {
                                                                return (
                                                                    <>
                                                                        <span className="font-bold text-primary">{finalTotal.toLocaleString("vi-VN")} đ</span>
                                                                        <span className="text-[10px] text-muted-foreground line-through block">{originalTotal.toLocaleString("vi-VN")} đ</span>
                                                                    </>
                                                                );
                                                            }
                                                            return finalTotal.toLocaleString("vi-VN") + " đ";
                                                        })()
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <input
                                                                type="number"
                                                                className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right"
                                                                value={analysis.feeAfterTax || calculateFeeAfterTax(analysis)} // Display feeAfterTax, calculate if not set
                                                                onChange={(e) => handleAnalysisChange(index, "feeAfterTax", e.target.value)}
                                                                onKeyDown={handleNumberKeyDown}
                                                                onWheel={(e) => e.currentTarget.blur()}
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
                            <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.sumUnitPrice", "Tổng đơn giá")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalUnitPrice.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.totalDiscount", "Chiết khấu")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalDiscount.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.sumBeforeTax", "Tiền trước thuế")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalBeforeTax.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-right border-t border-border font-bold">
                                {t("parameter.sumAfterTax", "Tổng tiền")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border font-bold">{summary.totalAfterTax.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                            {!isReadOnly && <td className="border-t border-border"></td>}
                        </tr>
                        {showSampleQuantity && (
                            <tr>
                                <td colSpan={isReadOnly ? 7 : 8} className="px-4 py-2 text-right border-t border-border font-bold">
                                    {t("sample.grandTotal", "Tổng cộng (x{{qty}} mẫu)", { qty: summary.sampleQuantity })}:
                                </td>
                                <td className="px-4 py-2 text-right border-t border-border font-bold">
                                    {(summary.totalAfterTax * summary.sampleQuantity).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ
                                </td>
                                {!isReadOnly && <td className="border-t border-border"></td>}
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>

            {/* Add Analysis Button */}
            {!isReadOnly && (
                <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={onAddAnalysis} className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">
                        + {t("order.addAnalysis")}
                    </button>
                    {onAddCustomAnalysis && (
                        <button 
                            type="button"
                            onClick={onAddCustomAnalysis} 
                            className="px-4 py-2 text-amber-600 border border-amber-600 bg-amber-50/50 hover:bg-amber-100/60 rounded-lg transition-colors text-sm font-medium"
                        >
                            + Thêm chỉ tiêu ngoài danh sách
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
