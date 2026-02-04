import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
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
    onEdit: (order: Order) => void;
    onFilterChange: (filters: any) => void;
}

export function AccountingTable({ orders, loading, pagination, onPageChange, onItemsPerPageChange, onEdit, onFilterChange }: AccountingTableProps) {
    const { t } = useTranslation();
    const { page, itemsPerPage, totalItems, totalPages } = pagination;

    const [filters, setFilters] = useState<any>({});
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Date Filter State
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    // Status Filter State
    const [statusFilter, setStatusFilter] = useState<{ orderStatus: string[]; paymentStatus: string[] }>({
        orderStatus: [],
        paymentStatus: [],
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click Outside Handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateFilter = (key: string, value: any) => {
        const newFilters = { ...filters };
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
            delete newFilters[key];
        } else {
            newFilters[key] = value;
        }
        setFilters(newFilters);
        onFilterChange(newFilters);
        // Reset local states when filter logic runs completely (except for keeping local UI sync if needed)
    };

    // 1. Order Code: Receipt ID Toggle
    const handleOrderCodeClick = () => {
        const current = filters.receiptId;
        if (!current) {
            updateFilter("receiptId", ["IS NOT NULL"]);
        } else {
            updateFilter("receiptId", undefined);
        }
    };

    // 2. Invoice Numbers: 3-State Toggle
    const handleInvoiceClick = () => {
        const current = filters.invoiceNumbers?.[0];
        if (!current) {
            updateFilter("invoiceNumbers", ["IS NOT NULL"]);
        } else if (current === "IS NOT NULL") {
            updateFilter("invoiceNumbers", ["IS NULL"]);
        } else {
            updateFilter("invoiceNumbers", undefined);
        }
    };

    // 3. Status Dropdown
    const toggleStatusSelection = (type: "orderStatus" | "paymentStatus", value: string) => {
        const current = statusFilter[type];
        const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
        setStatusFilter({ ...statusFilter, [type]: updated });
    };

    const handleStatusConfirm = () => {
        const f = { ...filters };

        if (statusFilter.orderStatus.length > 0) {
            f.orderStatus = statusFilter.orderStatus;
        } else {
            delete f.orderStatus;
        }

        if (statusFilter.paymentStatus.length > 0) {
            f.paymentStatus = statusFilter.paymentStatus;
        } else {
            delete f.paymentStatus;
        }

        setFilters(f);
        onFilterChange(f);
        setActiveDropdown(null);
    };

    const clearStatusFilter = () => {
        setStatusFilter({ orderStatus: [], paymentStatus: [] });
    };

    // 4. Date Filter
    const handleDateApply = () => {
        let { from, to } = dateRange;
        // Auto fill logic
        if (from && !to) to = from;
        if (!from && to) from = to;

        if (from && to) {
            // Convert DD-MM-YYYY to YYYY-MM-DD
            const [d1, m1, y1] = from.split("-");
            const [d2, m2, y2] = to.split("-");

            const fromDate = `${y1}-${m1}-${d1} 00:00:00`;
            const toDate = `${y2}-${m2}-${d2} 23:59:59`;

            updateFilter("requestDate", [`BETWEEN '${fromDate}' AND '${toDate}'`]);
        }
        setActiveDropdown(null);
    };

    const handleDateInput = (field: "from" | "to", value: string) => {
        // Simple input masking for DD-MM-YYYY
        let v = value.replace(/[^0-9]/g, "");
        if (v.length > 8) v = v.slice(0, 8);

        let formatted = "";
        if (v.length > 4) {
            formatted = `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4)}`;
        } else if (v.length > 2) {
            formatted = `${v.slice(0, 2)}-${v.slice(2)}`;
        } else {
            formatted = v;
        }

        setDateRange((prev) => ({ ...prev, [field]: formatted }));
    };

    const isActive = (key: string) => !!filters[key];

    return (
        <div className="bg-card rounded-lg border border-border overflow-visible flex flex-col relative z-0">
            {/* Sticky header context requires overflow-visible for dropdowns to pop out, but we want scroll for table body. 
                 Solution: overflow-auto on the wrapper of table, but dropdowns might get clipped. 
                 Better: Use absolute positioning relative to th. 
             */}
            <div className="overflow-x-auto flex-1 min-h-[400px]">
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th
                                className={`px-6 py-4 text-left text-sm font-semibold min-w-size-medium cursor-pointer transition-colors select-none ${
                                    isActive("receiptId") ? "text-primary underline" : "text-foreground hover:text-primary/80"
                                }`}
                                onClick={handleOrderCodeClick}
                            >
                                {t("accounting.table.orderCode")}
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("accounting.table.client")}</th>
                            <th
                                className={`px-6 py-4 text-left text-sm font-semibold min-w-size-medium cursor-pointer transition-colors select-none ${
                                    isActive("invoiceNumbers") ? "text-primary underline" : "text-foreground hover:text-primary/80"
                                }`}
                                onClick={handleInvoiceClick}
                                title="Click to filter (Has Invoice / No Invoice / All)"
                            >
                                {t("accounting.table.invoiceNumbers")}
                                {itemsPerPage && isActive("invoiceNumbers") && (
                                    <span className="ml-1 text-xs no-underline">({filters.invoiceNumbers[0] === "IS NOT NULL" ? "Not Empty" : "Empty"})</span>
                                )}
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.salePerson")}</th>

                            {/* Status Filter Dropdown */}
                            <th className="px-6 py-4 text-left text-sm font-semibold min-w-size-medium relative">
                                <span
                                    className={`cursor-pointer select-none ${
                                        isActive("orderStatus") || isActive("paymentStatus") ? "text-primary underline" : "text-foreground hover:text-primary/80"
                                    }`}
                                    onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                                >
                                    {t("accounting.table.status")}
                                </span>
                                {activeDropdown === "status" && (
                                    <div ref={dropdownRef} className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg p-4 z-50">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-2">{t("order.status")}</div>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {["Pending", "Processing", "Completed", "Cancelled"].map((st) => (
                                                        <label key={st} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={statusFilter.orderStatus.includes(st)}
                                                                onChange={() => toggleStatusSelection("orderStatus", st)}
                                                                className="rounded border-border"
                                                            />
                                                            {t(`order.statuses.${st.toLowerCase()}` as any)}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-2">{t("accounting.table.payment")}</div>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {["Unpaid", "Partial", "Paid", "Debt", "Variance"].map((st) => (
                                                        <label key={st} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={statusFilter.paymentStatus.includes(st)}
                                                                onChange={() => toggleStatusSelection("paymentStatus", st)}
                                                                className="rounded border-border"
                                                            />
                                                            {t(`order.paymentStatuses.${st.toLowerCase()}` as any)}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={clearStatusFilter} className="flex-1 py-1 text-xs text-muted-foreground border border-border rounded hover:bg-muted">
                                                    {t("accounting.filter.clear")}
                                                </button>
                                                <button onClick={handleStatusConfirm} className="flex-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                                                    {t("common.confirm") || "Confirm"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </th>

                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.total")}</th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.totalPaid")}</th>

                            {/* Date Filter Dropdown */}
                            <th className="px-6 py-4 text-center text-sm font-semibold min-w-size-medium relative">
                                <span
                                    className={`cursor-pointer select-none ${isActive("requestDate") ? "text-primary underline" : "text-foreground hover:text-primary/80"}`}
                                    onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
                                >
                                    {t("accounting.table.date")}
                                </span>
                                {activeDropdown === "date" && (
                                    <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg p-4 z-50">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">{t("accounting.filter.fromDate")}</label>
                                                <input
                                                    type="text"
                                                    placeholder="__-__-20__"
                                                    value={dateRange.from}
                                                    onChange={(e) => handleDateInput("from", e.target.value)}
                                                    maxLength={10}
                                                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">{t("accounting.filter.toDate")}</label>
                                                <input
                                                    type="text"
                                                    placeholder="__-__-20__"
                                                    value={dateRange.to}
                                                    onChange={(e) => handleDateInput("to", e.target.value)}
                                                    maxLength={10}
                                                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        updateFilter("requestDate", undefined);
                                                        setDateRange({ from: "", to: "" });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="flex-1 py-1 text-xs border border-border rounded hover:bg-muted"
                                                >
                                                    {t("accounting.filter.clear")}
                                                </button>
                                                <button onClick={handleDateApply} className="flex-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                                                    {t("accounting.filter.apply")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </th>
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
                                    <td className="px-6 py-4 text-sm font-medium text-primary">
                                        <div>{order.orderId}</div>
                                        {order.receiptId && <div className="text-xs text-muted-foreground mt-0.5">{order.receiptId}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        <div>{order.client?.clientName || "--"}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{order.client?.legalId || "--"}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        {order.invoiceNumbers && order.invoiceNumbers.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {order.invoiceNumbers.map((inv, idx) => (
                                                    <div key={idx} className="bg-muted px-2 py-0.5 rounded text-xs w-fit">
                                                        {inv}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            "--"
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-foreground">{order.salePerson || "--"}</td>
                                    <td className="px-6 py-4 text-sm text-foreground">
                                        <div className="space-y-1">
                                            {order.orderStatus && (
                                                <span
                                                    className={`block w-fit px-2 py-1 rounded-full text-xs font-medium ${
                                                        order.orderStatus === "Completed"
                                                            ? "bg-green-100 text-green-700"
                                                            : order.orderStatus === "Cancelled"
                                                              ? "bg-red-100 text-red-700"
                                                              : "bg-yellow-100 text-yellow-700"
                                                    }`}
                                                >
                                                    {t(`order.statuses.${order.orderStatus.toLowerCase()}` as any)}
                                                </span>
                                            )}
                                            {order.paymentStatus && (
                                                <span
                                                    className={`block w-fit px-2 py-1 rounded-full text-xs font-medium ${
                                                        order.paymentStatus === "Paid"
                                                            ? "bg-green-100 text-green-700"
                                                            : order.paymentStatus === "Debt"
                                                              ? "bg-orange-100 text-orange-700"
                                                              : order.paymentStatus === "Variance"
                                                                ? "bg-purple-100 text-purple-700"
                                                                : "bg-gray-100 text-gray-700"
                                                    }`}
                                                >
                                                    {t(`order.paymentStatuses.${order.paymentStatus.toLowerCase()}` as any)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{formatCurrency(order.totalAmount || 0)}</td>
                                    <td className="px-6 py-4 text-right text-sm text-foreground">{formatCurrency(order.totalPaid || 0)}</td>
                                    <td className="px-6 py-4 text-center text-sm text-muted-foreground">{order.requestDate ? formatDate(order.requestDate) : "--"}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(order)}
                                                className="p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                                                title={t("accounting.edit")}
                                            >
                                                <Pencil className="w-4 h-4" />
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
