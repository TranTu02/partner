import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Order } from "@/types/order";
import { formatCurrency } from "@/lib/utils";

interface InvoiceModalProps {
    order: Order | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function InvoiceModal({ order, open, onClose, onConfirm }: InvoiceModalProps) {
    const { t } = useTranslation();

    if (!open || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-lg rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">{t("accounting.createInvoice")}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t("accounting.table.orderCode")}</label>
                            <div className="text-base font-medium text-foreground mt-1">{order.orderId}</div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t("accounting.table.date")}</label>
                            <div className="text-base font-medium text-foreground mt-1">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">{t("accounting.table.client")}</label>
                            <div className="text-base font-medium text-foreground mt-1">{order.client?.clientName}</div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">{t("accounting.table.taxCode")}</label>
                            <div className="text-base font-medium text-foreground mt-1">{order.client?.legalId}</div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">{t("client.invoiceEmail")}</label>
                            <div className="text-base font-medium text-foreground mt-1">{order.client?.invoiceInfo?.taxEmail || order.client?.clientContacts?.[0]?.contactEmail || "-"}</div>
                        </div>
                        <div className="col-span-2 border-t border-border pt-4 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">{t("order.subtotal")}</span>
                                <span className="font-medium">{formatCurrency(order.totalFeeBeforeTax || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">{t("order.vat")}</span>
                                <span className="font-medium text-foreground">{formatCurrency(order.totalTaxValue || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">{t("order.pricing.discountAmount")}</span>
                                <span className="font-medium text-foreground">{formatCurrency(order.totalDiscountValue || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-border">
                                <span className="font-bold text-foreground">{t("accounting.table.total")}</span>
                                <span className="text-xl font-bold text-primary">{formatCurrency(order.totalAmount || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm font-medium transition-colors">
                        {t("common.cancel")}
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm">
                        {t("accounting.confirmInvoice")}
                    </button>
                </div>
            </div>
        </div>
    );
}
