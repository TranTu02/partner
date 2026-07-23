import { useState, useEffect, useRef } from "react";
import { Plus, Eye, FileDown, Pencil, Search, Save, ArrowLeft, FileText, Unlock } from "lucide-react";
import type { OrderEditorRef } from "@/components/order/OrderEditor";
import { OrderEditor } from "@/components/order/OrderEditor";

import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { getOrders, getOrderFull, generateOrderUri } from "@/api/index";

import type { Order } from "@/types/order";
import { toast } from "sonner";

import { MainLayout } from "@/components/layout/MainLayout";
import { SampleRequestFormPage } from "./SampleRequestFormPage";
import { OrderPrintPreviewModal } from "@/components/order/OrderPrintPreviewModal";
import { SampleRequestPrintPreviewModal } from "@/components/order/SampleRequestPrintPreviewModal";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { OrderTable } from "@/components/order/OrderTable";

interface OrdersListPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function OrdersListPage({ activeMenu, onMenuClick }: OrdersListPageProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const editorRef = useRef<OrderEditorRef>(null);

    // URL params as single source of truth for query, page, itemsPerPage
    const searchQueryUrl = searchParams.get("search") || "";
    const currentPage = Number(searchParams.get("page")) || 1;
    const itemsPerPage = Number(searchParams.get("itemsPerPage")) || 20;

    // State
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchQuery, setSearchQuery] = useState(searchQueryUrl);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [localFilters, setLocalFilters] = useState<any>({});

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isSampleRequestModalOpen, setIsSampleRequestModalOpen] = useState(false);
    const [printData, setPrintData] = useState<OrderPrintData | null>(null);
    const [showUnlockModal, setShowUnlockModal] = useState(false);

    // Pagination State
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    const isCreate = searchParams.get("create") === "true";
    const orderId = searchParams.get("orderId");
    const quoteId = searchParams.get("quoteId");
    const duplicateId = searchParams.get("duplicateId");
    const isEdit = searchParams.get("edit") === "true" && !!orderId;
    const isDetail = !isEdit && !!orderId;

    const isEditorActive = isCreate || !!orderId;
    const isSampleRequestForm = location.pathname.endsWith("/form/request");
    const initialViewMode = isCreate ? "create" : isEdit ? "edit" : "view";
    const [localViewMode, setLocalViewMode] = useState(initialViewMode);

    useEffect(() => {
        setLocalViewMode(initialViewMode);
    }, [initialViewMode]);

    const toggleLocalMode = () => {
        setLocalViewMode((prev: any) => (prev === "view" ? "edit" : "view"));
    };

    // Đồng bộ ngược từ URL về local state searchQuery khi URL thay đổi (nhấn Back/Forward)
    useEffect(() => {
        setSearchQuery(searchQueryUrl);
    }, [searchQueryUrl]);

    // Debounce search query và đẩy lên URL
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== searchQueryUrl) {
                const newParams = new URLSearchParams(searchParams);
                if (searchQuery) {
                    newParams.set("search", searchQuery);
                } else {
                    newParams.delete("search");
                }
                newParams.set("page", "1"); // Đưa page về 1 khi tìm kiếm thay đổi
                setSearchParams(newParams, { replace: true });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchQueryUrl, searchParams, setSearchParams]);

    const handlePageChange = (page: number) => {
        const newParams = new URLSearchParams(searchParams);
        if (page > 1) {
            newParams.set("page", String(page));
        } else {
            newParams.delete("page");
        }
        setSearchParams(newParams, { replace: true });
    };

    const handleItemsPerPageChange = (items: number) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("itemsPerPage", String(items));
        newParams.delete("page"); // reset page
        setSearchParams(newParams, { replace: true });
    };

    const handleFilterChange = (filters: any) => {
        setLocalFilters(filters);
        handlePageChange(1);
    };

    // Fetch orders
    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const query: any = {
                    search: searchQueryUrl || undefined,
                    page: currentPage,
                    itemsPerPage,
                    ...localFilters,
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
        };

        fetchOrders();
    }, [searchQueryUrl, currentPage, itemsPerPage, localFilters]);

    useEffect(() => {
        const loadSelectedOrder = async () => {
            if ((isDetail || isEdit) && orderId) {
                try {
                    const response = await getOrderFull({ query: { orderId } });
                    if (response.success && response.data) {
                        setSelectedOrder(response.data as Order);
                    } else {
                        setSelectedOrder(null);
                    }
                } catch (error) {
                    console.error("Failed to load order detail", error);
                    setSelectedOrder(null);
                }
            } else if (isCreate) {
                if (duplicateId) {
                    try {
                        const response = await getOrderFull({ query: { orderId: duplicateId } });
                        if (response.success && response.data) {
                            const sourceData = { ...response.data } as any;
                            // Only copy samples and clear client, files, and other fields when duplicating
                            const duplicatedOrder = {
                                samples: sourceData.samples || [],
                            } as any;
                            setSelectedOrder(duplicatedOrder as Order);
                        } else {
                            setSelectedOrder(null);
                        }
                    } catch (error) {
                        console.error("Failed to load duplicate source", error);
                        setSelectedOrder(null);
                    }
                } else {
                    setSelectedOrder(null);
                }
            }
        };
        loadSelectedOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, isDetail, isEdit, isCreate, duplicateId]);

    // Status Configurations
 
    const handleCreate = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("create", "true");
        newParams.delete("orderId");
        newParams.delete("edit");
        setSearchParams(newParams, { replace: true });
    };
    const handleViewDetail = (order: Order) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("orderId", order.orderId);
        newParams.delete("edit");
        newParams.delete("create");
        setSearchParams(newParams, { replace: true });
    };
    const handleEdit = (order: Order) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("orderId", order.orderId);
        newParams.set("edit", "true");
        newParams.delete("create");
        setSearchParams(newParams, { replace: true });
    };

    const handleDuplicate = (order: Order) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("create", "true");
        newParams.set("duplicateId", order.orderId);
        newParams.delete("orderId");
        newParams.delete("edit");
        setSearchParams(newParams, { replace: true });
    };

    const preparePrintData = async (order: Order) => {
        // We need full details to print comfortably, especially samples/analyses
        // Check if current order object has samples. Usually list response might be partial.
        let fullOrder = order;
        // Optimization: if sample properties missing, fetch detail
        if (!order.samples || order.samples.length === 0) {
            try {
                const res = await getOrderFull({ query: { orderId: order.orderId } });
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
        const contact = (fullOrder.client?.clientContacts?.[0] || {}) as any;
        const contactPerson = fullOrder.contactPerson?.contactName || contact.contactName || contact.name || "";
        const contactPhone = fullOrder.contactPerson?.contactPhone || contact.contactPhone || contact.phone || "";
        const contactIdentity = fullOrder.contactPerson?.identityId || contact.identityId || "";
        const contactEmail = fullOrder.contactPerson?.contactEmail || contact.contactEmail || contact.email || "";
        const contactPosition = contact.contactPosition || contact.position || "";
        const contactAddress = contact.contactAddress || "";

        const reportRecipient = fullOrder.reportRecipient;

        const data: OrderPrintData = {
            orderId: fullOrder.orderId,
            createdAt: fullOrder.createdAt,
            salePerson: fullOrder.salePerson,
            client: fullOrder.client || null,

            contactPerson,
            contactPhone,
            contactIdentity,
            reportEmail: contactEmail, // Assuming report email same as contact or field missing in Order type
            contactEmail,
            contactPosition,
            contactAddress,

            reportReceiverAddress: reportRecipient?.receiverAddress || fullOrder.client?.clientAddress || "",
            reportReceiverPhone: reportRecipient?.receiverPhone || contactPhone || "",
            reportReceiverEmail: reportRecipient?.receiverEmail || contactEmail || "",

            clientAddress: fullOrder.client?.clientAddress || "",
            taxName: fullOrder.client?.invoiceInfo?.taxName || fullOrder.client?.clientName || "",
            taxCode: fullOrder.client?.invoiceInfo?.taxCode || fullOrder.client?.legalId || "",
            taxAddress: fullOrder.client?.invoiceInfo?.taxAddress || fullOrder.client?.clientAddress || "",

            samples: ((fullOrder as any).samples || (fullOrder as any).orderSamples || []).map((s: any) => ({
                ...s,
                sampleName: s.sampleName || "",
                sampleTypeName: s.sampleTypeName || (s as any).sampleMatrix || (s as any).matrix || (s as any).librarySampleType?.sampleTypeName || "",
                sampleNote: s.sampleNote || "",
                analyses: (s.analyses || []).map((a: any) => ({
                    ...a,
                    parameterName: a.parameterName,
                    parameterId: a.parameterId,
                    feeBeforeTax: a.feeBeforeTax || (a.unitPrice || 0) * (a.quantity || 1),
                    taxRate: a.taxRate || 0,
                    feeAfterTax: a.feeAfterTax || (a.feeBeforeTax || 0) * (1 + (a.taxRate || 0) / 100),
                    protocolCode: a.protocolCode || (a.protocol as any)?.protocolCode || "",
                })),
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
            orderStatus: fullOrder.orderStatus || "",
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

    const closeModal = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("orderId");
        newParams.delete("edit");
        newParams.delete("create");
        newParams.delete("duplicateId");
        setSearchParams(newParams, { replace: true });
    };

    const handleBack = () => {
        if (editorRef.current?.hasUnsavedChanges()) {
            if (confirm(t("common.unsavedChanges"))) {
                closeModal();
            }
        } else {
            closeModal();
        }
    };

    const handleSaveSuccess = (createdOrder?: any) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("create");
        newParams.delete("edit");
        newParams.delete("duplicateId");
        if (createdOrder && createdOrder.orderId) {
            newParams.set("orderId", createdOrder.orderId);
        } else {
            newParams.delete("orderId");
        }
        setSearchParams(newParams, { replace: true });
    };

    const handleSaveTrigger = () => {
        editorRef.current?.save();
    };

    if (isSampleRequestForm) {
        return <SampleRequestFormPage />;
    }



    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-lg font-semibold text-foreground">{t("order.management")}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{t("order.subtitle")}</p>
            </div>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t("order.create")}</span>
            </button>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div className="space-y-2">
                {/* Filters */}
                <div className="bg-card rounded-lg border border-border p-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("order.searchPlaceholder")}
                            className="w-full pl-9 pr-4 py-1.5 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Orders List */}
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <OrderTable
                        orders={orders}
                        loading={isLoading}
                        pagination={{
                            page: currentPage,
                            itemsPerPage,
                            totalItems,
                            totalPages,
                        }}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onViewDetail={handleViewDetail}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onPrint={handlePrint}
                        onPrintSampleRequest={handleSampleRequestPrint as any}
                        onFilterChange={handleFilterChange}
                    />
                </div>
            </div>
            {printData && <OrderPrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
            {printData && <SampleRequestPrintPreviewModal isOpen={isSampleRequestModalOpen} onClose={() => setIsSampleRequestModalOpen(false)} data={printData} />}

            {isEditorActive && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-3 animate-in fade-in duration-200">
                    <div className="bg-background rounded-2xl w-[98vw] h-[98vh] max-w-[98vw] max-h-[98vh] flex flex-col shadow-2xl border border-border animate-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Editor Header */}
                        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
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
                                    selectedOrder?.orderStatus?.toLowerCase() === "processing" ? (
                                        <button
                                            onClick={() => setShowUnlockModal(true)}
                                            className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                                        >
                                            <Unlock className="w-4 h-4" />
                                            <span className="hidden sm:inline">Mở khóa chỉnh sửa</span>
                                        </button>
                                    ) : (
                                        <button onClick={toggleLocalMode} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                                            {localViewMode === "view" ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            <span className="hidden sm:inline">{localViewMode === "view" ? t("common.edit") : t("common.view")}</span>
                                        </button>
                                    )
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
                                        <span className="hidden sm:inline">{t("common.save")}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 overflow-hidden">
                            <OrderEditor
                                ref={editorRef}
                                mode={localViewMode as any}
                                initialData={selectedOrder || undefined}
                                onBack={handleBack}
                                onSaveSuccess={handleSaveSuccess}
                                initialQuoteId={quoteId || undefined}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Unlock edit confirmation modal */}
            {showUnlockModal && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-8 relative flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl border border-border">
                        <div className="flex items-center gap-3 text-amber-600 mb-5">
                            <div className="p-2.5 bg-amber-50 rounded-full flex shrink-0">
                                <Unlock className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-lg text-foreground uppercase tracking-wide">Mở khóa chỉnh sửa đơn hàng</h3>
                        </div>

                        <div className="text-base text-muted-foreground space-y-4 leading-relaxed mb-8">
                            <p className="text-red-600 font-bold">
                                ⚠️ Đơn hàng đang ở trạng thái <span className="uppercase">Đang xử lý (Processing)</span>. Việc mở khóa sẽ tạo một liên kết mới và đặt lại phiếu về trạng thái <span className="uppercase">Chờ xử lý (Pending)</span>.
                            </p>
                            <p>
                                Toàn bộ nội dung phiếu gửi mẫu đã xuất trước đó sẽ bị xóa. Khách hàng cần điền lại thông tin và nộp lại phiếu mới.
                            </p>
                            <p className="text-red-700 font-semibold">
                                Chỉ thực hiện khi cần điều chỉnh thông tin quan trọng trên phiếu.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowUnlockModal(false)}
                                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all border border-gray-200"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={async () => {
                                    if (!selectedOrder?.orderId) return;
                                    setShowUnlockModal(false);
                                    const tid = toast.loading("Đang tạo liên kết mới...");
                                    try {
                                        const res = await generateOrderUri({ body: { orderId: selectedOrder.orderId } });
                                        if (res?.success) {
                                            toast.success("Đã tạo liên kết mới. Đơn hàng được mở lại.", { id: tid });
                                            setSelectedOrder(prev => prev ? { ...prev, orderStatus: "Pending" } : null);
                                        } else {
                                            toast.error(res?.error?.message || "Không thể tạo liên kết mới.", { id: tid });
                                        }
                                    } catch (err: any) {
                                        toast.error(err?.message || "Lỗi khi tạo liên kết mới.", { id: tid });
                                    }
                                }}
                                className="px-5 py-2.5 text-sm font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md flex items-center gap-2"
                            >
                                <Unlock className="w-4 h-4" />
                                Xác nhận Mở khóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
