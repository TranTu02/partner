import { useState, useEffect } from "react";
import { Search, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { getOrders, getOrderStats } from "@/api/index";
import type { Order } from "@/types/order";
import type { AccountingStats as AccountingStatsType } from "@/types/common";
import { AccountingStats } from "@/components/accounting/AccountingStats";
import { AccountingTable } from "@/components/accounting/AccountingTable";
import { AccountingDetailModal } from "@/components/accounting/AccountingDetailModal";
import { BulkPaymentModal } from "@/components/accounting/BulkPaymentModal";

interface AccountingPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function AccountingPage({ activeMenu, onMenuClick }: AccountingPageProps) {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<AccountingStatsType>({ waitingExportInvoiceCount: 0, paymentProblemOrderCount: 0, totalPaymentDifferenceAmount: 0 });
    const [searchQuery, setSearchQuery] = useState("");

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filter State
    const [filterType, setFilterType] = useState<"pending" | "completed" | "totalPending" | "all">("pending");
    const [tableFilters, setTableFilters] = useState<any>({});

    useEffect(() => {
        fetchOrders();
    }, [page, itemsPerPage, filterType, searchQuery, tableFilters]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const query: any = {
                page,
                itemsPerPage,
                search: searchQuery || undefined,
            };

            // Filter conditions based on stats cards:
            // - "Chưa xuất hóa đơn" (pending): orderStatus IN ('Processing', 'Completed') AND invoiceNumbers IS NULL AND paymentStatus IN ('Paid', 'Debt')
            // - "Lệch/Chờ thanh toán" (completed): paymentStatus NOT IN ('Paid', 'Debt') AND requestDate IS NOT NULL
            // - "Tổng giá trị lệch/chờ" (totalPending): same as "completed" filter

            if (filterType === "pending") {
                // Chưa xuất hóa đơn
                query.orderStatus = ["Processing", "Completed"];
                query.invoiceNumbers = ["IS NULL"];
                query.paymentStatus = ["Paid", "Debt"];
            } else if (filterType === "completed") {
                // Lệch/Chờ thanh toán
                query.paymentStatus = ["Unpaid", "Partial", "Variance"];
                query.requestDate = ["IS NOT NULL"];
            } else if (filterType === "totalPending") {
                // Tổng giá trị lệch/chờ (same filter as completed)
                query.paymentStatus = ["Unpaid", "Partial", "Variance"];
                query.requestDate = ["IS NOT NULL"];
            }

            // Merge table filters (spread them into query)
            // Table filters might have receiptId, invoiceNumbers, orderStatus, paymentStatus, requestDate
            // Note: If table filter defines 'orderStatus', it might conflict with 'filterType'.
            // Priority: Table Filters override Filter Type (or we merge?)
            // Implementation: Spread tableFilters AFTER base filters.
            // However, paymentStatus from filterType is array, paymentStatus from Table is array.
            // We should probably rely on Table Filters if they exist, otherwise use Filter Type.
            // But user is "Adding" filters.
            Object.assign(query, tableFilters);

            const res = await getOrders({ query });
            if (res.data) {
                setOrders(res.data as Order[]);
                if (res.meta) {
                    setTotalPages(res.meta.totalPages || 1);
                    setTotalItems(res.meta.total || 0);
                }
            } else {
                setOrders([]);
                setTotalItems(0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Failed to fetch orders", error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await getOrderStats({});
            if (res.data) {
                setStats(res.data as any);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    const handleEditOrder = (order: Order) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-xl font-bold text-foreground">{t("accounting.management")}</h1>
                <p className="text-sm text-muted-foreground">{t("accounting.subtitle")}</p>
            </div>
            <button
                onClick={() => setShowBulkPaymentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
                <Upload className="w-4 h-4" />
                {t("accounting.bulkPayment.button")}
            </button>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div>
                {/* Search Bar */}
                <div className="bg-card rounded-lg border border-border p-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("accounting.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
                        />
                    </div>
                </div>

                {/* Stats */}
                <AccountingStats
                    stats={stats}
                    filterType={filterType}
                    onFilterChange={(type) => {
                        setFilterType(type);
                        setPage(1); // Reset to first page when filter changes
                    }}
                />

                <AccountingTable
                    orders={orders}
                    loading={loading}
                    pagination={{ page, itemsPerPage, totalItems, totalPages }}
                    onPageChange={setPage}
                    onItemsPerPageChange={(limit) => {
                        setItemsPerPage(limit);
                        setPage(1);
                    }}
                    onEdit={handleEditOrder}
                    onFilterChange={(filters) => {
                        setTableFilters(filters);
                        setPage(1);
                    }}
                />

                <AccountingDetailModal
                    open={showDetailModal}
                    order={selectedOrder}
                    onClose={() => setShowDetailModal(false)}
                    onRefresh={() => {
                        fetchOrders();
                        fetchStats();
                    }}
                />

                <BulkPaymentModal
                    open={showBulkPaymentModal}
                    onClose={() => setShowBulkPaymentModal(false)}
                    onSuccess={() => {
                        fetchOrders();
                        fetchStats();
                    }}
                />
            </div>
        </MainLayout>
    );
}
