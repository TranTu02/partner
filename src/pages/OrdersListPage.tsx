import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Eye, FileDown, Pencil, Search, Save, ArrowLeft, Copy, FileText } from "lucide-react";
import type { OrderEditorRef } from "@/components/order/OrderEditor";
import { OrderEditor } from "@/components/order/OrderEditor";

import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getOrders, getOrderDetail } from "@/api/index";

import type { Order } from "@/types/order";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { MainLayout } from "@/components/layout/MainLayout";
import { SampleRequestFormPage } from "./SampleRequestFormPage";
import { OrderPrintPreviewModal } from "@/components/order/OrderPrintPreviewModal";
import { SampleRequestPrintPreviewModal } from "@/components/order/SampleRequestPrintPreviewModal";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";

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

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isSampleRequestModalOpen, setIsSampleRequestModalOpen] = useState(false);
    const [printData, setPrintData] = useState<OrderPrintData | null>(null);

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
    const quoteId = searchParams.get("quoteId");
    const duplicateId = searchParams.get("duplicateId");

    const isEditorActive = isCreate || isDetail || isEdit;
    const isSampleRequestForm = location.pathname.endsWith("/form/request");
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
                try {
                    const response = await getOrderDetail({ query: { orderId } });
                    if (response.success && response.data) {
                        setSelectedOrder(response.data as Order);
                    } else {
                        // Fallback to list if detail fetch fails (or show error)
                        const found = orders.find((o) => o.orderId === orderId);
                        if (found) setSelectedOrder(found);
                    }
                } catch (error) {
                    console.error("Failed to load order detail", error);
                    // Fallback
                    const found = orders.find((o) => o.orderId === orderId);
                    if (found) setSelectedOrder(found);
                }
            } else if (isCreate) {
                if (duplicateId) {
                    try {
                        const response = await getOrderDetail({ query: { orderId: duplicateId } });
                        if (response.success && response.data) {
                            setSelectedOrder(response.data as Order);
                        } else {
                            const found = orders.find((o) => o.orderId === duplicateId);
                            if (found) setSelectedOrder(found);
                        }
                    } catch (error) {
                        console.error("Failed to load duplicate source", error);
                        const found = orders.find((o) => o.orderId === duplicateId);
                        if (found) setSelectedOrder(found);
                    }
                } else {
                    setSelectedOrder(null);
                }
            }
        };
        loadSelectedOrder();
    }, [orderId, isDetail, isEdit, isCreate, duplicateId, orders]); // add orders to deps for fallback

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

    const handleDuplicate = (order: Order) => {
        navigate(`/orders/create?duplicateId=${order.orderId}`);
    };

    const preparePrintData = async (order: Order) => {
        // We need full details to print comfortably, especially samples/analyses
        // Check if current order object has samples. Usually list response might be partial.
        let fullOrder = order;
        // Optimization: if sample properties missing, fetch detail
        if (!order.samples || order.samples.length === 0) {
            try {
                const res = await getOrderDetail({ query: { orderId: order.orderId } });
                if (res.success && res.data) {
                    fullOrder = res.data as Order;
                }
            } catch (e) {
                console.error("Failed to fetch full order for print", e);
                toast.error("Failed to load full order details for printing");
                return null;
            }
        }

        // Construct QuotePrintData/OrderPrintData

        // Pricing Logic
        const storedSubtotal = Number(fullOrder.totalFeeBeforeTax) || 0;
        const storedDiscount = Number(fullOrder.totalDiscountValue) || 0;
        const storedNet = Number(fullOrder.totalFeeBeforeTaxAndDiscount) || storedSubtotal - storedDiscount;
        const storedTotal = Number(fullOrder.totalAmount) || 0;
        const storedTax = storedNet > 0 ? storedTotal - storedNet : 0;

        // Client & Contact Logic (Fallbacks)
        const contact = fullOrder.client?.clientContacts?.[0] || {};
        const contactPerson = fullOrder.contactPerson?.contactName || contact.contactName || (contact as any).name || "";
        const contactPhone = fullOrder.contactPerson?.contactPhone || contact.contactPhone || (contact as any).phone || "";
        const contactIdentity = fullOrder.contactPerson?.identityId || contact.identityId || "";
        const contactEmail = fullOrder.contactPerson?.contactEmail || contact.contactEmail || (contact as any).email || "";
        const contactPosition = contact.contactPosition || (contact as any).position || "";
        const contactAddress = contact.contactAddress || "";

        const data: OrderPrintData = {
            orderId: fullOrder.orderId,
            createdAt: fullOrder.createdAt,
            salePerson: fullOrder.salePerson,
            client: fullOrder.client,

            contactPerson,
            contactPhone,
            contactIdentity,
            reportEmail: contactEmail, // Assuming report email same as contact or field missing in Order type
            contactEmail,
            contactPosition,
            contactAddress,

            clientAddress: fullOrder.client?.clientAddress || "",
            taxName: fullOrder.client?.invoiceInfo?.taxName || fullOrder.client?.clientName || "",
            taxCode: fullOrder.client?.invoiceInfo?.taxCode || fullOrder.client?.legalId || "",
            taxAddress: fullOrder.client?.invoiceInfo?.taxAddress || fullOrder.client?.clientAddress || "",

            samples: (fullOrder.samples || []).map((s) => ({
                sampleName: s.sampleName || "",
                sampleMatrix: s.sampleMatrix || "",
                sampleNote: s.sampleNote || "",
                analyses: (s.analyses || []).map((a: any) => {
                    // Calculate fees if missing
                    const quantity = a.quantity || 1;
                    const taxRate = a.taxRate || 0;
                    const unitPrice = a.unitPrice || (a.feeBeforeTax ? a.feeBeforeTax / quantity : 0);
                    const feeBefore = a.feeBeforeTax || unitPrice * quantity;
                    const feeAfter = a.feeAfterTax || feeBefore * (1 + taxRate / 100);

                    return {
                        parameterName: a.parameterName,
                        parameterId: a.parameterId,
                        feeBeforeTax: feeBefore,
                        taxRate: taxRate,
                        feeAfterTax: feeAfter,
                        protocolCode: a.protocolCode,
                    };
                }),
            })),

            pricing: {
                subtotal: storedSubtotal,
                discountAmount: storedDiscount,
                feeBeforeTax: storedNet,
                tax: storedTax,
                total: storedTotal,
            },
            discountRate: fullOrder.discountRate || 0,
            orderUri: fullOrder.orderUri || "",
            requestForm: fullOrder.requestForm || "",
        };

        return data;
    };

    const handlePrint = async (order: Order) => {
        const data = await preparePrintData(order);
        if (data) {
            setPrintData(data);
            setIsPrintModalOpen(true);
        }
    };

    const handleSampleRequestPrint = async (order: Order) => {
        try {
            const data = await preparePrintData(order);

            if (data) {
                setPrintData(data);
                setIsSampleRequestModalOpen(true);
            } else {
                toast.error("Failed to prepare print data");
            }
        } catch (error) {
            console.error("Error in handleSampleRequestPrint:", error); // Keep catch log for safety
            toast.error("Error preparing print data");
        }
    };

    const handleBack = () => {
        if (editorRef.current?.hasUnsavedChanges()) {
            if (confirm(t("common.unsavedChanges"))) {
                navigate("/orders");
            }
        } else {
            navigate("/orders");
        }
    };

    const handleSaveSuccess = (createdOrder?: any) => {
        fetchOrders();
        if (createdOrder && createdOrder.orderId) {
            navigate(`/orders/detail?orderId=${createdOrder.orderId}`);
        } else {
            navigate("/orders");
        }
    };

    const handleSaveTrigger = () => {
        editorRef.current?.save();
    };

    if (isSampleRequestForm) {
        return <SampleRequestFormPage />;
    }

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
                                    <span className="hidden sm:inline">{t("order.printButton", "In Đơn hàng")}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedOrder) {
                                            handleSampleRequestPrint(selectedOrder);
                                        } else {
                                            toast.error("No order selected");
                                        }
                                    }}
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
                    {/* Use key to force remount if duplicate loaded, or rely on initialData update */}
                    <OrderEditor
                        ref={editorRef}
                        mode={localViewMode as any}
                        initialData={selectedOrder || undefined}
                        onBack={handleBack}
                        onSaveSuccess={handleSaveSuccess}
                        initialQuoteId={quoteId || undefined}
                    />
                </div>
                {printData && <SampleRequestPrintPreviewModal isOpen={isSampleRequestModalOpen} onClose={() => setIsSampleRequestModalOpen(false)} data={printData} />}
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
                                                <div className="text-xs text-muted-foreground mt-0.5">{order.contactPerson?.contactName || "N/A"}</div>
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
                                                    <button
                                                        onClick={() => handleDuplicate(order)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("common.duplicate")}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrint(order)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("order.downloadReport")}
                                                    >
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
            {printData && <OrderPrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
            {printData && <SampleRequestPrintPreviewModal isOpen={isSampleRequestModalOpen} onClose={() => setIsSampleRequestModalOpen(false)} data={printData} />}
        </MainLayout>
    );
}
