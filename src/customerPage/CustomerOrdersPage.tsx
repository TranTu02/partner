import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Eye, FileDown, Pencil, Search, Save, ArrowLeft, FileText } from "lucide-react";
import { CustomerOrderEditor } from "@/customerComponents/order/CustomerOrderEditor";
import type { CustomerOrderEditorRef } from "@/customerComponents/order/CustomerOrderEditor";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { customerGetOrders, customerGetOrderDetail } from "@/api/customer";
import type { Order } from "@/types/order";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { CustomerOrderPrintPreviewModal } from "@/customerComponents/order/CustomerOrderPrintPreviewModal";
import { CustomerSampleRequestPrintPreviewModal } from "@/customerComponents/order/CustomerSampleRequestPrintPreviewModal";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";

export function CustomerOrdersPage() {
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
    const [isSampleRequestModalOpen, setIsSampleRequestModalOpen] = useState(false);
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

    useEffect(() => { setLocalViewMode(initialViewMode); }, [initialViewMode]);
    const toggleLocalMode = () => setLocalViewMode(prev => prev === "view" ? "edit" : "view");

    // Customer info from localStorage
    const customerInfo = (() => {
        try { return JSON.parse(localStorage.getItem("customer") || "{}"); }
        catch { return {}; }
    })();
    const clientId = customerInfo?.clientId;

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await customerGetOrders({ query: { search: searchQuery || undefined, page: currentPage, itemsPerPage, ...localFilters } });
            if (res.success && res.data) {
                const data = res.data as any;
                const ordersList = Array.isArray(data) ? data : (data.orders || data.items || []);
                
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
        const timer = setTimeout(() => fetchOrders(), 300);
        return () => clearTimeout(timer);
    }, [fetchOrders]);

    useEffect(() => {
        const loadSelected = async () => {
            if ((isDetail || isEdit) && orderId) {
                try {
                    const res = await customerGetOrderDetail({ query: { orderId, clientId } });
                    if (res.success && res.data) setSelectedOrder(res.data as Order);
                    else setSelectedOrder(orders.find(o => o.orderId === orderId) || null);
                } catch {
                    setSelectedOrder(orders.find(o => o.orderId === orderId) || null);
                }
            } else if (isCreate) {
                if (duplicateId) {
                    try {
                        const res = await customerGetOrderDetail({ query: { orderId: duplicateId, clientId } });
                        if (res.success && res.data) setSelectedOrder(res.data as Order);
                        else setSelectedOrder(orders.find(o => o.orderId === duplicateId) || null);
                    } catch {
                        setSelectedOrder(orders.find(o => o.orderId === duplicateId) || null);
                    }
                } else {
                    setSelectedOrder(null);
                }
            }
        };
        loadSelected();
    }, [orderId, isDetail, isEdit, isCreate, duplicateId, orders, clientId]);

    const handleCreate = () => navigate("/customer/orders/create");
    const handleViewDetail = (order: Order) => navigate(`/customer/orders/detail?orderId=${order.orderId}`);
    const handleEdit = (order: Order) => navigate(`/customer/orders/edit?orderId=${order.orderId}`);

    const preparePrintData = async (order: Order): Promise<OrderPrintData | null> => {
        let fullOrder = order;
        if (!order.samples || order.samples.length === 0) {
            try {
                const res = await customerGetOrderDetail({ query: { orderId: order.orderId, clientId } });
                if (res.success && res.data) fullOrder = res.data as Order;
            } catch { toast.error("Lỗi tải chi tiết đơn hàng để in"); return null; }
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
            samples: (fullOrder.samples || []).map(s => ({
                sampleName: s.sampleName || "",
                sampleMatrix: s.sampleMatrix || "",
                sampleNote: s.sampleNote || "",
                analyses: (s.analyses || []).map((a: any) => ({
                    parameterName: a.parameterName,
                    parameterId: a.parameterId,
                    feeBeforeTax: a.feeBeforeTax || 0,
                    taxRate: a.taxRate || 0,
                    feeAfterTax: a.feeAfterTax || 0,
                    protocolCode: a.protocolCode,
                })),
            })),
            pricing: { subtotal: storedSubtotal, discountAmount: storedDiscount, feeBeforeTax: storedNet, tax: storedTax, total: storedTotal },
            discountRate: fullOrder.discountRate || 0,
            orderUri: fullOrder.orderUri || "",
            requestForm: fullOrder.requestForm || "",
        };
    };

    const handlePrint = async (order: Order) => {
        const data = await preparePrintData(order);
        if (data) { setPrintData(data); setIsPrintModalOpen(true); }
    };

    const handleSampleRequestPrint = async (order: Order) => {
        const data = await preparePrintData(order);
        if (data) { setPrintData(data); setIsSampleRequestModalOpen(true); }
        else toast.error("Lỗi chuẩn bị dữ liệu in");
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

    const handleSaveTrigger = () => editorRef.current?.save();

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
                            {isCreate ? "Tạo đơn hàng mới"
                                : initialViewMode === "edit" ? `Chỉnh sửa - ${selectedOrder?.orderId || ""}`
                                : `Chi tiết - ${selectedOrder?.orderId || ""}`}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {!isCreate && (
                            <button onClick={toggleLocalMode} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                                {localViewMode === "view" ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="hidden sm:inline">{localViewMode === "view" ? "Chỉnh sửa" : "Xem"}</span>
                            </button>
                        )}
                        {localViewMode === "view" && (
                            <>
                                <button onClick={() => editorRef.current?.export()} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                                    <FileDown className="w-4 h-4" /><span className="hidden sm:inline">In Đơn hàng</span>
                                </button>
                                <button onClick={() => editorRef.current?.exportSampleRequest()} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                                    <FileText className="w-4 h-4" /><span className="hidden sm:inline">Phiếu gửi mẫu</span>
                                </button>
                            </>
                        )}
                        {localViewMode !== "view" && (
                            <button onClick={handleSaveTrigger} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                <Save className="w-4 h-4" /><span className="hidden sm:inline">Lưu</span>
                            </button>
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
                {printData && <CustomerSampleRequestPrintPreviewModal isOpen={isSampleRequestModalOpen} onClose={() => setIsSampleRequestModalOpen(false)} data={printData} />}
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
                <button onClick={handleCreate} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />Tạo đơn hàng mới
                </button>
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
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />Đang tải...
                                </td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">Chưa có đơn hàng nào</td></tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.orderId} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-3 py-2.5 text-sm font-semibold text-primary cursor-pointer" onClick={() => handleViewDetail(order)}>{order.orderId}</td>
                                        <td className="px-3 py-2.5 text-sm text-foreground">
                                            <div className="font-medium">{(order as any).contactPerson?.contactName || "—"}</div>
                                            <div className="text-xs text-muted-foreground">{(order as any).contactPerson?.contactPhone || ""}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-center text-foreground">{(order as any).samples?.length || 0}</td>
                                        <td className="px-3 py-2.5 text-sm text-muted-foreground hidden sm:table-cell">
                                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "—"}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColors[(order as any).orderStatus] || "bg-muted text-muted-foreground border-border"}`}>
                                                {(order as any).orderStatus || "—"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-sm text-right font-medium text-foreground">
                                            {Number((order as any).totalAmount || 0).toLocaleString("vi-VN")} đ
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => handleViewDetail(order)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title="Xem">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleEdit(order)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title="Sửa">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handlePrint(order)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title="In đơn hàng">
                                                    <FileDown className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleSampleRequestPrint(order)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title="Phiếu gửi mẫu">
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
                        onItemsPerPageChange={(items) => { setItemsPerPage(items); setCurrentPage(1); }}
                    />
                )}
            </div>

            {isPrintModalOpen && printData && (
                <CustomerOrderPrintPreviewModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    data={printData}
                />
            )}

            {isSampleRequestModalOpen && printData && (
                <CustomerSampleRequestPrintPreviewModal
                    isOpen={isSampleRequestModalOpen}
                    onClose={() => setIsSampleRequestModalOpen(false)}
                    data={printData}
                />
            )}
        </div>
    );
}
