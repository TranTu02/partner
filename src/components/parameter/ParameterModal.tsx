import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createParameter, updateParameter } from "@/api/index";
import type { Parameter } from "@/types/parameter";

interface ParameterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Parameter | null;
}

export function ParameterModal({ isOpen, onClose, onSuccess, initialData }: ParameterModalProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        parameterName: "",
        displayStyle_default: "",
        displayStyle_eng: "",
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    parameterName: initialData.parameterName || "",
                    displayStyle_default: initialData.displayStyle?.default || "",
                    displayStyle_eng: initialData.displayStyle?.eng || "",
                });
            } else {
                setFormData({
                    parameterName: "",
                    displayStyle_default: "",
                    displayStyle_eng: "",
                });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.parameterName.trim()) {
            toast.error(t("validation.fillAll"));
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                parameterName: formData.parameterName,
                displayStyle: {
                    default: formData.displayStyle_default,
                    eng: formData.displayStyle_eng,
                },
            };

            let response;
            if (initialData) {
                response = await updateParameter({
                    body: { ...payload, parameterId: initialData.parameterId },
                });
            } else {
                response = await createParameter({
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
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-lg shadow-xl border border-border flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">{initialData ? t("parameter.edit") : t("parameter.add")}</h2>
                    <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            {t("parameter.name")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground text-sm"
                            value={formData.parameterName}
                            onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Hiển thị (Markdown) - Mặc định</label>
                        <textarea
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground text-sm resize-y"
                            value={formData.displayStyle_default}
                            onChange={(e) => setFormData({ ...formData, displayStyle_default: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Hiển thị (Markdown) - Tiếng Anh</label>
                        <textarea
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none bg-input text-foreground text-sm resize-y"
                            value={formData.displayStyle_eng}
                            onChange={(e) => setFormData({ ...formData, displayStyle_eng: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors text-sm font-medium">
                            {t("common.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
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
