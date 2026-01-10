import { useState, useEffect } from "react";
import { X, Save, Trash2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getSampleTypes, createParameterGroup, updateParameterGroup, getMatrices } from "@/api/index";
import type { ParameterGroup, SampleType, Matrix } from "@/types/parameter";
import { AnalysisModalNew } from "./AnalysisModalNew";

interface ParameterGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: ParameterGroup | null;
}

export function ParameterGroupModal({ isOpen, onClose, onSuccess, initialData }: ParameterGroupModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Data lists
    const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
    const [sampleTypeInput, setSampleTypeInput] = useState("");
    const [showSampleDropdown, setShowSampleDropdown] = useState(false);

    // Matrix Selection State
    const [selectedMatrices, setSelectedMatrices] = useState<Matrix[]>([]);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<{
        groupName: string;
        groupNote: string;
        sampleTypeId: string;
        feeBeforeTaxAndDiscount: number | "";
        discountRate: number | "";
        feeBeforeTax: number | "";
        taxRate: number | "";
        feeAfterTax: number | "";
    }>({
        groupName: "",
        groupNote: "",
        sampleTypeId: "",
        feeBeforeTaxAndDiscount: "",
        discountRate: "",
        feeBeforeTax: "",
        taxRate: 5,
        feeAfterTax: "",
    });

    useEffect(() => {
        if (isOpen) {
            fetchSampleTypes();
            if (initialData) {
                // Initialize form data from initialData
                const taxRate = initialData.taxRate !== undefined ? initialData.taxRate : 5;
                const discountRate = initialData.discountRate || (initialData as any).discount || 0;

                // Use provided values or calculate defaults
                let feeBeforeTax = initialData.feeBeforeTax || 0;
                let feeBeforeTaxAndDiscount = initialData.feeBeforeTaxAndDiscount;

                if (feeBeforeTaxAndDiscount === undefined) {
                    // Back-calculate if not present
                    if (discountRate !== 100) {
                        feeBeforeTaxAndDiscount = feeBeforeTax / (1 - discountRate / 100);
                    } else {
                        feeBeforeTaxAndDiscount = feeBeforeTax; // Edge case
                    }
                }

                // Recalculate potentially to ensure consistency
                feeBeforeTax = feeBeforeTaxAndDiscount * (1 - discountRate / 100);
                const feeAfterTax = initialData.feeAfterTax || feeBeforeTax * (1 + taxRate / 100);

                setFormData({
                    groupName: initialData.groupName,
                    groupNote: initialData.groupNote || "",
                    sampleTypeId: initialData.sampleTypeId,
                    feeBeforeTaxAndDiscount: feeBeforeTaxAndDiscount || "",
                    discountRate: discountRate,
                    feeBeforeTax: feeBeforeTax || "",
                    taxRate: taxRate,
                    feeAfterTax: feeAfterTax || "",
                });
                setSampleTypeInput(initialData.sampleTypeName || "");

                // Check if matrices data is available directly (snapshot or formatted string array)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawMatrices = (initialData as any).matrices;
                if (rawMatrices && Array.isArray(rawMatrices) && rawMatrices.length > 0) {
                    const parsedMatrices: Matrix[] = rawMatrices
                        .map((m: any) => {
                            let obj = m;
                            if (typeof m === "string") {
                                try {
                                    obj = JSON.parse(m);
                                } catch {
                                    return null;
                                }
                            }
                            if (!obj) return null;

                            // Ensure numeric fields are numbers
                            return {
                                ...obj,
                                feeBeforeTax: Number(obj.feeBeforeTax || 0),
                                feeAfterTax: Number(obj.feeAfterTax || 0),
                                taxRate: Number(obj.taxRate || 0),
                            };
                        })
                        .filter((m: any) => m !== null) as Matrix[];

                    setSelectedMatrices(parsedMatrices);
                } else if (initialData.matrixIds && initialData.matrixIds.length > 0) {
                    fetchSelectedMatrices(initialData.matrixIds);
                } else {
                    setSelectedMatrices([]);
                }
            } else {
                setFormData({
                    groupName: "",
                    groupNote: "",
                    sampleTypeId: "",
                    feeBeforeTaxAndDiscount: "",
                    discountRate: "",
                    feeBeforeTax: "",
                    taxRate: 5,
                    feeAfterTax: "",
                });
                setSampleTypeInput("");
                setSelectedMatrices([]);
            }
        }
    }, [isOpen, initialData]);

    const fetchSampleTypes = async () => {
        setIsLoading(true);
        try {
            const res = await getSampleTypes({ query: { itemsPerPage: 1000 } });
            if (res.success && res.data) {
                setSampleTypes(res.data as SampleType[]);
                if (initialData?.sampleTypeId && !initialData.sampleTypeName) {
                    const found = (res.data as SampleType[]).find((st) => st.sampleTypeId === initialData.sampleTypeId);
                    if (found) setSampleTypeInput(found.sampleTypeName);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSelectedMatrices = async (ids: string[]) => {
        try {
            const res = await getMatrices({ query: { itemsPerPage: 1000 } });
            if (res.success && res.data) {
                const all = res.data as Matrix[];
                const found = all.filter((m) => ids.includes(m.matrixId));
                setSelectedMatrices(found);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handlePriceChange = (field: "beforeAndDiscount" | "discountRate" | "before" | "after" | "tax", rawValue: string) => {
        if (rawValue === "") {
            // Determine which field key to clear
            let key = "";
            if (field === "beforeAndDiscount") key = "feeBeforeTaxAndDiscount";
            else if (field === "discountRate") key = "discountRate";
            else if (field === "before") key = "feeBeforeTax";
            else if (field === "after") key = "feeAfterTax";
            else if (field === "tax") key = "taxRate";

            setFormData((prev) => ({ ...prev, [key]: "" }));
            return;
        }

        const value = Number(rawValue);
        if (isNaN(value)) return;

        // Get current values as numbers (fallback to 0)
        let feeBeforeTaxAndDiscount = Number(formData.feeBeforeTaxAndDiscount || 0);
        let discountRate = Number(formData.discountRate || 0);
        let feeBeforeTax = Number(formData.feeBeforeTax || 0);
        let taxRate = Number(formData.taxRate || 0);
        let feeAfterTax = Number(formData.feeAfterTax || 0);

        if (field === "beforeAndDiscount") {
            feeBeforeTaxAndDiscount = value;
            feeBeforeTax = feeBeforeTaxAndDiscount * (1 - discountRate / 100);
            feeAfterTax = feeBeforeTax * (1 + taxRate / 100);
        } else if (field === "discountRate") {
            discountRate = value;
            feeBeforeTax = feeBeforeTaxAndDiscount * (1 - discountRate / 100);
            feeAfterTax = feeBeforeTax * (1 + taxRate / 100);
        } else if (field === "before") {
            feeBeforeTax = value;
            if (Math.abs(1 - discountRate / 100) > 0.0001) {
                feeBeforeTaxAndDiscount = feeBeforeTax / (1 - discountRate / 100);
            }
            feeAfterTax = feeBeforeTax * (1 + taxRate / 100);
        } else if (field === "tax") {
            taxRate = value;
            feeAfterTax = feeBeforeTax * (1 + taxRate / 100);
        } else if (field === "after") {
            feeAfterTax = value;
            feeBeforeTax = feeAfterTax / (1 + taxRate / 100);
            if (Math.abs(1 - discountRate / 100) > 0.0001) {
                feeBeforeTaxAndDiscount = feeBeforeTax / (1 - discountRate / 100);
            }
        }

        setFormData((prev) => ({
            ...prev,
            feeBeforeTaxAndDiscount,
            discountRate,
            feeBeforeTax,
            feeAfterTax,
            taxRate,
        }));
    };

    const handleSampleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSampleTypeInput(e.target.value);
        setFormData((prev) => ({ ...prev, sampleTypeId: "" }));
        setShowSampleDropdown(true);
    };

    const handleSelectSampleType = (st: SampleType) => {
        setSampleTypeInput(st.sampleTypeName);
        setFormData((prev) => ({ ...prev, sampleTypeId: st.sampleTypeId }));
        setShowSampleDropdown(false);
    };

    const filteredSampleTypes = sampleTypes.filter((st) => st.sampleTypeName.toLowerCase().includes(sampleTypeInput.toLowerCase()));

    const handleConfirmAnalysis = (items: Matrix[]) => {
        const newItems = items.filter((item) => !selectedMatrices.some((m) => m.matrixId === item.matrixId));
        const allItems = [...selectedMatrices, ...newItems];
        setSelectedMatrices(allItems);
        setIsAnalysisModalOpen(false);

        if (newItems.length > 0) {
            const addedPrice = newItems.reduce((sum, item) => sum + Number(item.feeBeforeTax || 0), 0);

            const currentListTotal = Number(formData.feeBeforeTaxAndDiscount || 0);
            const newListTotal = currentListTotal + addedPrice;

            const discountRate = Number(formData.discountRate || 0);
            const taxRate = Number(formData.taxRate || 0);

            const newFeeBeforeTax = newListTotal * (1 - discountRate / 100);
            const newFeeAfterTax = newFeeBeforeTax * (1 + taxRate / 100);

            setFormData((prev) => ({
                ...prev,
                feeBeforeTaxAndDiscount: newListTotal,
                feeBeforeTax: newFeeBeforeTax,
                feeAfterTax: newFeeAfterTax,
            }));
        }
    };

    const handleRemoveMatrix = (matrixId: string) => {
        const removed = selectedMatrices.find((m) => m.matrixId === matrixId);
        setSelectedMatrices((prev) => prev.filter((m) => m.matrixId !== matrixId));

        if (removed) {
            const currentListTotal = Number(formData.feeBeforeTaxAndDiscount || 0);
            const removedPrice = Number(removed.feeBeforeTax || 0);
            const newListTotal = Math.max(0, currentListTotal - removedPrice);

            const discountRate = Number(formData.discountRate || 0);
            const taxRate = Number(formData.taxRate || 0);

            const newFeeBeforeTax = newListTotal * (1 - discountRate / 100);
            const newFeeAfterTax = newFeeBeforeTax * (1 + taxRate / 100);

            setFormData((prev) => ({
                ...prev,
                feeBeforeTaxAndDiscount: newListTotal,
                feeBeforeTax: newFeeBeforeTax,
                feeAfterTax: newFeeAfterTax,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.groupName || !sampleTypeInput) {
            toast.error(t("validation.fillAll"));
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                feeBeforeTaxAndDiscount: Number(formData.feeBeforeTaxAndDiscount || 0),
                discountRate: Number(formData.discountRate || 0),
                feeBeforeTax: Number(formData.feeBeforeTax || 0),
                taxRate: Number(formData.taxRate || 0),
                feeAfterTax: Number(formData.feeAfterTax || 0),

                sampleTypeName: sampleTypeInput,
                matrixIds: selectedMatrices.map((m) => m.matrixId),
                matrices: selectedMatrices.map((m) => {
                    // Logic per user request:
                    // 1. feeBeforeTaxAndDiscount = matrix.feeBeforeTaxAndDiscount || matrix.feeBeforeTax
                    const listPrice = Number((m as any).feeBeforeTaxAndDiscount || m.feeBeforeTax || 0);

                    // 2. discountRate = formData.discountRate
                    const discountRate = Number(formData.discountRate || 0);

                    // 3. taxRate = matrix.taxRate
                    const taxRate = Number(m.taxRate || 0);

                    // 4. feeBeforeTax (Net) = List * (1 - Discount/100)
                    const feeBeforeTax = listPrice * (1 - discountRate / 100);

                    // 5. feeAfterTax (Gross) = Net * (1 + Tax/100)
                    const feeAfterTax = feeBeforeTax * (1 + taxRate / 100);

                    return {
                        matrixId: m.matrixId,
                        parameterName: m.parameterName,
                        sampleTypeName: m.sampleTypeName,

                        feeBeforeTaxAndDiscount: listPrice,
                        discountRate: discountRate,

                        feeBeforeTax: feeBeforeTax,
                        taxRate: taxRate,
                        feeAfterTax: feeAfterTax,
                    };
                }),
            };

            let response;
            if (initialData) {
                response = await updateParameterGroup({
                    body: { ...payload, parameterGroupId: initialData.parameterGroupId },
                });
            } else {
                response = await createParameterGroup({
                    body: payload,
                });
            }

            if (response.success) {
                toast.success(t("common.success"));
                onSuccess();
                onClose();
            } else {
                toast.error(response.error?.message || t("common.error"));
            }
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-xl border border-border">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">
                        {initialData ? t("common.edit") : t("common.add")} {t("parameter.group") || "Group"}
                    </h2>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Form */}
                    <div className="w-1/3 p-6 border-r border-border overflow-y-auto">
                        <form id="group-form" onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t("parameter.groupName") || "Tên gói"} <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground"
                                    value={formData.groupName}
                                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    {t("order.sampleMatrix")} <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground"
                                    value={sampleTypeInput}
                                    onChange={handleSampleTypeChange}
                                    onFocus={() => setShowSampleDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowSampleDropdown(false), 200)}
                                    placeholder={t("common.searchOrEnter")}
                                    disabled={selectedMatrices.length > 0}
                                    required
                                />
                                {showSampleDropdown && filteredSampleTypes.length > 0 && (
                                    <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredSampleTypes.map((st) => (
                                            <div key={st.sampleTypeId} className="px-3 py-2 cursor-pointer hover:bg-muted text-sm text-foreground" onClick={() => handleSelectSampleType(st)}>
                                                {st.sampleTypeName}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.note") || "Ghi chú"}</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground"
                                    rows={3}
                                    value={formData.groupNote}
                                    onChange={(e) => setFormData({ ...formData, groupNote: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.feeBeforeList", "Tiền trước thuế và giảm giá")}</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={formData.feeBeforeTaxAndDiscount}
                                        onChange={(e) => handlePriceChange("beforeAndDiscount", e.target.value)}
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.discount", "Giảm giá")}(%)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={formData.discountRate}
                                        onChange={(e) => handlePriceChange("discountRate", e.target.value)}
                                        min={0}
                                        max={100}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.feeBeforeTax", "Tiền trước thuế")}</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={formData.feeBeforeTax}
                                        onChange={(e) => handlePriceChange("before", e.target.value)}
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.tax")}(%)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={formData.taxRate}
                                        onChange={(e) => handlePriceChange("tax", e.target.value)}
                                        min={0}
                                        max={100}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.feeAfterTax", "Tổng tiền sau thuế")}</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={formData.feeAfterTax}
                                    onChange={(e) => handlePriceChange("after", e.target.value)}
                                />
                            </div>
                        </form>
                    </div>

                    {/* Right: Matrix Selection */}
                    <div className="flex-1 p-6 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <label className="block text-sm font-medium text-foreground">{t("parameter.selectedCount", { count: selectedMatrices.length })}</label>
                            <button
                                type="button"
                                onClick={() => setIsAnalysisModalOpen(true)}
                                disabled={!sampleTypeInput}
                                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                                {t("parameter.addParameter", "Add Parameter")}
                            </button>
                        </div>

                        {/* Selected List */}
                        <div className="flex-1 border border-border rounded-lg overflow-auto bg-muted/10 relative z-10">
                            {selectedMatrices.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">No parameters selected.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left">{t("parameter.name")}</th>
                                            <th className="px-3 py-2 text-right">{t("parameter.feeBeforeList", "Tiền trước thuế và giảm giá")}</th>
                                            <th className="px-3 py-2 text-right">{t("parameter.discountAmount", "Giảm giá")}</th>
                                            <th className="px-3 py-2 text-center">{t("parameter.discountRate", "% Giảm")}</th>
                                            <th className="px-3 py-2 text-right">{t("parameter.feeBeforeTax", "Tiền trước thuế")}</th>
                                            <th className="px-3 py-2 text-right">{t("parameter.feeAfterTax", "Tiền sau thuế")}</th>
                                            <th className="px-3 py-2 w-[40px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedMatrices.map((m) => {
                                            const listPrice = Number(m.feeBeforeTax || 0); // Assuming stored is List Price
                                            const discountRate = Number(formData.discountRate || 0);
                                            const discountAmount = listPrice * (discountRate / 100);
                                            const netPrice = listPrice - discountAmount;
                                            const taxRate = Number(formData.taxRate || 0);
                                            const grossPrice = netPrice * (1 + taxRate / 100);

                                            return (
                                                <tr key={m.matrixId} className="border-t border-border">
                                                    <td className="px-3 py-2">{m.parameterName}</td>
                                                    <td className="px-3 py-2 text-right">{listPrice.toLocaleString("vi-VN")}</td>
                                                    <td className="px-3 py-2 text-right">{discountAmount.toLocaleString("vi-VN")}</td>
                                                    <td className="px-3 py-2 text-center text-green-600">{discountRate > 0 ? `-${discountRate}%` : "-"}</td>
                                                    <td className="px-3 py-2 text-right">{netPrice.toLocaleString("vi-VN")}</td>
                                                    <td className="px-3 py-2 text-right font-medium">{grossPrice.toLocaleString("vi-VN")}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button onClick={() => handleRemoveMatrix(m.matrixId)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-6 border-t border-border gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors text-sm font-medium">
                        {t("common.cancel")}
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || isLoading}
                        form="group-form"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        <Save className="w-4 h-4" />
                        {t("common.save")}
                    </button>
                </div>
            </div>

            {isAnalysisModalOpen && <AnalysisModalNew isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} onConfirm={handleConfirmAnalysis} />}
        </div>
    );
}
