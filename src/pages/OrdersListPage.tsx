import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Eye, FileDown, Pencil, Search, Save, ArrowLeft, FileText } from "lucide-react";
import type { OrderEditorRef } from "@/components/order/OrderEditor";
import { OrderEditor } from "@/components/order/OrderEditor";

import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getOrders } from "@/api/index";
import type { Order } from "@/types/order";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";

import { MainLayout } from "@/components/layout/MainLayout";

interface OrdersListPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function OrdersListPage({ activeMenu, onMenuClick }: OrdersListPageProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const editorRef = useRef<OrderEditorRef>(null);

    // State
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Determine current view from URL
    const isCreate = location.pathname.endsWith("/create");
    const isDetail = location.pathname.endsWith("/detail");
    const isEdit = location.pathname.endsWith("/edit");
    const orderId = searchParams.get("orderId");

    const isEditorActive = isCreate || isDetail || isEdit;
    const initialViewMode = isCreate ? "create" : isEdit ? "edit" : "view";
    const [localViewMode, setLocalViewMode] = useState(initialViewMode);

    useEffect(() => {
        setLocalViewMode(initialViewMode);
    }, [initialViewMode]);

    const toggleLocalMode = () => {
        setLocalViewMode((prev: any) => (prev === "view" ? "edit" : "view"));
    };

    // API-based Fetch
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const query: any = {
                search: searchQuery || undefined,
                page: currentPage,
                itemsPerPage,
            };
            const response = await getOrders({ query });
            if (response.success && response.data) {
                setOrders(response.data as Order[]);
                if (response.meta) {
                    setTotalPages(response.meta.totalPages || 0);
                    setTotalItems(response.meta.total || 0);
                }
            } else {
                if (response.error) {
                    console.error("Fetch orders error", response.error);
                }
            }
        } catch (error) {
            console.error("Failed to fetch orders", error);
            toast.error("Error fetching orders");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, currentPage, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchOrders]);

    useEffect(() => {
        const loadSelectedOrder = async () => {
            if ((isDetail || isEdit) && orderId) {
                // Try to find in current list first
                const found = orders.find((o) => o.orderId === orderId);
                if (found) {
                    setSelectedOrder(found);
                    return;
                }
                // If not found, ideally fetch detail if we had getOrderDetail conveniently imported/setup
                // For now, rely on list or OrderEditor to handle it if initialData is partial?
                // OrderEditor uses initialData. If partial, it might fail.
                // But typically user navigates from list.
            } else if (isCreate) {
                setSelectedOrder(null);
            }
        };
        loadSelectedOrder();
    }, [orderId, isDetail, isEdit, isCreate, orders]);

    // Status Configurations
    const statusConfig = {
        pending: { label: t("order.statuses.pending"), color: "bg-warning/10 text-warning" },
        processing: { label: t("order.statuses.processing") || "Processing", color: "bg-blue-500/10 text-blue-500" },
        completed: { label: t("order.statuses.completed"), color: "bg-success/10 text-success" },
        cancelled: { label: t("order.statuses.cancelled"), color: "bg-destructive/10 text-destructive" },
        // Fallback for case sensitivity or mismatches
        Pending: { label: t("order.statuses.pending"), color: "bg-warning/10 text-warning" },
        Processing: { label: t("order.statuses.processing") || "Processing", color: "bg-blue-500/10 text-blue-500" },
        Completed: { label: t("order.statuses.completed"), color: "bg-success/10 text-success" },
        Cancelled: { label: t("order.statuses.cancelled"), color: "bg-destructive/10 text-destructive" },
    };

    const handleCreate = () => navigate("/orders/create");
    const handleViewDetail = (order: Order) => navigate(`/orders/detail?orderId=${order.orderId}`);
    const handleEdit = (order: Order) => navigate(`/orders/edit?orderId=${order.orderId}`);

    const handleBack = () => {
        if (editorRef.current?.hasUnsavedChanges()) {
            if (confirm(t("common.unsavedChanges"))) {
                navigate("/orders");
            }
        } else {
            navigate("/orders");
        }
    };

    const handleSaveSuccess = () => {
        fetchOrders();
        navigate("/orders");
    };

    const handleSaveTrigger = () => {
        editorRef.current?.save();
    };

    if (isEditorActive) {
        return (
            <div className="h-screen flex flex-col bg-background">
                {/* Editor Header */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-foreground">
                                {isCreate
                                    ? t("order.create")
                                    : initialViewMode === "edit"
                                    ? `${t("order.edit")} ${selectedOrder?.orderId ? `- ${selectedOrder.orderId}` : ""}`
                                    : `${t("order.detail")} ${selectedOrder?.orderId ? `- ${selectedOrder.orderId}` : ""}`}
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Always show Toggle button if not creating */}
                        {!isCreate && (
                            <button onClick={toggleLocalMode} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                                {localViewMode === "view" ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="hidden sm:inline">{localViewMode === "view" ? t("common.edit") : t("common.view")}</span>
                            </button>
                        )}

                        {localViewMode === "view" && (
                            <>
                                <button
                                    onClick={() => editorRef.current?.export()}
                                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    <FileDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t("order.print.quote", "Báo giá")}</span>
                                </button>
                                <button
                                    onClick={() => editorRef.current?.exportSampleRequest()}
                                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t("order.print.sampleRequest", "Phiếu gửi mẫu")}</span>
                                </button>
                            </>
                        )}
                        {localViewMode !== "view" && (
                            <button
                                onClick={handleSaveTrigger}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                <Save className="w-4 h-4" />
                                {t("common.save")}
                            </button>
                        )}
                    </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 overflow-hidden">
                    {/* Use key to force remount if needed, but localViewMode prop update should suffice */}
                    <OrderEditor ref={editorRef} mode={localViewMode as any} initialData={selectedOrder || undefined} onBack={handleBack} onSaveSuccess={handleSaveSuccess} />
                </div>
            </div>
        );
    }

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-lg font-semibold text-foreground">{t("order.management")}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{t("order.subtitle")}</p>
            </div>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                {t("order.create")}
            </button>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div className="space-y-4">
                {/* Filters */}
                <div className="bg-card rounded-lg border border-border p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("order.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Orders List */}
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.code")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.client")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.salePerson")}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.total")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.createdDate")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.status")}</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.paymentStatus")}</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-4 text-center text-sm text-muted-foreground">
                                            {t("common.loading")}
                                        </td>
                                    </tr>
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-4 text-center text-sm text-muted-foreground">
                                            {t("common.noData")}
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.orderId} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-primary cursor-pointer align-top" onClick={() => handleViewDetail(order)}>
                                                {order.orderId}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground align-top">
                                                <div className="font-medium text-primary cursor-pointer hover:underline" onClick={() => navigate(`/clients`)}>
                                                    {order.client?.clientName || "Unknown Client"}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{order.contactPerson?.identityName || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground align-top">{order.salePerson || "-"}</td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-foreground align-top">{(order.totalAmount || 0).toLocaleString("vi-VN")} đ</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground align-top">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "N/A"}</td>
                                            <td className="px-6 py-4 align-top">
                                                <span
                                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                        (statusConfig as any)[order.orderStatus]?.color || "bg-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    {(statusConfig as any)[order.orderStatus]?.label || order.orderStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-top text-center">
                                                <span
                                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                        order.paymentStatus === "Paid"
                                                            ? "bg-success/10 text-success"
                                                            : order.paymentStatus === "Debt"
                                                            ? "bg-destructive/10 text-destructive"
                                                            : order.paymentStatus === "Partial"
                                                            ? "bg-warning/10 text-warning"
                                                            : "bg-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    {t(`order.paymentStatuses.${(order.paymentStatus || "awaiting").toLowerCase()}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewDetail(order)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("common.view")}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(order)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("common.edit")}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title={t("order.downloadReport")}>
                                                        <FileDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && orders.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={(page) => setCurrentPage(page)}
                            onItemsPerPageChange={(items) => {
                                setItemsPerPage(items);
                                setCurrentPage(1);
                            }}
                        />
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
