import { useTranslation } from "react-i18next";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { OtherItem } from "@/types/order";

interface OtherItemsSectionProps {
    otherItems: OtherItem[];
    onOtherItemsChange: (items: OtherItem[]) => void;
    isReadOnly?: boolean;
}

export function OtherItemsSection({ otherItems, onOtherItemsChange, isReadOnly = false }: OtherItemsSectionProps) {
    const { t } = useTranslation();
    const [showPresets, setShowPresets] = useState<number | null>(null);
    const presetsRef = useRef<HTMLDivElement>(null);

    const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    };

    // Close preset dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
                setShowPresets(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const addOtherItem = (itemName?: string) => {
        const newItem: OtherItem = {
            itemName: itemName || "",
            feeBeforeTax: 0,
            taxRate: 5,
            feeAfterTax: 0,
        };
        onOtherItemsChange([...otherItems, newItem]);
    };

    const removeOtherItem = (index: number) => {
        onOtherItemsChange(otherItems.filter((_, i) => i !== index));
    };

    const updateOtherItem = (index: number, field: keyof OtherItem, value: string | number) => {
        const updated = otherItems.map((item, i) => {
            if (i !== index) return item;
            const next = { ...item, [field]: value };
            // Priority: keep feeBeforeTax, recalculate feeAfterTax
            if (field === "feeBeforeTax" || field === "taxRate") {
                const fee = field === "feeBeforeTax" ? Number(value) : item.feeBeforeTax;
                const tax = field === "taxRate" ? Number(value) : item.taxRate;
                next.feeAfterTax = fee * (1 + tax / 100);
            }
            return next;
        });
        onOtherItemsChange(updated);
    };

    const PRESETS = [t("order.otherItems.presets.fast"), t("order.otherItems.presets.standard"), t("order.otherItems.presets.hardcopy")];

    return (
        <div className="bg-card rounded-lg border border-border p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">{t("order.otherItems.title")}</h3>
                {!isReadOnly && (
                    <button
                        onClick={() => addOtherItem()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t("order.otherItems.addItem")}
                    </button>
                )}
            </div>

            {/* Preset quick-add buttons */}
            {!isReadOnly && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => addOtherItem(preset)}
                            className="px-3 py-1 text-xs rounded-full border border-border bg-muted/40 hover:bg-muted hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all"
                        >
                            + {preset}
                        </button>
                    ))}
                </div>
            )}

            {otherItems.length === 0 && <p className="text-xs text-muted-foreground italic py-4 text-center border-t border-border mt-2">{t("order.otherItems.noItems")}</p>}

            {otherItems.length > 0 && (
                <div className="space-y-3 mt-4">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-xs text-muted-foreground font-medium px-1">
                        <span>{t("order.otherItems.itemName")}</span>
                        <span className="w-28 text-right">{t("order.otherItems.feeBeforeTax")}</span>
                        <span className="w-16 text-right">{t("order.otherItems.taxRate")}</span>
                        <span className="w-28 text-right">{t("order.otherItems.feeAfterTax")}</span>
                        {!isReadOnly && <span className="w-8" />}
                    </div>

                    {otherItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                            {/* Item Name with preset dropdown */}
                            <div className="relative" ref={showPresets === idx ? presetsRef : undefined}>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        value={item.itemName}
                                        onChange={(e) => updateOtherItem(idx, "itemName", e.target.value)}
                                        disabled={isReadOnly}
                                        placeholder={t("order.otherItems.itemName")}
                                        className="flex-1 min-w-0 px-2 py-1.5 border border-border rounded-lg text-sm bg-input text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {!isReadOnly && (
                                        <button
                                            onClick={() => setShowPresets(showPresets === idx ? null : idx)}
                                            className="p-1.5 border border-border rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
                                            title={t("order.otherItems.quickSelect")}
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                {showPresets === idx && (
                                    <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[200px]">
                                        {PRESETS.map((p) => (
                                            <button
                                                key={p}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 first:rounded-t-lg last:rounded-b-lg"
                                                onClick={() => {
                                                    updateOtherItem(idx, "itemName", p);
                                                    setShowPresets(null);
                                                }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* feeBeforeTax */}
                            <div className="w-28">
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={item.feeBeforeTax}
                                    onChange={(e) => updateOtherItem(idx, "feeBeforeTax", parseFloat(e.target.value) || 0)}
                                    onKeyDown={handleNumberKeyDown}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    disabled={isReadOnly}
                                    className="w-full px-2 py-1.5 border border-border rounded-lg text-right text-sm bg-input text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* taxRate */}
                            <div className="w-16">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={item.taxRate}
                                    onChange={(e) => updateOtherItem(idx, "taxRate", parseFloat(e.target.value) || 0)}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={handleNumberKeyDown}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    disabled={isReadOnly}
                                    className="w-full px-2 py-1.5 border border-border rounded-lg text-right text-sm bg-input text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* feeAfterTax */}
                            <div className="w-28">
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={parseFloat(item.feeAfterTax.toFixed(2))}
                                    onChange={(e) => updateOtherItem(idx, "feeAfterTax", parseFloat(e.target.value) || 0)}
                                    onKeyDown={handleNumberKeyDown}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    disabled={isReadOnly}
                                    className="w-full px-2 py-1.5 border border-border rounded-lg text-right text-sm font-medium bg-input text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Remove button */}
                            {!isReadOnly && (
                                <button
                                    onClick={() => removeOtherItem(idx)}
                                    className="w-8 flex items-center justify-center p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    title={t("order.otherItems.removeItem")}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
