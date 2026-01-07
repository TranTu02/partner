import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { getOrders, getOrderStats } from "@/api/index";
import type { Order } from "@/types/order";
import { AccountingStats } from "@/components/accounting/AccountingStats";
import { AccountingTable } from "@/components/accounting/AccountingTable";
import { InvoiceModal } from "@/components/accounting/InvoiceModal";
import { AccountingDetailModal } from "@/components/accounting/AccountingDetailModal";

interface AccountingPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function AccountingPage({ activeMenu, onMenuClick }: AccountingPageProps) {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState({ pendingCount: 0, completedCount: 0, totalPendingValue: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Filter State
    const [filterType, setFilterType] = useState<"pending" | "completed" | "totalPending" | "all">("pending");

    useEffect(() => {
        fetchOrders();
    }, [page, itemsPerPage, filterType, searchQuery]);

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

            // Requirement:
            // - "Chưa xuất hóa đơn" (pending): orderStatus = "Processing"
            // - "Đã xuất hóa đơn" (completed): orderStatus = "Completed"
            // - "Tổng giá trị chờ" (totalPending): orderStatus = "Processing" AND paymentStatus = ["Unpaid", "Partial"]

            if (filterType === "pending") {
                query.orderStatus = "Processing";
            } else if (filterType === "completed") {
                query.orderStatus = "Completed";
            } else if (filterType === "totalPending") {
                query.orderStatus = "Processing";
                // BE likely needs to handle array for paymentStatus or repeated params
                // We pass array here assuming axios/client helper serializes it correctly
                // If not, we might need to adjust based on BE framework (e.g. comma separated or repeated keys)
                query.paymentStatus = ["Unpaid", "Partial"];
            }

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

    const handleCreateInvoice = (order: Order) => {
        setSelectedOrder(order);
        setShowInvoiceModal(true);
    };

    const handleEditOrder = (order: Order) => {
        setSelectedOrder(order);
        setShowDetailModal(true);
    };

    const handleConfirmInvoice = () => {
        if (!selectedOrder) return;
        // In a real app, you would call an API here to generate an invoice
        alert(t("accounting.successMessage", { orderId: selectedOrder.orderId }));
        setShowInvoiceModal(false);
        setSelectedOrder(null);
        fetchOrders(); // Refresh list
        fetchStats(); // Refresh stats
    };

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-xl font-bold text-foreground">{t("accounting.management")}</h1>
                <p className="text-sm text-muted-foreground">{t("accounting.subtitle")}</p>
            </div>
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
                    onCreateInvoice={handleCreateInvoice}
                    onEdit={handleEditOrder}
                />

                <InvoiceModal open={showInvoiceModal} order={selectedOrder} onClose={() => setShowInvoiceModal(false)} onConfirm={handleConfirmInvoice} />
                <AccountingDetailModal
                    open={showDetailModal}
                    order={selectedOrder}
                    onClose={() => setShowDetailModal(false)}
                    onRefresh={() => {
                        fetchOrders();
                        fetchStats();
                    }}
                />
            </div>
        </MainLayout>
    );
}
