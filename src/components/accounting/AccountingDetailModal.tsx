import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Order } from "@/types/order";
import { updateOrder } from "@/api/index"; // Assume updateOrder exists and handles partial updates
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface AccountingDetailModalProps {
    order: Order | null;
    open: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export function AccountingDetailModal({ order, open, onClose, onRefresh }: AccountingDetailModalProps) {
    const { t } = useTranslation();
    const [orderStatus, setOrderStatus] = useState<string>("");
    const [paymentStatus, setPaymentStatus] = useState<string>("");
    const [totalPaid, setTotalPaid] = useState<number>(0);
    const [invoiceNumbers, setInvoiceNumbers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }
    };

    useEffect(() => {
        if (order) {
            setOrderStatus(order.orderStatus);
            setPaymentStatus(order.paymentStatus);
            setTotalPaid(order.totalPaid || 0);
            setInvoiceNumbers(order.invoiceNumbers || []);
        }
    }, [order]);

    const handleSave = async () => {
        if (!order) return;
        setIsLoading(true);
        try {
            const response = await updateOrder({
                body: {
                    id: order.orderId,
                    orderStatus,
                    paymentStatus,
                    totalPaid,
                    invoiceNumbers,
                },
            });

            if (response.success) {
                toast.success(t("common.saveSuccess") || "Saved successfully");
                onRefresh();
                onClose();
            } else {
                toast.error(response.error?.message || "Failed to save");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (!open || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-4xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            {t("accounting.orderDetail")} - {order.orderId}
                        </h2>
                        <p className="text-sm text-muted-foreground">{order.client?.clientName}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    {/* Client & Invoice Info */}
                    <div className="grid grid-cols-2 gap-6 mb-8 border-b border-border pb-6">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-primary text-base">{t("client.basicInfo")}</h3>
                            <div className="text-sm space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">{t("client.name")}:</span>
                                    <span className="col-span-2 font-medium text-foreground">{order.client?.clientName || "--"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">{t("client.address")}:</span>
                                    <span className="col-span-2 text-foreground">{order.client?.clientAddress || "--"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">{t("client.phone")}:</span>
                                    <span className="col-span-2 text-foreground">{order.client?.clientPhone || "--"}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-semibold text-primary text-base">{t("client.invoiceInfo")}</h3>
                            <div className="text-sm space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">{t("client.taxName")}:</span>
                                    <span className="col-span-2 font-medium text-foreground">{order.client?.invoiceInfo?.taxName || order.client?.clientName || "--"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">{t("client.taxCode")}:</span>
                                    <span className="col-span-2 text-foreground">{order.client?.invoiceInfo?.taxCode || order.client?.legalId || "--"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">{t("client.taxAddress")}:</span>
                                    <span className="col-span-2 text-foreground">{order.client?.invoiceInfo?.taxAddress || order.client?.clientAddress || "--"}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">{t("client.taxEmail")}:</span>
                                    <span className="col-span-2 text-foreground">{order.client?.invoiceInfo?.taxEmail || order.client?.invoiceEmail || "--"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sample Details */}
                    <div className="mb-8 border-b border-border pb-6">
                        <h3 className="font-semibold text-primary text-base mb-4">{t("order.sampleList")}</h3>
                        <div className="space-y-4">
                            {order.samples?.map((sample: any, idx: number) => (
                                <div key={idx} className="bg-muted/20 rounded-lg p-4 border border-border">
                                    <div className="font-medium text-sm mb-3 flex justify-between">
                                        <span>
                                            {idx + 1}. {sample.sampleName} <span className="text-muted-foreground">({sample.sampleMatrix})</span>
                                        </span>
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-muted-foreground border-b border-border/50 text-left">
                                                <th className="pb-2 font-medium pl-2">{t("common.parameter")}</th>
                                                <th className="pb-2 font-medium text-right pr-2">{t("accounting.amount")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sample.analyses?.map((analysis: any, aIdx: number) => (
                                                <tr key={aIdx} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                                                    <td className="py-2 pl-2 text-foreground">{analysis.parameterName}</td>
                                                    <td className="py-2 text-right pr-2 font-mono text-foreground">{formatCurrency(analysis.feeAfterTax || 0)}</td>
                                                </tr>
                                            ))}
                                            {(!sample.analyses || sample.analyses.length === 0) && (
                                                <tr>
                                                    <td colSpan={2} className="py-2 text-center text-muted-foreground italic text-xs">
                                                        No analysis
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end mt-6 text-sm">
                            <div className="w-full max-w-xs space-y-2 bg-muted/20 p-4 rounded-lg border border-border">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>{t("order.subtotal")}</span>
                                    <span>{formatCurrency(order.totalFeeBeforeTax || 0)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>
                                        {t("order.vat")} ({order.taxRate || 0}%)
                                    </span>
                                    <span>{formatCurrency(order.totalTaxValue || 0)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-base text-foreground border-t border-border pt-2 mt-2">
                                    <span>{t("order.total")}</span>
                                    <span className="text-primary">{formatCurrency(order.totalAmount || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status & Transactions Section */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">{t("order.status")}</label>
                            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                                <option value="Pending">{t("order.statuses.pending")}</option>
                                <option value="Processing">{t("order.statuses.processing")}</option>
                                <option value="Completed">{t("order.statuses.completed")}</option>
                                <option value="Cancelled">{t("order.statuses.cancelled")}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">{t("order.paymentStatus")}</label>
                            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                                <option value="Unpaid">{t("order.paymentStatuses.unpaid")}</option>
                                <option value="Partial">{t("order.paymentStatuses.partial") || "Partial"}</option>
                                <option value="Paid">{t("order.paymentStatuses.paid")}</option>
                                <option value="Debt">{t("order.paymentStatuses.debt")}</option>
                                <option value="Variance">{t("order.paymentStatuses.variance")}</option>
                            </select>
                        </div>
                    </div>

                    {/* Invoice Numbers Section (Read Only) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t("accounting.invoices") || "Invoices"}</label>
                        <div className="flex flex-wrap gap-2">
                            {invoiceNumbers.length > 0 ? (
                                invoiceNumbers.map((inv, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-sm border border-border">
                                        {inv}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground italic">--</span>
                            )}
                        </div>
                    </div>

                    {/* Total Paid Section */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t("accounting.totalPaid") || "Total Paid"}</label>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={totalPaid}
                                onChange={(e) => setTotalPaid(parseFloat(e.target.value) || 0)}
                                onKeyDown={handleNumberKeyDown}
                                onWheel={(e) => e.currentTarget.blur()}
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground text-sm">VND</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        {isLoading ? (
                            "Saving..."
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> {t("common.save")}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
