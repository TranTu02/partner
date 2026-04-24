import { useTranslation } from "react-i18next";
import type { OtherItem } from "@/types/order";

interface PricingSummaryProps {
    subtotal: number;
    discountRate: number;
    discountAmount: number;
    feeBeforeTax: number;
    tax: number;
    total: number;
    commission: number;
    otherItems: OtherItem[];
    onDiscountRateChange: (discountRate: number) => void;
    onCommissionChange: (commission: number) => void;
    lineDiscountAmount?: number;
    orderDiscountAmount?: number;
    isReadOnly?: boolean;
}

const FMT = (n: number) => n.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function PricingSummary({
    subtotal,
    discountRate,
    discountAmount,
    feeBeforeTax,
    tax,
    total,
    commission,
    otherItems,
    onDiscountRateChange,
    onCommissionChange,
    lineDiscountAmount = 0,
    orderDiscountAmount = 0,
    isReadOnly = false,
}: PricingSummaryProps) {
    const { t } = useTranslation();

    const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    };

    // ── Derived totals ─────────────────────────────────────────────────────
    const otherFeeBeforeTax = otherItems.reduce((s, i) => s + Number(i.feeBeforeTax || 0), 0);

    return (
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            {/* ── Core pricing ──────────────────────────────────────────── */}
            <div>
                <h3 className="mb-4 text-base font-semibold">{t("order.pricing.title")}</h3>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t("parameter.sumUnitPrice", "Tổng đơn giá")}:</span>
                        <span className="text-sm font-medium">{FMT(subtotal)} đ</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm">{"Chiết khấu toàn đơn"}:</span>
                        <span className="text-sm font-medium">-{FMT(orderDiscountAmount || (subtotal * discountRate) / 100)} đ</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
                        <span className="text-sm font-bold italic">{"Tổng chiết khấu"}:</span>
                        <span className="text-sm font-bold">-{FMT(discountAmount)} đ</span>
                    </div>

                    <div className="flex justify-between items-center border-t border-border/50 pt-2">
                        <span className="text-sm font-medium italic">{t("parameter.sumBeforeTax", "Tiền trước thuế")}:</span>
                        <span className="text-sm font-bold italic">{FMT(feeBeforeTax)} đ</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t("parameter.totalTax", "Thuế VAT")}:</span>
                        <span className="text-sm font-medium">{FMT(tax)} đ</span>
                    </div>

                    {/* ── Final Grand Total (includes everything) ───────────────────────── */}
                    <div className="border-t border-border pt-3 mt-3">
                        <div className="flex justify-between items-center">
                            <span className="text-base font-bold uppercase">{t("quote.total", "Tổng thanh toán")}:</span>
                            <span className="text-xl font-bold">{FMT(total)} VNĐ</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="border-t border-border pt-3 mt-3 space-y-3">
                        <div className="flex justify-between items-center gap-4">
                            <label className="text-sm text-muted-foreground">{"Chiết khấu đơn hàng (%)"}:</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-24 px-3 py-1 border border-border rounded-lg text-right focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                value={discountRate}
                                onChange={(e) => onDiscountRateChange(parseFloat(e.target.value) || 0)}
                                onKeyDown={handleNumberKeyDown}
                                onWheel={(e) => e.currentTarget.blur()}
                                disabled={isReadOnly}
                            />
                        </div>

                        <div className="flex justify-between items-center gap-4">
                            <label className="text-sm text-muted-foreground">{"Hoa hồng (%)"}:</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-24 px-3 py-1 border border-border rounded-lg text-right focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                value={commission}
                                onChange={(e) => onCommissionChange(parseFloat(e.target.value) || 0)}
                                onKeyDown={handleNumberKeyDown}
                                onWheel={(e) => e.currentTarget.blur()}
                                disabled={isReadOnly}
                            />
                        </div>

                        {commission > 0 && (
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-muted-foreground">{"Tiền hoa hồng"}:</span>
                                <span className="text-sm font-medium text-primary">{FMT((total * commission) / 100)} đ</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
