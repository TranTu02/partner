import { X, Trash2, Copy, Unlink, GripVertical, Check, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Matrix, SampleType } from "@/types/parameter";
import { useDrag, useDrop } from "react-dnd";
import { useRef, useMemo, useState, useEffect, memo, useCallback } from "react";
import { customerGetSampleTypes } from "@/api/customer";

const SortableAnalysisRow = memo(({ id, index, moveRow, children }: any) => {
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
});

export interface AnalysisWithQuantity extends Omit<Matrix, "createdAt" | "createdById" | "modifiedAt" | "modifiedById" | "feeAfterTax" | "taxRate"> {
    id: string;
    unitPrice: number;
    quantity: number;
    userQuantity?: number;
    feeAfterTax?: number;
    taxRate?: number;
    groupId?: string;
    groupDiscount?: number;
    discountRate?: number;
    analysisUnit?: string;
}

export interface SampleWithQuantity {
    id: string;
    sampleId?: string;
    sampleName: string;
    sampleMatrix?: string;
    sampleTypeName?: string;
    sampleTypeId?: string;
    sampleNote?: string;
    sampleInfo?: { label: string; value: string }[];
    analyses: AnalysisWithQuantity[];
    quantity?: number;
}

interface SampleCardProps {
    sample: SampleWithQuantity;
    sampleIndex: number;
    onRemoveSample: () => void;
    onDuplicateSample: (count: number) => void;
    onUpdateSample: (updates: Partial<SampleWithQuantity>) => void;
    onAddAnalysis: () => void;
    onRemoveAnalysis: (analysisId: string) => void;
    isReadOnly?: boolean;
    isAnalysesReadOnly?: boolean;
    isSamplesLocked?: boolean;
    showSampleQuantity?: boolean;
}

export function CustomerSampleCard({
    sample,
    sampleIndex,
    onRemoveSample,
    onDuplicateSample,
    onUpdateSample,
    onAddAnalysis,
    onRemoveAnalysis,
    isReadOnly = false,
    isAnalysesReadOnly = false,
    isSamplesLocked = false,
    showSampleQuantity = false,
}: SampleCardProps) {
    const { t } = useTranslation();
    const tableReadOnly = isReadOnly || isAnalysesReadOnly;
    const samplesLocked = isReadOnly || isSamplesLocked;

    const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
    const [stSearch, setStSearch] = useState("");
    const [isStDropdownOpen, setIsStDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchSampleTypes = async () => {
            try {
                const res = await customerGetSampleTypes({ query: { itemsPerPage: 200 } });
                if (res.success && res.data) {
                    setSampleTypes(res.data as SampleType[]);
                }
            } catch (err) {
                console.error("Failed to fetch sample types", err);
            }
        };
        fetchSampleTypes();
    }, []);

    // Local state for immediate feedback
    const [localName, setLocalName] = useState(sample.sampleName || "");
    const [localNote, setLocalNote] = useState(sample.sampleNote || "");
    const [localInfo, setLocalInfo] = useState(sample.sampleInfo || []);

    useEffect(() => {
        setLocalName(sample.sampleName || "");
    }, [sample.sampleName]);
    useEffect(() => {
        setLocalNote(sample.sampleNote || "");
    }, [sample.sampleNote]);
    useEffect(() => {
        setLocalInfo(sample.sampleInfo || []);
    }, [sample.sampleInfo]);

    const syncName = () => {
        if (localName !== sample.sampleName) onUpdateSample({ sampleName: localName });
    };
    const syncNote = () => {
        if (localNote !== sample.sampleNote) onUpdateSample({ sampleNote: localNote });
    };
    const syncInfo = (idx: number, val: string) => {
        const next = [...localInfo];
        next[idx] = { ...next[idx], value: val };
        onUpdateSample({ sampleInfo: next });
    };

    const calculateFeeAfterTax = (analysis: AnalysisWithQuantity) => {
        const unitPrice = analysis.unitPrice || 0;
        const quantity = analysis.quantity || 1;
        const discountRate = analysis.discountRate || 0;
        const taxRate = analysis.taxRate || 0;

        const feeBeforeTax = unitPrice * quantity;
        const afterDiscount = feeBeforeTax * (1 - discountRate / 100);
        const afterTax = afterDiscount * (1 + taxRate / 100);

        // If analysis.feeAfterTax is set and not 0, respect it. Otherwise use formula.
        if (analysis.feeAfterTax !== undefined && analysis.feeAfterTax !== 0) {
            return analysis.feeAfterTax;
        }

        return Math.ceil(afterTax);
    };

    const [duplicateCount, setDuplicateCount] = useState(1);
    const [isDuplicatePopoverOpen, setIsDuplicatePopoverOpen] = useState(false);

    const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
    };

    const handleAnalysisChange = (analysisIndex: number, field: keyof AnalysisWithQuantity, value: any) => {
        const newAnalyses = [...sample.analyses];
        const updatedAnalysis = { ...newAnalyses[analysisIndex] };

        // Basic generic update
        (updatedAnalysis as any)[field] = value;

        if (field === "feeAfterTax") {
            const newFeeAfterTax = Number(value);
            const quantity = updatedAnalysis.quantity || 1;
            const taxRate = updatedAnalysis.taxRate || 0;
            const discountRate = updatedAnalysis.discountRate || 0;
            const denominator = quantity * (1 - discountRate / 100) * (1 + taxRate / 100);
            if (denominator !== 0) updatedAnalysis.unitPrice = newFeeAfterTax / denominator;
        } else if (field === "unitPrice" || field === "taxRate" || field === "quantity" || field === "discountRate") {
            const up = field === "unitPrice" ? Number(value) : updatedAnalysis.unitPrice || 0;
            const tr = field === "taxRate" ? Number(value) : updatedAnalysis.taxRate || 0;
            const qty = field === "quantity" ? Number(value) : updatedAnalysis.quantity || 1;
            const dr = field === "discountRate" ? Number(value) : updatedAnalysis.discountRate || 0;

            const feeBeforeTax = up * qty;
            const afterDiscount = feeBeforeTax * (1 - dr / 100);
            updatedAnalysis.feeAfterTax = Math.ceil(afterDiscount * (1 + tr / 100));
        }

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

    const moveAnalysis = useCallback(
        (dragIndex: number, hoverIndex: number) => {
            const newAnalyses = [...sample.analyses];
            const [removed] = newAnalyses.splice(dragIndex, 1);
            newAnalyses.splice(hoverIndex, 0, removed);
            onUpdateSample({ analyses: newAnalyses });
        },
        [sample.analyses, onUpdateSample],
    );

    const summary = useMemo(() => {
        let totalUnitPrice = 0,
            totalDiscount = 0,
            totalBeforeTax = 0,
            totalTax = 0,
            totalAfterTax = 0;
        sample.analyses.forEach((a) => {
            const unitPrice = a.unitPrice || 0,
                quantity = a.quantity || 1,
                discountRate = a.discountRate || 0,
                taxRate = Number(a.taxRate ?? 0);
            const feeRaw = Math.round(unitPrice * quantity),
                discountVal = Math.round(feeRaw * (discountRate / 100)),
                feeNet = feeRaw - discountVal,
                taxVal = Math.round(feeNet * (taxRate / 100));
            // Use stored feeAfterTax if it exists and is non-zero, otherwise calculate
            const lineAfterTax = a.feeAfterTax !== undefined && a.feeAfterTax !== 0 ? a.feeAfterTax : feeNet + taxVal;

            totalUnitPrice += feeRaw;
            totalDiscount += discountVal;
            totalBeforeTax += feeNet;
            totalTax += taxVal;
            totalAfterTax += Math.round(lineAfterTax);
        });
        const sampleQuantity = sample.quantity || 1;
        return { totalUnitPrice, totalDiscount, totalBeforeTax, totalTax, totalAfterTax, sampleQuantity };
    }, [sample.analyses, sample.quantity]);

    const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

    return (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
                <div className={`flex-1 grid gap-4 ${showSampleQuantity ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}>
                    <div className="lg:col-span-1">
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("order.sampleName")} #{sampleIndex + 1} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onBlur={syncName}
                            placeholder={t("order.sampleNamePlaceholder")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="relative">
                        <label className="block mb-2 text-sm font-medium text-foreground">Loại mẫu</label>
                        <div className="relative">
                            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-10 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm h-10 disabled:opacity-50"
                                value={stSearch || sample.sampleTypeName || ""}
                                onChange={(e) => {
                                    setStSearch(e.target.value);
                                    setIsStDropdownOpen(true);
                                    onUpdateSample({ sampleTypeName: e.target.value });
                                }}
                                onFocus={() => setIsStDropdownOpen(true)}
                                placeholder="Ví dụ: Thực phẩm..."
                                disabled={isReadOnly}
                            />
                            {(stSearch || sample.sampleTypeName) && !isReadOnly && (
                                <button
                                    onClick={() => {
                                        setStSearch("");
                                        onUpdateSample({ sampleTypeName: "", sampleTypeId: "" });
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            {isStDropdownOpen && !isReadOnly && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsStDropdownOpen(false)} />
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-60 overflow-auto p-1 animate-in fade-in zoom-in-95 duration-200">
                                        {sampleTypes
                                            .filter((st) => st.sampleTypeName.toLowerCase().includes(stSearch.toLowerCase()))
                                            .map((st) => (
                                                <button
                                                    key={st.sampleTypeId}
                                                    onClick={() => {
                                                        onUpdateSample({
                                                            sampleTypeName: st.sampleTypeName,
                                                            sampleTypeId: st.sampleTypeId,
                                                        });
                                                        setStSearch("");
                                                        setIsStDropdownOpen(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 rounded flex items-center justify-between group"
                                                >
                                                    <span>{st.sampleTypeName}</span>
                                                    <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">{st.sampleTypeId}</span>
                                                </button>
                                            ))}
                                        {sampleTypes.filter((st) => st.sampleTypeName.toLowerCase().includes(stSearch.toLowerCase())).length === 0 && (
                                            <div className="px-3 py-4 text-center text-sm text-muted-foreground italic">{t("common.noResults")}</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("sample.note")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={localNote}
                            onChange={(e) => setLocalNote(e.target.value)}
                            onBlur={syncNote}
                            placeholder={t("sample.note")}
                            disabled={isReadOnly}
                        />
                    </div>
                    {showSampleQuantity && (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">{t("order.print.quantity")}</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                value={sample.quantity || 1}
                                onChange={(e) => onUpdateSample({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                onKeyDown={handleNumberKeyDown}
                                min={1}
                                disabled={isReadOnly}
                            />
                        </div>
                    )}
                </div>
                {!samplesLocked && (
                    <div className="flex gap-2 mt-8">
                        <Popover open={isDuplicatePopoverOpen} onOpenChange={setIsDuplicatePopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                    <Copy className="w-5 h-5" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-3" align="end">
                                <div className="space-y-3">
                                    <div className="text-xs font-medium text-muted-foreground">{t("order.duplicateCount")}</div>
                                    <div className="flex gap-2">
                                        <Input type="number" value={duplicateCount} onChange={(e) => setDuplicateCount(Math.max(1, parseInt(e.target.value) || 1))} className="h-8 text-sm" min={1} />
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
                        <button onClick={onRemoveSample} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {sample.sampleInfo && sample.sampleInfo.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-muted/10 rounded-lg border border-border/50">
                    {localInfo.map((info: any, idx: number) => {
                        if (info.label === "Tên mẫu thử") return null;
                        return (
                            <div key={idx}>
                                <label className="block mb-1.5 text-xs font-medium text-muted-foreground">{info.label}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-1.5 border border-border rounded-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                    value={info.value || ""}
                                    onChange={(e) => {
                                        const next = [...localInfo];
                                        next[idx] = { ...next[idx], value: e.target.value };
                                        setLocalInfo(next);
                                    }}
                                    onBlur={(e) => syncInfo(idx, e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder={info.label}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            {!tableReadOnly && <th className="px-4 py-3 w-10 text-center"></th>}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.stt")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.parameter")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Nền mẫu</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("parameter.protocol", "Phương pháp")}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("parameter.accreditation", "Công nhận")}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Nơi thực hiện</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.unit", "Đơn vị")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[130px]">{t("order.print.unitPrice")}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("parameter.tax")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[150px]">{t("order.lineTotal")}</th>
                            {!tableReadOnly && <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("common.action")}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sample.analyses.length === 0 ? (
                            <tr>
                                <td colSpan={tableReadOnly ? 10 : 12} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                    {t("order.noAnalyses")}
                                </td>
                            </tr>
                        ) : (
                            sample.analyses.map((analysis, index) => (
                                <SortableAnalysisRow key={analysis.id} id={analysis.id} index={index} moveRow={moveAnalysis}>
                                    {(dragRef: any) => (
                                        <>
                                            {!tableReadOnly && (
                                                <td className={`px-4 py-3 w-10 text-center ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    <div ref={dragRef} className="cursor-grab active:cursor-grabbing">
                                                        <GripVertical className="w-5 h-5 mx-auto text-muted-foreground hover:text-foreground" />
                                                    </div>
                                                </td>
                                            )}
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>{index + 1}</td>
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {tableReadOnly ? (
                                                    <div>
                                                        <div>{analysis.parameterName}</div>
                                                        {analysis.parameterId && <div className="text-xs text-muted-foreground">{analysis.parameterId}</div>}
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
                                                {analysis.sampleTypeName || "--"}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {tableReadOnly ? (
                                                    (analysis as any).protocolCode
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent"
                                                        value={(analysis as any).protocolCode || ""}
                                                        onChange={(e) => handleAnalysisChange(index, "protocolCode" as any, e.target.value)}
                                                        placeholder={t("parameter.protocol")}
                                                    />
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-center ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {(() => {
                                                        if ((analysis as any).protocolAccreditation) {
                                                            const accs = Object.entries((analysis as any).protocolAccreditation)
                                                                .filter(([, v]) => v)
                                                                .map(([k]) => k);
                                                            if (accs.length > 0) {
                                                                return accs.map((k) => (
                                                                    <span key={k} className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold">
                                                                        {k}
                                                                    </span>
                                                                ));
                                                            }
                                                        }
                                                        return "--";
                                                    })()}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-center text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {tableReadOnly ? (
                                                    (analysis as any).protocolSource || "--"
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-center"
                                                        value={(analysis as any).protocolSource || ""}
                                                        onChange={(e) => handleAnalysisChange(index, "protocolSource" as any, e.target.value)}
                                                        placeholder="Nơi thực hiện"
                                                    />
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {tableReadOnly ? (
                                                    analysis.analysisUnit
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent"
                                                        value={analysis.analysisUnit || ""}
                                                        onChange={(e) => handleAnalysisChange(index, "analysisUnit", e.target.value)}
                                                        placeholder={t("order.print.unit", "Đơn vị")}
                                                    />
                                                )}
                                            </td>
                                            <td className={`px-2 py-3 text-right text-sm text-foreground w-[130px] ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                <div className="flex flex-col items-end">
                                                    {(analysis.unitPrice * (1 - (analysis.discountRate || 0) / 100)).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} đ
                                                    {(Number(analysis.discountRate) || 0) > 0 && (
                                                        <span className="text-xs text-muted-foreground line-through block italic">{analysis.unitPrice.toLocaleString("vi-VN")} đ</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-center text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {tableReadOnly ? (
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
                                                        />
                                                        <span className="ml-1">%</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                className={`px-2 py-3 text-right text-sm font-medium text-foreground w-[150px] ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}
                                            >
                                                {tableReadOnly ? (
                                                    calculateFeeAfterTax(analysis).toLocaleString("vi-VN") + " đ"
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <input
                                                            type="number"
                                                            className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right"
                                                            value={analysis.feeAfterTax ?? calculateFeeAfterTax(analysis)}
                                                            onChange={(e) => handleAnalysisChange(index, "feeAfterTax", e.target.value)}
                                                            onKeyDown={handleNumberKeyDown}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            {!tableReadOnly && (
                                                <td className={`px-4 py-3 text-center ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        {analysis.parameterId && (
                                                            <button onClick={() => handleUnlinkAnalysis(index)} className="p-1 text-muted-foreground hover:text-orange-500 transition-colors">
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
                                                            onMouseLeave={() => setHoveredGroupId(null)}
                                                            className={`p-1 text-muted-foreground hover:text-destructive transition-colors ${analysis.groupId && hoveredGroupId === analysis.groupId ? "text-destructive bg-destructive/10 rounded" : ""}`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </>
                                    )}
                                </SortableAnalysisRow>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-muted/20 font-medium">
                        <tr>
                            <td colSpan={isReadOnly ? 9 : 11} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.sumUnitPrice", "Tổng đơn giá")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalUnitPrice.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 9 : 11} className="px-4 py-2 text-right border-t border-border">
                                {t("parameter.totalDiscount", "Chiết khấu")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border">{summary.totalDiscount.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 9 : 11} className="px-4 py-2 text-right border-t border-border text-sm italic">
                                {t("parameter.sumBeforeTax", "Tiền trước thuế")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border text-sm italic">{summary.totalBeforeTax.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 9 : 11} className="px-4 py-2 text-right border-t border-border text-xs text-muted-foreground">
                                {t("parameter.totalTax", "Tiền thuế (VAT)")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border text-xs text-muted-foreground">{summary.totalTax.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                        </tr>
                        <tr>
                            <td colSpan={isReadOnly ? 9 : 11} className="px-4 py-2 text-right border-t border-border font-bold">
                                {t("parameter.sumAfterTax", "Tổng tiền")}:
                            </td>
                            <td className="px-4 py-2 text-right border-t border-border font-bold text-primary">{summary.totalAfterTax.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {!tableReadOnly && (
                <div className="mt-4">
                    <button onClick={onAddAnalysis} className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">
                        + {t("order.addAnalysis")}
                    </button>
                </div>
            )}
        </div>
    );
}

CustomerSampleCard.displayName = "CustomerSampleCard";
