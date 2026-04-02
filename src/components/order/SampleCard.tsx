import { X, Trash2, Copy, Unlink, GripVertical, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Matrix } from "@/types/parameter";
import { useDrag, useDrop } from "react-dnd";
import { useRef, useMemo, useState, useEffect, memo, useCallback } from "react";

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
    showSampleQuantity?: boolean;
}

export const SampleCard = memo(({
    sample,
    sampleIndex,
    onRemoveSample,
    onDuplicateSample,
    onUpdateSample,
    onAddAnalysis,
    onRemoveAnalysis,
    isReadOnly = false,
    showSampleQuantity = false,
}: SampleCardProps) => {
    const { t } = useTranslation();

    // Local state for immediate feedback
    const [localName, setLocalName] = useState(sample.sampleName || "");
    const [localNote, setLocalNote] = useState(sample.sampleNote || "");
    const [localInfo, setLocalInfo] = useState(sample.sampleInfo || []);

    useEffect(() => { setLocalName(sample.sampleName || ""); }, [sample.sampleName]);
    useEffect(() => { setLocalNote(sample.sampleNote || ""); }, [sample.sampleNote]);
    useEffect(() => { setLocalInfo(sample.sampleInfo || []); }, [sample.sampleInfo]);

    const syncName = () => { if (localName !== sample.sampleName) onUpdateSample({ sampleName: localName }); };
    const syncNote = () => { if (localNote !== sample.sampleNote) onUpdateSample({ sampleNote: localNote }); };
    const syncInfo = (idx: number, val: string) => {
        const next = [...localInfo];
        next[idx] = { ...next[idx], value: val };
        onUpdateSample({ sampleInfo: next });
    };

    const calculateFeeAfterTax = (analysis: AnalysisWithQuantity) => {
        if (analysis.feeAfterTax !== undefined) return analysis.feeAfterTax;
        const unitPrice = analysis.unitPrice || 0;
        const quantity = analysis.quantity || 1;
        const discountRate = analysis.discountRate || 0;
        const taxRate = analysis.taxRate || 0;
        const feeBeforeTax = unitPrice * quantity;
        const afterDiscount = feeBeforeTax * (1 - discountRate / 100);
        return afterDiscount * (1 + taxRate / 100);
    };

    const [duplicateCount, setDuplicateCount] = useState(1);
    const [isDuplicatePopoverOpen, setIsDuplicatePopoverOpen] = useState(false);

    const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
    };

    const handleAnalysisChange = (analysisIndex: number, field: keyof AnalysisWithQuantity, value: any) => {
        const newAnalyses = [...sample.analyses];
        const updatedAnalysis = { ...newAnalyses[analysisIndex] };

        if (field === "parameterName") {
            updatedAnalysis.parameterName = value;
        } else if (field === "feeAfterTax") {
            const newFeeAfterTax = Number(value);
            updatedAnalysis.feeAfterTax = newFeeAfterTax;
            const quantity = updatedAnalysis.quantity || 1;
            const taxRate = updatedAnalysis.taxRate || 0;
            const discountRate = updatedAnalysis.discountRate || 0;
            const denominator = quantity * (1 - discountRate / 100) * (1 + taxRate / 100);
            if (denominator !== 0) updatedAnalysis.unitPrice = newFeeAfterTax / denominator;
        } else if (field === "unitPrice") {
            const newUnitPrice = Number(value);
            updatedAnalysis.unitPrice = newUnitPrice;
            const quantity = updatedAnalysis.quantity || 1;
            const taxRate = updatedAnalysis.taxRate || 0;
            const discountRate = updatedAnalysis.discountRate || 0;
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
        } else if (field === "analysisUnit") {
            updatedAnalysis.analysisUnit = value;
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

    const moveAnalysis = useCallback((dragIndex: number, hoverIndex: number) => {
        const newAnalyses = [...sample.analyses];
        const [removed] = newAnalyses.splice(dragIndex, 1);
        newAnalyses.splice(hoverIndex, 0, removed);
        onUpdateSample({ analyses: newAnalyses });
    }, [sample.analyses, onUpdateSample]);

    const summary = useMemo(() => {
        let totalUnitPrice = 0, totalDiscount = 0, totalBeforeTax = 0, totalAfterTax = 0;
        sample.analyses.forEach((a) => {
            const unitPrice = a.unitPrice || 0, quantity = a.quantity || 1, discountRate = a.discountRate || 0, taxRate = a.taxRate || 0;
            const feeRaw = unitPrice * quantity, discountVal = feeRaw * (discountRate / 100), feeNet = feeRaw - discountVal;
            const lineAfterTax = a.feeAfterTax ?? feeNet * (1 + taxRate / 100);
            totalUnitPrice += feeRaw; totalDiscount += discountVal; totalBeforeTax += feeNet; totalAfterTax += lineAfterTax;
        });
        const sampleQuantity = sample.quantity || 1;
        return { totalUnitPrice, totalDiscount, totalBeforeTax, totalAfterTax, sampleQuantity };
    }, [sample.analyses, sample.quantity]);

    const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

    return (
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
                <div className={`flex-1 grid gap-4 ${showSampleQuantity ? "grid-cols-5" : "grid-cols-4"}`}>
                    <div className={showSampleQuantity ? "col-span-2" : "col-span-3"}>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("order.sampleName")} #{sampleIndex + 1} <span className="text-destructive">*</span></label>
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
                    <div className={showSampleQuantity ? "col-span-2" : ""}>
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
                {!isReadOnly && (
                    <div className="flex gap-2 mt-8">
                        <Popover open={isDuplicatePopoverOpen} onOpenChange={setIsDuplicatePopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Copy className="w-5 h-5" /></button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-3" align="end">
                                <div className="space-y-3">
                                    <div className="text-xs font-medium text-muted-foreground">{t("order.duplicateCount")}</div>
                                    <div className="flex gap-2">
                                        <Input type="number" value={duplicateCount} onChange={(e) => setDuplicateCount(Math.max(1, parseInt(e.target.value) || 1))} className="h-8 text-sm" min={1} />
                                        <Button size="sm" className="h-8 w-8 p-0" onClick={() => { onDuplicateSample(duplicateCount); setIsDuplicatePopoverOpen(false); setDuplicateCount(1); }}><Check className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <button onClick={onRemoveSample} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
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
                            {!isReadOnly && <th className="px-4 py-3 w-10 text-center"></th>}
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.stt")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.parameter")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.unit", "Đơn vị")}</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.sampleMatrix")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[130px]">{t("order.print.unitPrice")}</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("parameter.tax")}</th>
                            <th className="px-2 py-3 text-right text-sm font-semibold text-foreground w-[150px]">{t("order.lineTotal")}</th>
                            {!isReadOnly && <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("common.action")}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sample.analyses.length === 0 ? (
                            <tr><td colSpan={isReadOnly ? 7 : 9} className="px-4 py-8 text-center text-muted-foreground text-sm">{t("order.noAnalyses")}</td></tr>
                        ) : (
                            sample.analyses.map((analysis, index) => (
                                <SortableAnalysisRow key={analysis.id} id={analysis.id} index={index} moveRow={moveAnalysis}>
                                    {(dragRef: any) => (
                                        <>
                                            {!isReadOnly && (
                                                <td className={`px-4 py-3 w-10 text-center ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}><div ref={dragRef} className="cursor-grab active:cursor-grabbing"><GripVertical className="w-5 h-5 mx-auto text-muted-foreground hover:text-foreground" /></div></td>
                                            )}
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>{index + 1}</td>
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {isReadOnly ? (<div><div>{analysis.parameterName}</div>{analysis.parameterId && <div className="text-xs text-muted-foreground">{analysis.parameterId}</div>}</div>) : (
                                                    <div><input type="text" className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent mb-1" value={analysis.parameterName} onChange={(e) => handleAnalysisChange(index, "parameterName", e.target.value)} placeholder={t("order.print.parameter")}/>{analysis.parameterId && <div className="text-xs text-muted-foreground px-2">{analysis.parameterId}</div>}</div>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {isReadOnly ? analysis.analysisUnit : (<input type="text" className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent" value={analysis.analysisUnit || ""} onChange={(e) => handleAnalysisChange(index, "analysisUnit", e.target.value)} placeholder={t("order.print.unit", "Đơn vị")}/>)}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>{analysis.sampleTypeName}</td>
                                            <td className={`px-2 py-3 text-right text-sm text-foreground w-[130px] ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                <div className="flex flex-col items-end">
                                                    {isReadOnly ? ((analysis.unitPrice || 0).toLocaleString("vi-VN") + " đ") : (<input type="number" className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right" value={analysis.unitPrice} onChange={(e) => handleAnalysisChange(index, "unitPrice", e.target.value)} onKeyDown={handleNumberKeyDown}/>)}
                                                    {(Number(analysis.discountRate) || 0) > 0 && (<span className="text-xs text-green-600 font-medium leading-none block mt-1">(-{analysis.discountRate}%)</span>)}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 text-center text-sm text-foreground ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>{isReadOnly ? (analysis.taxRate + "%") : (<div className="flex items-center justify-center"><input type="number" className="w-16 px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-center" value={analysis.taxRate} onChange={(e) => handleAnalysisChange(index, "taxRate", e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleNumberKeyDown}/><span className="ml-1">%</span></div>)}</td>
                                            <td className={`px-2 py-3 text-right text-sm font-medium text-foreground w-[150px] ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                {isReadOnly ? (calculateFeeAfterTax(analysis).toLocaleString("vi-VN") + " đ") : (<div className="flex flex-col items-end"><input type="number" className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-transparent text-right" value={analysis.feeAfterTax ?? calculateFeeAfterTax(analysis)} onChange={(e) => handleAnalysisChange(index, "feeAfterTax", e.target.value)} onKeyDown={handleNumberKeyDown}/></div>)}
                                            </td>
                                            {!isReadOnly && (
                                                <td className={`px-4 py-3 text-center ${analysis.groupId && hoveredGroupId === analysis.groupId ? "bg-red-50" : ""}`}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        {analysis.parameterId && (<button onClick={() => handleUnlinkAnalysis(index)} className="p-1 text-muted-foreground hover:text-orange-500 transition-colors"><Unlink className="w-4 h-4" /></button>)}
                                                        <button onClick={() => { if (analysis.groupId) { handleRemoveGroup(analysis.groupId); } else { onRemoveAnalysis(analysis.id); } }} onMouseEnter={() => { if (analysis.groupId) setHoveredGroupId(analysis.groupId); }} onMouseLeave={() => setHoveredGroupId(null)} className={`p-1 text-muted-foreground hover:text-destructive transition-colors ${analysis.groupId && hoveredGroupId === analysis.groupId ? "text-destructive bg-destructive/10 rounded" : ""}`}><Trash2 className="w-4 h-4" /></button>
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
                        <tr><td colSpan={isReadOnly ? 6 : 7} className="px-4 py-2 text-right border-t border-border">{t("parameter.sumUnitPrice")}:</td><td className="px-4 py-2 text-right border-t border-border">{summary.totalUnitPrice.toLocaleString("vi-VN")} đ</td>{!isReadOnly && <td className="border-t border-border"></td>}</tr>
                        <tr><td colSpan={isReadOnly ? 6 : 7} className="px-4 py-2 text-right border-t border-border">{t("parameter.totalDiscount")}:</td><td className="px-4 py-2 text-right border-t border-border">{summary.totalDiscount.toLocaleString("vi-VN")} đ</td>{!isReadOnly && <td className="border-t border-border"></td>}</tr>
                        <tr><td colSpan={isReadOnly ? 6 : 7} className="px-4 py-2 text-right border-t border-border">{t("parameter.sumBeforeTax")}:</td><td className="px-4 py-2 text-right border-t border-border">{summary.totalBeforeTax.toLocaleString("vi-VN")} đ</td>{!isReadOnly && <td className="border-t border-border"></td>}</tr>
                        <tr><td colSpan={isReadOnly ? 6 : 7} className="px-4 py-2 text-right border-t border-border font-bold">{t("parameter.sumAfterTax")}:</td><td className="px-4 py-2 text-right border-t border-border font-bold text-primary">{summary.totalAfterTax.toLocaleString("vi-VN")} đ</td>{!isReadOnly && <td className="border-t border-border"></td>}</tr>
                    </tfoot>
                </table>
            </div>

            {!isReadOnly && (<div className="mt-4"><button onClick={onAddAnalysis} className="px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium">+ {t("order.addAnalysis")}</button></div>)}
        </div>
    );
});

SampleCard.displayName = "SampleCard";
