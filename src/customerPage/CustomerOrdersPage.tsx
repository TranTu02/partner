import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, FileDown, Search, ArrowLeft, FileText, Pencil, Save, Upload } from "lucide-react";
import { CustomerOrderEditor } from "@/customerComponents/order/CustomerOrderEditor";
import type { CustomerOrderEditorRef } from "@/customerComponents/order/CustomerOrderEditor";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { customerGetOrders, customerGetOrderDetail } from "@/api/customer";
import type { Order } from "@/types/order";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { CustomerOrderPrintPreviewModal as OrderPrintPreviewModal } from "@/customerComponents/order/CustomerOrderPrintPreviewModal";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";

export function CustomerOrdersPage() {
    // const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const editorRef = useRef<CustomerOrderEditorRef>(null);

    const [orders, setOrders] = useState<Order[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [localFilters] = useState<any>({});

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<OrderPrintData | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // URL-driven views
    const isCreate = location.pathname.endsWith("/create");
    const isDetail = location.pathname.endsWith("/detail");
    const isEdit = location.pathname.endsWith("/edit");
    const orderId = searchParams.get("orderId");
    const quoteId = searchParams.get("quoteId");
    const duplicateId = searchParams.get("duplicateId");
    const isEditorActive = isCreate || isDetail || isEdit;
    const initialViewMode = isCreate ? "create" : isEdit ? "edit" : "view";
    const [localViewMode, setLocalViewMode] = useState(initialViewMode);
    useEffect(() => {
        setLocalViewMode(initialViewMode);
    }, [initialViewMode]);

    // Customer info from localStorage
    const customerInfo = (() => {
        try {
            return JSON.parse(localStorage.getItem("customer") || "{}");
        } catch {
            return {};
        }
    })();
    const clientId = customerInfo?.clientId;

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await customerGetOrders({ query: { search: searchQuery || undefined, page: currentPage, itemsPerPage, ...localFilters } });
            if (res.success && res.data) {
                const data = res.data as any;
                const ordersList = Array.isArray(data) ? data : data.orders || data.items || [];

                setOrders(ordersList);
                if (res.meta) {
                    setTotalPages(res.meta.totalPages);
                    setTotalItems(res.meta.total);
                    setItemsPerPage(res.meta.itemsPerPage);
                }
            } else {
                setOrders([]);
                setTotalPages(0);
                setTotalItems(0);
            }
        } catch {
            toast.error("Lỗi tải danh sách đơn hàng");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, currentPage, itemsPerPage, localFilters]);

    useEffect(() => {
        if (isEditorActive) return; // Don't fetch list when in editor mode
        const timer = setTimeout(() => fetchOrders(), 300);
        return () => clearTimeout(timer);
    }, [fetchOrders, isEditorActive]);

    useEffect(() => {
        const loadSelected = async () => {
            if ((isDetail || isEdit) && orderId) {
                try {
                    const res = await customerGetOrderDetail({ query: { orderId, clientId } });
                    if (res.success && res.data) setSelectedOrder(res.data as Order);
                    else setSelectedOrder(null);
                } catch {
                    setSelectedOrder(null);
                }
            } else if (isCreate) {
                if (duplicateId) {
                    try {
                        const res = await customerGetOrderDetail({ query: { orderId: duplicateId, clientId } });
                        if (res.success && res.data) setSelectedOrder(res.data as Order);
                        else setSelectedOrder(null);
                    } catch {
                        setSelectedOrder(null);
                    }
                } else {
                    setSelectedOrder(null);
                }
            }
        };
        loadSelected();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, isDetail, isEdit, isCreate, duplicateId, clientId]);

    const handleViewDetail = (order: Order) => navigate(`/customer/orders/detail?orderId=${order.orderId}`);

    const preparePrintData = async (order: Order): Promise<OrderPrintData | null> => {
        let fullOrder = order;
        try {
            const res = await customerGetOrderDetail({ query: { orderId: order.orderId, clientId } });
            if (res.success && res.data) {
                fullOrder = res.data as Order;
            }
        } catch (error) {
            console.error("Error fetching order detail for print", error);
        }
        const storedSubtotal = Number(fullOrder.totalFeeBeforeTax) || 0;
        const storedDiscount = Number(fullOrder.totalDiscountValue) || 0;
        const storedNet = Number(fullOrder.totalFeeBeforeTaxAndDiscount) || storedSubtotal - storedDiscount;
        const storedTotal = Number(fullOrder.totalAmount) || 0;
        const storedTax = storedNet > 0 ? storedTotal - storedNet : 0;
        const contact = (fullOrder.client?.clientContacts?.[0] || {}) as any;

        return {
            orderId: fullOrder.orderId,
            createdAt: fullOrder.createdAt,
            client: fullOrder.client || null,
            contactPerson: fullOrder.contactPerson?.contactName || contact.contactName || "",
            contactPhone: fullOrder.contactPerson?.contactPhone || contact.contactPhone || "",
            contactIdentity: fullOrder.contactPerson?.identityId || "",
            reportEmail: fullOrder.contactPerson?.contactEmail || "",
            contactEmail: fullOrder.contactPerson?.contactEmail || "",
            contactPosition: contact.contactPosition || "",
            contactAddress: contact.contactAddress || "",
            clientAddress: fullOrder.client?.clientAddress || "",
            taxName: fullOrder.client?.invoiceInfo?.taxName || fullOrder.client?.clientName || "",
            taxCode: fullOrder.client?.invoiceInfo?.taxCode || fullOrder.client?.legalId || "",
            invoiceAddress: fullOrder.client?.invoiceInfo?.taxAddress || fullOrder.client?.clientAddress || "",
            samples: ((fullOrder as any).samples || (fullOrder as any).orderSamples || []).map((s: any) => {
                const sType =
                    s?.sampleTypeName ??
                    s?.sample_type_name ??
                    s?.librarySampleType?.sampleTypeName ??
                    (s as any)?.library_sample_type?.sample_type_name ??
                    s?.sampleMatrix ??
                    s?.sample_matrix ??
                    s?.matrix?.matrixName ??
                    (s as any)?.matrix?.matrix_name ??
                    s?.matrixName ??
                    "";
                const sId = s?.sampleTypeId ?? s?.sample_type_id ?? s?.librarySampleType?.sampleTypeId ?? (s as any)?.library_sample_type?.sample_type_id ?? "";

                return {
                    ...s,
                    sampleName: s?.sampleName ?? s?.sample_name ?? "",
                    sampleMatrix: sType,
                    sampleTypeName: sType,
                    sampleTypeId: sId,
                    sampleNote: s?.sampleNote ?? s?.sample_note ?? "",
                    analyses: ((s as any).analyses || (s as any).orderAnalyses || []).map((a: any) => ({
                        ...a,
                        parameterName: a?.parameterName ?? a?.parameter_name ?? "",
                        parameterId: a?.parameterId ?? a?.parameter_id,
                        sampleTypeName: a?.sampleTypeName ?? a?.sample_type_name ?? a?.librarySampleType?.sampleTypeName ?? (a as any)?.library_sample_type?.sample_type_name ?? sType ?? "",
                        sampleTypeId: a?.sampleTypeId ?? a?.sample_type_id ?? a?.librarySampleType?.sampleTypeId ?? (a as any)?.library_sample_type?.sample_type_id ?? sId ?? "",
                        protocolAccreditation:
                            a?.protocolAccreditation ??
                            a?.protocol_accreditation ??
                            (a?.protocol as any)?.protocolAccreditation ??
                            (a?.protocol as any)?.protocol_accreditation ??
                            (a?.libraryParameterProtocol as any)?.protocolAccreditation ??
                            (a?.libraryParameterProtocol as any)?.protocol_accreditation ??
                            null,
                        feeBeforeTax: Number(a?.feeBeforeTax ?? a?.fee_before_tax ?? 0),
                        taxRate: Number(a?.taxRate ?? a?.tax_rate ?? 0),
                        feeAfterTax: Number(a?.feeAfterTax ?? a?.fee_after_tax ?? 0),
                        protocolCode:
                            a?.protocolCode ??
                            a?.protocol_code ??
                            (a?.protocol as any)?.protocolCode ??
                            (a?.protocol as any)?.protocol_code ??
                            (a?.libraryParameterProtocol as any)?.protocolCode ??
                            (a?.libraryParameterProtocol as any)?.protocol_code ??
                            "",
                    })),
                };
            }),
            pricing: { subtotal: storedSubtotal, discountAmount: storedDiscount, feeBeforeTax: storedNet, tax: storedTax, total: storedTotal },
            discountRate: fullOrder.discountRate || 0,
            orderUri: fullOrder.orderUri || "",
            requestForm: fullOrder.requestForm || "",
        };
    };

    const handlePrint = async (order: Order) => {
        const data = await preparePrintData(order);
        if (data) {
            setPrintData(data);
            setIsPrintModalOpen(true);
        }
    };

    const handleBack = () => {
        if (editorRef.current?.hasUnsavedChanges()) {
            if (confirm("Bạn có thay đổi chưa lưu. Bạn có muốn rời đi không?")) navigate("/customer/orders");
        } else {
            navigate("/customer/orders");
        }
    };

    const handleSaveSuccess = (createdOrder?: any) => {
        fetchOrders();
        if (createdOrder?.orderId) navigate(`/customer/orders/detail?orderId=${createdOrder.orderId}`);
        else navigate("/customer/orders");
    };

    // ====== EDITOR MODE (full-screen) ======
    if (isEditorActive) {
        return (
            <div className="h-screen flex flex-col bg-background">
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold text-foreground">
                            {isCreate ? "Tạo đơn hàng mới" : initialViewMode === "edit" ? `Chỉnh sửa - ${selectedOrder?.orderId || ""}` : `Chi tiết - ${selectedOrder?.orderId || ""}`}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {localViewMode === "view" && (
                            <>
                                {(selectedOrder?.orderStatus?.toLowerCase() === "pending" ||
                                    selectedOrder?.orderStatus?.toLowerCase() === "new" ||
                                    selectedOrder?.orderStatus?.toLowerCase() === "draft") && (
                                    <button
                                        onClick={() => setLocalViewMode("edit")}
                                        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        <span>Chỉnh sửa</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => editorRef.current?.triggerUpload()}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span>Tải tài liệu</span>
                                </button>
                                <button
                                    onClick={() => editorRef.current?.export()}
                                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    <FileDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">In Đơn hàng</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (orderId) {
                                            window.open(`/customer/orders/sample-request?orderId=${orderId}`, "_blank", "noopener,noreferrer");
                                        }
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="hidden sm:inline">Phiếu gửi mẫu</span>
                                </button>
                            </>
                        )}
                        {localViewMode === "edit" && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => editorRef.current?.save()}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-bold shadow-md scale-105 active:scale-95"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Lưu thay đổi</span>
                                </button>
                                <button onClick={() => setLocalViewMode("view")} className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                                    Hủy
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <CustomerOrderEditor
                        ref={editorRef}
                        mode={localViewMode as any}
                        initialData={selectedOrder || undefined}
                        onBack={handleBack}
                        onSaveSuccess={handleSaveSuccess}
                        initialQuoteId={quoteId || undefined}
                    />
                </div>
            </div>
        );
    }

    // ====== LIST MODE ======
    const statusColors: Record<string, string> = {
        PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
        Processing: "bg-blue-100 text-blue-700 border-blue-200",
        PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
        Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
        COMPLETED: "bg-green-100 text-green-700 border-green-200",
        Completed: "bg-green-100 text-green-700 border-green-200",
        DONE: "bg-green-100 text-green-700 border-green-200",
        Done: "bg-green-100 text-green-700 border-green-200",
        CANCELLED: "bg-red-100 text-red-700 border-red-200",
        Cancelled: "bg-red-100 text-red-700 border-red-200",
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Đơn hàng</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Quản lý đơn hàng và phiếu gửi mẫu</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-card rounded-lg border border-border p-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm đơn hàng..."
                        className="w-full pl-9 pr-4 py-1.5 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                            <tr>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mã ĐH</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Người liên hệ</th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Số mẫu</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Ngày tạo</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng tiền</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                                        Chưa có đơn hàng nào
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.orderId} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-3 py-2.5 text-sm font-semibold text-primary cursor-pointer" onClick={() => handleViewDetail(order)}>
                                            {order.orderId}
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-foreground">
                                            <div className="font-medium">{(order as any).contactPerson?.contactName || "—"}</div>
                                            <div className="text-xs text-muted-foreground">{(order as any).contactPerson?.contactPhone || ""}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-center text-foreground">{(order as any).samples?.length || 0}</td>
                                        <td className="px-3 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "—"}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span
                                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColors[(order as any).orderStatus] || "bg-muted text-muted-foreground border-border"}`}
                                            >
                                                {(order as any).orderStatus || "—"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-right font-medium text-foreground">{Math.ceil(Number((order as any).totalAmount || 0)).toLocaleString("vi-VN")} đ</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleViewDetail(order)}
                                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                    title="Xem"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handlePrint(order)}
                                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                    title="In đơn hàng"
                                                >
                                                    <FileDown className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => window.open(`/customer/orders/sample-request?orderId=${order.orderId}`, "_blank", "noopener,noreferrer")}
                                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                    title="Phiếu gửi mẫu"
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
                {/* Pagination */}
                {!isLoading && (totalPages > 1 || orders.length > 0) && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(items) => {
                            setItemsPerPage(items);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>

            {printData && <OrderPrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
        </div>
    );
}
