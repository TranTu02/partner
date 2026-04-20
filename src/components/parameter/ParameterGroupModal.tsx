import { useState, useEffect } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getSampleTypes, getMatrices, createParameterGroup, updateParameterGroup } from "@/api/index";
import type { ParameterGroup, SampleType, Matrix } from "@/types/parameter";

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

    // Lists for dropdowns
    const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
    const [sampleTypeInput, setSampleTypeInput] = useState("");
    const [showSampleDropdown, setShowSampleDropdown] = useState(false);

    const [availableMatrices, setAvailableMatrices] = useState<Matrix[]>([]);
    const [matrixInput, setMatrixInput] = useState("");
    const [showMatrixDropdown, setShowMatrixDropdown] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        groupName: "",
        sampleTypeId: "",
        matrixIds: [] as string[],
        feeBeforeTax: 0,
        taxRate: 5,
        discountRate: 0,
    });

    const [selectedMatrices, setSelectedMatrices] = useState<Matrix[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            if (initialData) {
                setFormData({
                    groupName: initialData.groupName || "",
                    sampleTypeId: initialData.sampleTypeId || "",
                    matrixIds: initialData.matrixIds || [],
                    feeBeforeTax: initialData.feeBeforeTax || 0,
                    taxRate: initialData.taxRate || 5,
                    discountRate: initialData.discountRate || 0,
                });
                setSampleTypeInput(initialData.sampleTypeName || "");
                if (initialData.matrices) {
                    setSelectedMatrices(initialData.matrices);
                }
            } else {
                setFormData({
                    groupName: "",
                    sampleTypeId: "",
                    matrixIds: [],
                    feeBeforeTax: 0,
                    taxRate: 5,
                    discountRate: 0,
                });
                setSampleTypeInput("");
                setSelectedMatrices([]);
            }
        }
    }, [isOpen, initialData]);

    // Fetch matrices when sample type changes
    useEffect(() => {
        if (formData.sampleTypeId) {
            fetchMatrices(formData.sampleTypeId);
        } else {
            setAvailableMatrices([]);
        }
    }, [formData.sampleTypeId]);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const res = await getSampleTypes({ query: { itemsPerPage: 1000 } });
            if (res.success && res.data) {
                setSampleTypes(res.data as SampleType[]);
            }
        } catch (error) {
            console.error("Error fetching sample types", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMatrices = async (sampleTypeId: string) => {
        try {
            const res = await getMatrices({ query: { sampleTypeId, itemsPerPage: 2000 } });
            if (res.success && res.data) {
                setAvailableMatrices(res.data as Matrix[]);
            }
        } catch (error) {
            console.error("Error fetching matrices", error);
        }
    };

    const handleSelectSampleType = (st: SampleType) => {
        setSampleTypeInput(st.sampleTypeName);
        setFormData((prev) => ({ ...prev, sampleTypeId: st.sampleTypeId, matrixIds: [] }));
        setSelectedMatrices([]);
        setShowSampleDropdown(false);
    };

    const handleAddMatrix = (m: Matrix) => {
        if (formData.matrixIds.includes(m.matrixId)) {
            toast.error("Chỉ tiêu này đã có trong nhóm");
            return;
        }
        const newMatrices = [...selectedMatrices, m];
        setSelectedMatrices(newMatrices);
        setFormData((prev) => ({
            ...prev,
            matrixIds: newMatrices.map((x) => x.matrixId),
            // Auto calculate total if price is 0
            feeBeforeTax: prev.feeBeforeTax === 0 ? newMatrices.reduce((sum, x) => sum + (x.feeBeforeTax || 0), 0) : prev.feeBeforeTax,
        }));
        setMatrixInput("");
        setShowMatrixDropdown(false);
    };

    const handleRemoveMatrix = (matrixId: string) => {
        const newMatrices = selectedMatrices.filter((m) => m.matrixId !== matrixId);
        setSelectedMatrices(newMatrices);
        setFormData((prev) => ({
            ...prev,
            matrixIds: newMatrices.map((x) => x.matrixId),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.groupName || !formData.sampleTypeId || formData.matrixIds.length === 0) {
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
                response = await updateParameterGroup({
                    body: { ...payload, groupId: initialData.groupId },
                });
            } else {
                response = await createParameterGroup({ body: payload });
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

    const filteredSampleTypes = sampleTypes.filter((st) => st.sampleTypeName.toLowerCase().includes(sampleTypeInput.toLowerCase()));
    const filteredMatrices = availableMatrices.filter((m) => m.parameterName.toLowerCase().includes(matrixInput.toLowerCase()) || m.protocolCode?.toLowerCase().includes(matrixInput.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-xl w-full max-w-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">{initialData ? "Chỉnh sửa nhóm phép thử" : "Thêm nhóm phép thử mới"}</h2>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Tên nhóm <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary bg-input"
                                value={formData.groupName}
                                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                                placeholder="VD: Nhóm kim loại nặng trong nước"
                                required
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Loại mẫu <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary bg-input"
                                value={sampleTypeInput}
                                onChange={(e) => {
                                    setSampleTypeInput(e.target.value);
                                    setShowSampleDropdown(true);
                                }}
                                onFocus={() => setShowSampleDropdown(true)}
                                onBlur={() => setTimeout(() => setShowSampleDropdown(false), 200)}
                                placeholder="Tìm loại mẫu..."
                                required
                            />
                            {showSampleDropdown && filteredSampleTypes.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredSampleTypes.map((st) => (
                                        <div key={st.sampleTypeId} className="px-3 py-2 cursor-pointer hover:bg-muted text-sm text-foreground" onClick={() => handleSelectSampleType(st)}>
                                            {st.sampleTypeName}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Danh sách chỉ tiêu trong nhóm <span className="text-destructive">*</span>
                        </label>
                        <div className="relative mb-3">
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary bg-input text-sm"
                                value={matrixInput}
                                onChange={(e) => {
                                    setMatrixInput(e.target.value);
                                    setShowMatrixDropdown(true);
                                }}
                                onFocus={() => setShowMatrixDropdown(true)}
                                onBlur={() => setTimeout(() => setShowMatrixDropdown(false), 200)}
                                placeholder={formData.sampleTypeId ? "Tìm chỉ tiêu để thêm vào nhóm..." : "Vui lòng chọn loại mẫu trước"}
                                disabled={!formData.sampleTypeId}
                            />
                            {showMatrixDropdown && filteredMatrices.length > 0 && (
                                <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filteredMatrices.map((m) => (
                                        <div
                                            key={m.matrixId}
                                            className="px-3 py-2 cursor-pointer hover:bg-muted text-sm text-foreground border-b border-border/50 last:border-0"
                                            onClick={() => handleAddMatrix(m)}
                                        >
                                            <div className="font-medium">{m.parameterName}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {m.protocolCode} - {(m.feeBeforeTax || 0).toLocaleString()} đ
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Chỉ tiêu</th>
                                        <th className="px-3 py-2 text-left">Phương pháp</th>
                                        <th className="px-3 py-2 text-right">Đơn giá</th>
                                        <th className="px-3 py-2 text-center w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedMatrices.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground italic">
                                                Chưa có chỉ tiêu nào được chọn
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedMatrices.map((m) => (
                                            <tr key={m.matrixId} className="border-t border-border">
                                                <td className="px-3 py-2">{m.parameterName}</td>
                                                <td className="px-3 py-2 text-xs text-muted-foreground">{m.protocolCode}</td>
                                                <td className="px-3 py-2 text-right">{(m.feeBeforeTax || 0).toLocaleString()} đ</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button type="button" onClick={() => handleRemoveMatrix(m.matrixId)} className="p-1 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Tổng đơn giá gốc</label>
                            <div className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground">
                                {selectedMatrices.reduce((sum, x) => sum + (x.feeBeforeTax || 0), 0).toLocaleString()} đ
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Chiết khấu nhóm (%)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary bg-input text-sm"
                                value={formData.discountRate}
                                onChange={(e) => {
                                    const disc = Number(e.target.value);
                                    const base = selectedMatrices.reduce((sum, x) => sum + (x.feeBeforeTax || 0), 0);
                                    setFormData({ ...formData, discountRate: disc, feeBeforeTax: base * (1 - disc / 100) });
                                }}
                                min={0}
                                max={100}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Giá nhóm (trước thuế)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary bg-input font-bold text-primary"
                                value={formData.feeBeforeTax}
                                onChange={(e) => setFormData({ ...formData, feeBeforeTax: Number(e.target.value) })}
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors font-medium">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isLoading}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 font-bold"
                        >
                            <Save className="w-4 h-4" />
                            Lưu nhóm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
