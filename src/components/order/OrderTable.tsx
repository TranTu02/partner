import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@/types/order";
import { Eye, Pencil, Copy, FileDown, FileText, StickyNote } from "lucide-react";

interface OrderTableProps {
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
    onViewDetail: (order: Order) => void;
    onEdit: (order: Order) => void;
    onDuplicate: (order: Order) => void;
    onPrint: (order: Order) => void;
    onPrintSampleRequest: (order: Order) => void;
    onFilterChange: (filters: any) => void;
}

export function OrderTable({ orders, loading, pagination, onPageChange, onItemsPerPageChange, onViewDetail, onEdit, onDuplicate, onPrint, onPrintSampleRequest, onFilterChange }: OrderTableProps) {
    const { t } = useTranslation();
    const { page, itemsPerPage, totalItems, totalPages } = pagination;

    // Filter States
    const [filters, setFilters] = useState<any>({});
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    // Ranges
    const [dateRange, setDateRange] = useState({ from: "", to: "" }); // Request Date
    const [createdDateRange, setCreatedDateRange] = useState({ from: "", to: "" }); // Created Date
    const [paymentDateRange, setPaymentDateRange] = useState({ from: "", to: "" });
    const [amountRange, setAmountRange] = useState({ from: "", to: "" });

    // Multi-select Status
    const [statusFilter, setStatusFilter] = useState<{ orderStatus: string[]; paymentStatus: string[] }>({
        orderStatus: [],
        paymentStatus: [],
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click Outside
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
    };

    const isActive = (key: string) => !!filters[key];

    // --- Handlers from AccountingTable ---

    // 1. Created Date Filter (replacing Order Code toggle)
    const handleCreatedDateApply = () => {
        let { from, to } = createdDateRange;
        if (from && !to) to = from;
        if (!from && to) from = to;

        if (from && to) {
            const [d1, m1, y1] = from.split("-");
            const [d2, m2, y2] = to.split("-");
            const fromDate = `${y1}-${m1}-${d1} 00:00:00`;
            const toDate = `${y2}-${m2}-${d2} 23:59:59`;
            updateFilter("createdAt", [`BETWEEN '${fromDate}' AND '${toDate}'`]);
        }
        setActiveDropdown(null);
    };

    const handleCreatedDateInput = (field: "from" | "to", value: string) => {
        let v = value.replace(/[^0-9]/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        let formatted = v;
        if (v.length > 4) formatted = `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4)}`;
        else if (v.length > 2) formatted = `${v.slice(0, 2)}-${v.slice(2)}`;
        setCreatedDateRange((prev) => ({ ...prev, [field]: formatted }));
    };

    // 1b. Receipt ID Toggle
    const handleReceiptIdClick = () => {
        const current = filters.receiptId?.[0];
        if (!current) {
            updateFilter("receiptId", ["IS NOT NULL"]);
        } else if (current === "IS NOT NULL") {
            updateFilter("receiptId", ["IS NULL"]);
        } else {
            updateFilter("receiptId", undefined);
        }
    };

    // 2. Client Filter is usually search-based in ListPage, but here we keep it simple or remove if unnecessary.
    // AccountingTable didn't implement Client filter dropdown, just text sort/filter maybe?
    // Actually AccountingTable didn't have specific filter for Client column, implied global search.
    // We will stick to global search for Client/Code in parent component (OrdersListPage).

    // 3. Invoice Numbers
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

    // 4. Status
    const toggleStatusSelection = (type: "orderStatus" | "paymentStatus", value: string) => {
        const current = statusFilter[type];
        const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
        setStatusFilter({ ...statusFilter, [type]: updated });
    };

    const handleStatusConfirm = () => {
        const f = { ...filters };
        if (statusFilter.orderStatus.length > 0) f.orderStatus = statusFilter.orderStatus;
        else delete f.orderStatus;
        if (statusFilter.paymentStatus.length > 0) f.paymentStatus = statusFilter.paymentStatus;
        else delete f.paymentStatus;
        setFilters(f);
        onFilterChange(f);
        setActiveDropdown(null);
    };

    const clearStatusFilter = () => {
        setStatusFilter({ orderStatus: [], paymentStatus: [] });
    };

    // 5. Total Amount (Order Value)
    const handleAmountApply = () => {
        const { from, to } = amountRange;
        const fromNum = from ? parseFloat(from.replace(/[^0-9.-]/g, "")) : null;
        const toNum = to ? parseFloat(to.replace(/[^0-9.-]/g, "")) : null;

        if (fromNum !== null && toNum !== null) {
            updateFilter("totalAmount", [`BETWEEN ${fromNum} AND ${toNum}`]);
        } else if (fromNum !== null) {
            updateFilter("totalAmount", [`>= ${fromNum}`]);
        } else if (toNum !== null) {
            updateFilter("totalAmount", [`<= ${toNum}`]);
        }
        setActiveDropdown(null);
    };

    const handleAmountInput = (field: "from" | "to", value: string) => {
        const numericValue = value.replace(/[^0-9]/g, "");
        setAmountRange((prev) => ({ ...prev, [field]: numericValue }));
    };

    const formatAmountDisplay = (value: string) => {
        if (!value) return "";
        return parseInt(value).toLocaleString("vi-VN");
    };

    // 6. Total Paid
    const handlePaymentFilterClick = () => {
        const current = filters.totalPaid?.[0];
        if (!current) {
            updateFilter("totalPaid", ["IS NOT NULL"]);
        } else if (current === "IS NOT NULL") {
            updateFilter("totalPaid", ["IS NULL"]);
        } else {
            updateFilter("totalPaid", undefined);
        }
    };

    const handlePaymentDateApply = () => {
        let { from, to } = paymentDateRange;
        if (from && !to) to = from;
        if (!from && to) from = to;
        if (from && to) {
            const [d1, m1, y1] = from.split("-");
            const [d2, m2, y2] = to.split("-");
            const fromDate = `${y1}-${m1}-${d1} 00:00:00`;
            const toDate = `${y2}-${m2}-${d2} 23:59:59`;
            updateFilter("paymentDate", [`BETWEEN '${fromDate}' AND '${toDate}'`]);
        }
        setActiveDropdown(null);
    };

    const handlePaymentDateInput = (field: "from" | "to", value: string) => {
        let v = value.replace(/[^0-9]/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        let formatted = v;
        if (v.length > 4) formatted = `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4)}`;
        else if (v.length > 2) formatted = `${v.slice(0, 2)}-${v.slice(2)}`;
        setPaymentDateRange((prev) => ({ ...prev, [field]: formatted }));
    };

    // 7. Request Date (replacing Created Date)
    const handleDateApply = () => {
        let { from, to } = dateRange;
        if (from && !to) to = from;
        if (!from && to) from = to;
        if (from && to) {
            const [d1, m1, y1] = from.split("-");
            const [d2, m2, y2] = to.split("-");
            const fromDate = `${y1}-${m1}-${d1} 00:00:00`;
            const toDate = `${y2}-${m2}-${d2} 23:59:59`;
            updateFilter("requestDate", [`BETWEEN '${fromDate}' AND '${toDate}'`]);
        }
        setActiveDropdown(null);
    };

    const handleDateInput = (field: "from" | "to", value: string) => {
        let v = value.replace(/[^0-9]/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        let formatted = v;
        if (v.length > 4) formatted = `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4)}`;
        else if (v.length > 2) formatted = `${v.slice(0, 2)}-${v.slice(2)}`;
        setDateRange((prev) => ({ ...prev, [field]: formatted }));
    };

    return (
        <div className="bg-card rounded-lg border border-border overflow-visible flex flex-col relative z-0">
            <div className="overflow-x-auto flex-1 min-h-[400px]">
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-20 shadow-sm">
                        <tr>
                            {/* Order Code */}
                            {/* Order Code + Created Date */}
                            <th
                                className={`px-6 py-4 text-left text-sm font-semibold min-w-size-medium cursor-pointer transition-colors select-none ${isActive("createdAt") ? "text-primary underline" : "text-foreground hover:text-primary/80"}`}
                                onClick={() => setActiveDropdown(activeDropdown === "created" ? null : "created")}
                            >
                                {t("order.code")}
                                {activeDropdown === "created" && (
                                    <div ref={dropdownRef} className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg p-4 z-50">
                                        <div className="space-y-3">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2">{t("order.createdDate", "Ngày tạo đơn")}</div>
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="__-__-20__"
                                                    value={createdDateRange.from}
                                                    onChange={(e) => handleCreatedDateInput("from", e.target.value)}
                                                    maxLength={10}
                                                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="__-__-20__"
                                                    value={createdDateRange.to}
                                                    onChange={(e) => handleCreatedDateInput("to", e.target.value)}
                                                    maxLength={10}
                                                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        updateFilter("createdAt", undefined);
                                                        setCreatedDateRange({ from: "", to: "" });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="flex-1 py-1 text-xs border border-border rounded hover:bg-muted"
                                                >
                                                    {t("accounting.filter.clear")}
                                                </button>
                                                <button onClick={handleCreatedDateApply} className="flex-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                                                    {t("accounting.filter.apply")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </th>

                            {/* Client */}
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("order.client")}</th>

                            {/* Sale Person */}
                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("order.salePerson")}</th>

                            {/* Status (Merged) */}
                            <th className="px-6 py-4 text-left text-sm font-semibold min-w-size-large relative">
                                <span
                                    className={`cursor-pointer select-none ${isActive("orderStatus") || isActive("paymentStatus") ? "text-primary underline" : "text-foreground hover:text-primary/80"}`}
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
                                                    {t("common.confirm")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </th>

                            {/* Total Amount (Order Value) */}
                            <th className="px-6 py-4 text-right text-sm font-semibold min-w-size-medium relative">
                                <span
                                    className={`cursor-pointer select-none ${isActive("totalAmount") ? "text-primary underline" : "text-foreground hover:text-primary/80"}`}
                                    onClick={() => setActiveDropdown(activeDropdown === "amount" ? null : "amount")}
                                >
                                    {t("order.orderValue", "Giá trị đơn")}
                                </span>
                                {activeDropdown === "amount" && (
                                    <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg p-4 z-50 text-left">
                                        <div className="space-y-3">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2">{t("accounting.filter.amountFilter")}</div>
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">{t("accounting.filter.fromAmount")}</label>
                                                <input
                                                    type="text"
                                                    placeholder="0"
                                                    value={formatAmountDisplay(amountRange.from)}
                                                    onChange={(e) => handleAmountInput("from", e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-right"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">{t("accounting.filter.toAmount")}</label>
                                                <input
                                                    type="text"
                                                    placeholder="999,999,999"
                                                    value={formatAmountDisplay(amountRange.to)}
                                                    onChange={(e) => handleAmountInput("to", e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-right"
                                                />
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => {
                                                        updateFilter("totalAmount", undefined);
                                                        setAmountRange({ from: "", to: "" });
                                                        setActiveDropdown(null);
                                                    }}
                                                    className="flex-1 py-1 text-xs border border-border rounded hover:bg-muted"
                                                >
                                                    {t("accounting.filter.clear")}
                                                </button>
                                                <button onClick={handleAmountApply} className="flex-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                                                    {t("accounting.filter.apply")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </th>

                            {/* Total Paid */}
                            <th className="px-6 py-4 text-right text-sm font-semibold min-w-size-medium relative">
                                <span
                                    className={`cursor-pointer select-none ${isActive("totalPaid") || isActive("paymentDate") ? "text-primary underline" : "text-foreground hover:text-primary/80"}`}
                                    onClick={() => setActiveDropdown(activeDropdown === "payment" ? null : "payment")}
                                >
                                    {t("accounting.table.totalPaid")}
                                </span>
                                {activeDropdown === "payment" && (
                                    <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg p-4 z-50 text-left">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-2">{t("accounting.filter.paymentFilter")}</div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handlePaymentFilterClick}
                                                        className={`flex-1 py-1.5 text-xs rounded border transition-colors ${filters.totalPaid?.[0] === "IS NOT NULL" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                                                    >
                                                        {t("accounting.filter.hasPaid")}
                                                    </button>
                                                    <button
                                                        onClick={handlePaymentFilterClick}
                                                        className={`flex-1 py-1.5 text-xs rounded border transition-colors ${filters.totalPaid?.[0] === "IS NULL" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                                                    >
                                                        {t("accounting.filter.notPaid")}
                                                    </button>
                                                    {filters.totalPaid && (
                                                        <button
                                                            onClick={() => updateFilter("totalPaid", undefined)}
                                                            className="px-2 py-1.5 text-xs text-destructive border border-destructive/50 rounded hover:bg-destructive/10"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="border-t border-border pt-3">
                                                <div className="text-xs font-semibold text-muted-foreground mb-2">{t("accounting.filter.paymentDateFilter")}</div>
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="__-__-20__"
                                                        value={paymentDateRange.from}
                                                        onChange={(e) => handlePaymentDateInput("from", e.target.value)}
                                                        maxLength={10}
                                                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="__-__-20__"
                                                        value={paymentDateRange.to}
                                                        onChange={(e) => handlePaymentDateInput("to", e.target.value)}
                                                        maxLength={10}
                                                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                    />
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => {
                                                            updateFilter("paymentDate", undefined);
                                                            setPaymentDateRange({ from: "", to: "" });
                                                            setActiveDropdown(null);
                                                        }}
                                                        className="flex-1 py-1 text-xs border border-border rounded hover:bg-muted"
                                                    >
                                                        {t("accounting.filter.clear")}
                                                    </button>
                                                    <button onClick={handlePaymentDateApply} className="flex-1 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                                                        {t("accounting.filter.apply")}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </th>

                            {/* Invoice Numbers */}
                            <th
                                className={`px-6 py-4 text-left text-sm font-semibold min-w-size-medium cursor-pointer transition-colors select-none ${isActive("invoiceNumbers") ? "text-primary underline" : "text-foreground hover:text-primary/80"}`}
                                onClick={handleInvoiceClick}
                                title="Click to filter"
                            >
                                {t("accounting.table.invoiceNumbers")}
                                {itemsPerPage && isActive("invoiceNumbers") && (
                                    <span className="ml-1 text-xs no-underline">({filters.invoiceNumbers[0] === "IS NOT NULL" ? "Has Invoice" : "No Invoice"})</span>
                                )}
                            </th>

                            {/* Reception Info (Request Date + Receipt ID) */}
                            <th className="px-6 py-4 text-center text-sm font-semibold min-w-size-medium relative">
                                <span
                                    className={`cursor-pointer select-none ${isActive("requestDate") || isActive("receiptId") ? "text-primary underline" : "text-foreground hover:text-primary/80"}`}
                                    onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
                                >
                                    {t("order.receptionInfo", "Thông tin tiếp nhận")}
                                </span>
                                {activeDropdown === "date" && (
                                    <div ref={dropdownRef} className="absolute top-full right-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg p-4 z-50 text-left">
                                        <div className="space-y-4">
                                            {/* Receipt ID Filter */}
                                            <div>
                                                <div className="text-xs font-semibold text-muted-foreground mb-2">{t("order.receiptId", "Mã tiếp nhận")}</div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleReceiptIdClick}
                                                        className={`flex-1 py-1.5 text-xs rounded border transition-colors ${filters.receiptId?.[0] === "IS NOT NULL" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                                                    >
                                                        {t("common.received", "Đã tiếp nhận")}
                                                    </button>
                                                    <button
                                                        onClick={handleReceiptIdClick}
                                                        className={`flex-1 py-1.5 text-xs rounded border transition-colors ${filters.receiptId?.[0] === "IS NULL" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                                                    >
                                                        {t("common.notReceived", "Chưa tiếp nhận")}
                                                    </button>
                                                    {filters.receiptId && (
                                                        <button
                                                            onClick={() => updateFilter("receiptId", undefined)}
                                                            className="px-2 py-1.5 text-xs text-destructive border border-destructive/50 rounded hover:bg-destructive/10"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Request Date Filter */}
                                            <div className="border-t border-border pt-3">
                                                <div className="text-xs font-semibold text-muted-foreground mb-2">{t("order.requestDate", "Ngày tiếp nhận")}</div>
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="__-__-20__"
                                                        value={dateRange.from}
                                                        onChange={(e) => handleDateInput("from", e.target.value)}
                                                        maxLength={10}
                                                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="__-__-20__"
                                                        value={dateRange.to}
                                                        onChange={(e) => handleDateInput("to", e.target.value)}
                                                        maxLength={10}
                                                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                                                    />
                                                </div>
                                                <div className="flex gap-2 mt-3">
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
                                    </div>
                                )}
                            </th>

                            {/* Actions */}
                            <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("common.actions")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                    {t("common.loading")}
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                    {t("common.noData")}
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.orderId} className="hover:bg-muted/50 transition-colors">
                                    {/* Code */}
                                    <td className="px-6 py-4 text-sm font-medium text-primary cursor-pointer align-top" onClick={() => onViewDetail(order)}>
                                        <div>{order.orderId}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{order.createdAt ? formatDate(order.createdAt) : "--"}</div>
                                    </td>

                                    {/* Client */}
                                    <td className="px-6 py-4 text-sm text-foreground align-top">
                                        <div className="font-medium text-primary cursor-pointer hover:underline">{order.client?.clientName || "Unknown Client"}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{order.contactPerson?.contactName || "N/A"}</div>
                                    </td>

                                    {/* Sale Person */}
                                    <td className="px-6 py-4 text-sm text-foreground align-top">{order.salePerson || "-"}</td>

                                    {/* Status (Merged) */}
                                    <td className="px-6 py-4 text-sm text-foreground align-top">
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

                                    {/* Order Value */}
                                    <td className="px-6 py-4 text-right text-sm font-medium text-foreground align-top">{formatCurrency(order.totalAmount || 0)}</td>

                                    {/* Total Paid */}
                                    <td className="px-6 py-4 text-right text-sm text-foreground align-top">
                                        <div>{formatCurrency(order.totalPaid || 0)}</div>
                                        {order.paymentDate && <div className="text-xs text-muted-foreground mt-0.5">{formatDate(order.paymentDate)}</div>}
                                    </td>

                                    {/* Invoice Numbers */}
                                    <td className="px-6 py-4 text-sm text-foreground align-top">
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

                                    {/* Reception Info */}
                                    <td className="px-6 py-4 text-center text-sm text-foreground align-top">
                                        {order.receiptId && <div className="font-medium text-primary mb-0.5">{order.receiptId}</div>}
                                        <div className="text-muted-foreground">{order.requestDate ? formatDate(order.requestDate) : "--"}</div>
                                    </td>

                                    {/* IPv4 Actions + Note */}
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* Note Icon */}
                                            {order.orderNote && (
                                                <div className="relative group">
                                                    <div className="p-1 text-primary cursor-help">
                                                        <StickyNote className="w-4 h-4" fill="currentColor" />
                                                    </div>
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap max-w-xs truncate z-50 pointer-events-none">
                                                        {order.orderNote}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => onViewDetail(order)}
                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                title={t("common.view")}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onEdit(order)}
                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                title={t("common.edit")}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDuplicate(order)}
                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                title={t("common.duplicate")}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onPrint(order)}
                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                title={t("order.downloadReport")}
                                            >
                                                <FileDown className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onPrintSampleRequest(order)}
                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                title={t("order.print.sampleRequest")}
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
            <div className="border-t border-border p-4 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("pagination.showing")}</span>
                    <select
                        className="bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:border-primary"
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
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
