import { FileText, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Order } from "@/types/order";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AccountingTableProps {
    orders: Order[];
    loading?: boolean;
    pagination: {
        page: number;
        itemsPerPage: number;
        totalItems: number;
        totalPages: number;
    };
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    onCreateInvoice: (order: Order) => void;
    onEdit: (order: Order) => void;
}

export function AccountingTable({ orders, loading, pagination, onPageChange, onItemsPerPageChange, onCreateInvoice, onEdit }: AccountingTableProps) {
    const { t } = useTranslation();
    const { page, itemsPerPage, totalItems, totalPages } = pagination;

    return (
        <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.orderCode")}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("accounting.table.client")}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.salePerson")}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.status")}</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.payment")}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.total")}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.commission")}</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.date")}</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("common.action")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                    {t("common.loading")}
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                    {t("accounting.noInvoicesFound")}
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.orderId} className="border-t border-border hover:bg-muted">
                                    <td className="px-6 py-4 text-sm font-medium text-primary">{order.orderId}</td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        <div>{order.client?.clientName || "--"}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{order.client?.legalId || "--"}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">{order.salePerson || "--"}</td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        {order.orderStatus ? (
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    order.orderStatus === "Completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : order.orderStatus === "Cancelled"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                }`}
                                            >
                                                {t(`order.statuses.${order.orderStatus.toLowerCase()}` as any)}
                                            </span>
                                        ) : (
                                            "--"
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        {order.paymentStatus ? (
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    order.paymentStatus === "Paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : order.paymentStatus === "Debt"
                                                        ? "bg-orange-100 text-orange-700"
                                                        : "bg-gray-100 text-gray-700"
                                                }`}
                                            >
                                                {t(`order.paymentStatuses.${order.paymentStatus.toLowerCase()}` as any)}
                                            </span>
                                        ) : (
                                            "--"
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{formatCurrency(order.totalAmount || 0)}</td>
                                    <td className="px-6 py-4 text-right text-sm text-foreground">{order.saleCommissionPercent != null ? `${order.saleCommissionPercent}%` : "--"}</td>
                                    <td className="px-6 py-4 text-center text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(order)}
                                                className="p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                                                title={t("accounting.edit")}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onCreateInvoice(order)}
                                                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                                title={t("accounting.createInvoice")}
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-border p-4 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("pagination.showing")}</span>
                    <select
                        className="bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
                        value={itemsPerPage}
                        onChange={(e) => {
                            onItemsPerPageChange(Number(e.target.value));
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>
                        {t("pagination.of")} {totalItems} {t("pagination.results")}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        onClick={() => onPageChange(Math.max(1, page - 1))}
                        disabled={page === 1}
                    >
                        {t("pagination.previous")}
                    </button>
                    <span className="text-sm font-medium text-foreground">
                        {t("common.page")} {page} / {totalPages}
                    </span>
                    <button
                        className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                    >
                        {t("pagination.next")}
                    </button>
                </div>
            </div>
        </div>
    );
}
