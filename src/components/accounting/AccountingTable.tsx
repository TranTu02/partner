import { FileText } from "lucide-react";
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
}

export function AccountingTable({ orders, loading, pagination, onPageChange, onItemsPerPageChange, onCreateInvoice }: AccountingTableProps) {
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
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.taxCode")}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.total")}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.commission")}</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.date")}</th>
                            <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("common.action")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                    {t("common.loading")}
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                    {t("accounting.noInvoicesFound")}
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.orderId} className="border-t border-border hover:bg-muted">
                                    <td className="px-6 py-4 text-sm font-medium text-primary">{order.orderId}</td>
                                    <td className="px-6 py-4 text-sm text-foreground">{order.client?.clientName}</td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">{order.client?.legalId}</td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{formatCurrency(order.totalAmount || 0)}</td>
                                    <td className="px-6 py-4 text-right text-sm text-foreground">{order.saleCommissionPercent !== undefined ? `${order.saleCommissionPercent}%` : "-"}</td>
                                    <td className="px-6 py-4 text-center text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => onCreateInvoice(order)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                        >
                                            <FileText className="w-4 h-4" />
                                            {t("accounting.createInvoice")}
                                        </button>
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
