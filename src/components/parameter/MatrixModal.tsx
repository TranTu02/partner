import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getSampleTypes, createMatrix, updateMatrix } from "@/api/index";
import type { Matrix, SampleType } from "@/types/parameter";

interface MatrixModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Matrix | null;
}

export function MatrixModal({ isOpen, onClose, onSuccess, initialData }: MatrixModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Lists for dropdowns
    // Lists for dropdowns
    const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
    const [sampleTypeInput, setSampleTypeInput] = useState("");
    const [showSampleDropdown, setShowSampleDropdown] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        parameterName: "",
        sampleTypeId: "",
        protocolCode: "",
        feeBeforeTax: 0,
        taxRate: 8,
        feeAfterTax: 0,
    });

    useEffect(() => {
        if (isOpen) {
            fetchSampleTypesData();
            if (initialData) {
                setFormData({
                    parameterName: initialData.parameterName || "",
                    sampleTypeId: initialData.sampleTypeId,
                    protocolCode: initialData.protocolCode || "",
                    feeBeforeTax: initialData.feeBeforeTax || 0,
                    taxRate: initialData.taxRate !== undefined ? initialData.taxRate : 5,
                    feeAfterTax: initialData.feeAfterTax || (initialData.feeBeforeTax || 0) * (1 + (initialData.taxRate !== undefined ? initialData.taxRate : 5) / 100),
                });
                setSampleTypeInput(initialData.sampleTypeName || "");
            } else {
                setFormData({
                    parameterName: "",
                    sampleTypeId: "",
                    protocolCode: "",
                    feeBeforeTax: 0,
                    taxRate: 5,
                    feeAfterTax: 0,
                });
                setSampleTypeInput("");
            }
        }
    }, [isOpen, initialData]);

    const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    };

    const fetchSampleTypesData = async () => {
        setIsLoading(true);
        try {
            const res = await getSampleTypes({ query: { itemsPerPage: 1000 } });
            if (res.success && res.data) {
                setSampleTypes(res.data as SampleType[]);
                // If editing and we have ID but no Name (edge case), try to fill name from list
                if (initialData?.sampleTypeId && !initialData.sampleTypeName) {
                    const found = (res.data as SampleType[]).find((st) => st.sampleTypeId === initialData.sampleTypeId);
                    if (found) setSampleTypeInput(found.sampleTypeName);
                }
            }
        } catch (error) {
            console.error("Error fetching dependencies", error);
            toast.error(t("common.error"));
        } finally {
            setIsLoading(false);
        }
    };

    const handlePriceChange = (field: "before" | "after" | "tax", value: number) => {
        let { feeBeforeTax, feeAfterTax, taxRate } = formData;
        if (field === "before") {
            feeBeforeTax = value;
            feeAfterTax = value * (1 + taxRate / 100);
        } else if (field === "after") {
            feeAfterTax = value;
            feeBeforeTax = value / (1 + taxRate / 100);
        } else if (field === "tax") {
            taxRate = value;
            feeAfterTax = feeBeforeTax * (1 + value / 100);
        }
        setFormData((prev) => ({ ...prev, feeBeforeTax, feeAfterTax, taxRate }));
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

    // Filter sample types
    const filteredSampleTypes = sampleTypes.filter((st) => st.sampleTypeName.toLowerCase().includes(sampleTypeInput.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.parameterName || !sampleTypeInput) {
            // Check sampleTypeInput instead of ID
            toast.error(t("validation.fillAll"));
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formData,
                sampleTypeName: sampleTypeInput,
            };

            let response;
            if (initialData) {
                response = await updateMatrix({
                    body: { ...payload, matrixId: initialData.matrixId },
                });
            } else {
                response = await createMatrix({
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
            <div className="bg-card rounded-lg w-full max-w-lg shadow-xl border border-border">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">{initialData ? t("parameter.edit") : t("parameter.add")}</h2>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Parameter Name (Direct Input) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t("parameter.name")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground"
                            value={formData.parameterName}
                            onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })}
                            required
                        />
                    </div>

                    {/* Sample Type Input/Dropdown */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t("order.sampleMatrix")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground"
                            value={sampleTypeInput}
                            onChange={handleSampleTypeChange}
                            onFocus={() => setShowSampleDropdown(true)}
                            onBlur={() => setTimeout(() => setShowSampleDropdown(false), 200)} // Delay to allow click
                            placeholder={t("common.searchOrEnter")}
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

                    {/* Protocol Code (Direct Input) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.protocol")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground"
                            value={formData.protocolCode}
                            onChange={(e) => setFormData({ ...formData, protocolCode: e.target.value })}
                            placeholder="e.g. TCVN 1234:2010"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Fee Before Tax */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.unitPrice")}</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={formData.feeBeforeTax}
                                onChange={(e) => handlePriceChange("before", Number(e.target.value))}
                                onKeyDown={handleNumberKeyDown}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={0}
                            />
                        </div>

                        {/* Tax Rate */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t("parameter.tax")}</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={formData.taxRate}
                                onChange={(e) => handlePriceChange("tax", Number(e.target.value))}
                                onKeyDown={handleNumberKeyDown}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={0}
                                max={100}
                            />
                        </div>

                        {/* Fee After Tax */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t("order.lineTotal")}</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={formData.feeAfterTax || 0}
                                onChange={(e) => handlePriceChange("after", Number(e.target.value))}
                                onKeyDown={handleNumberKeyDown}
                                onWheel={(e) => e.currentTarget.blur()}
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors text-sm font-medium">
                            {t("common.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            <Save className="w-4 h-4" />
                            {t("common.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
