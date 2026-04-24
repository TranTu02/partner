import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, FileDown, Search, ArrowLeft, Pencil, Save } from "lucide-react";
import { CustomerQuoteEditor } from "@/customerComponents/order/CustomerQuoteEditor";
import type { CustomerQuoteEditorRef } from "@/customerComponents/order/CustomerQuoteEditor";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { customerGetQuotes, customerGetQuoteDetail } from "@/api/customer";
import type { Quote } from "@/types/quote";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { CustomerQuotePrintPreviewModal as QuotePrintPreviewModal } from "@/customerComponents/order/CustomerQuotePrintPreviewModal";
import type { QuotePrintData } from "@/components/quote/QuotePrintTemplate";

export function CustomerQuotesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const editorRef = useRef<CustomerQuoteEditorRef>(null);

    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<QuotePrintData | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // URL-driven views
    const isCreate = location.pathname.endsWith("/create");
    const isDetail = location.pathname.endsWith("/detail");
    const isEdit = location.pathname.endsWith("/edit");
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

    const fetchQuotes = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await customerGetQuotes({ query: { search: searchQuery || undefined, page: currentPage, itemsPerPage } });
            if (res.success && res.data) {
                const data = res.data as any;
                const quoteList = Array.isArray(data) ? data : data.quotes || data.items || [];

                setQuotes(quoteList as Quote[]);
                if (res.meta) {
                    setTotalPages(res.meta.totalPages);
                    setTotalItems(res.meta.total);
                    setItemsPerPage(res.meta.itemsPerPage);
                }
            } else {
                setQuotes([]);
                setTotalPages(0);
                setTotalItems(0);
            }
        } catch {
            toast.error("Lỗi tải danh sách báo giá");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, currentPage, itemsPerPage]);

    useEffect(() => {
        if (isEditorActive) return; // Don't fetch list when in editor mode
        const timer = setTimeout(() => fetchQuotes(), 300);
        return () => clearTimeout(timer);
    }, [fetchQuotes, isEditorActive]);

    useEffect(() => {
        const loadSelected = async () => {
            if ((isDetail || isEdit) && quoteId) {
                try {
                    const res = await customerGetQuoteDetail({ query: { quoteId, clientId } });
                    if (res.success && res.data) setSelectedQuote(res.data as Quote);
                    else setSelectedQuote(null);
                } catch {
                    setSelectedQuote(null);
                }
            } else if (isCreate) {
                if (duplicateId) {
                    try {
                        const res = await customerGetQuoteDetail({ query: { quoteId: duplicateId, clientId } });
                        if (res.success && res.data) setSelectedQuote(res.data as Quote);
                        else setSelectedQuote(null);
                    } catch {
                        setSelectedQuote(null);
                    }
                } else {
                    setSelectedQuote(null);
                }
            }
        };
        loadSelected();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quoteId, isDetail, isEdit, isCreate, duplicateId, clientId]);

    const handleViewDetail = (quote: Quote) => navigate(`/customer/quotes/detail?quoteId=${quote.quoteId}`);

    const handlePrint = async (quote: Quote) => {
        let fullQuote = quote;
        if (!quote.samples || quote.samples.length === 0) {
            try {
                const res = await customerGetQuoteDetail({ query: { quoteId: quote.quoteId, clientId } });
                if (res.success && res.data) fullQuote = res.data as Quote;
            } catch {
                toast.error("Lỗi tải chi tiết báo giá để in");
                return;
            }
        }
        const storedSubtotal = Number(fullQuote.totalFeeBeforeTax) || 0;
        const storedDiscount = Number((fullQuote as any).totalDiscountValue) || 0;
        const storedNet = Number((fullQuote as any).totalFeeBeforeTaxAndDiscount) || storedSubtotal - storedDiscount;
        const storedTotal = Number(fullQuote.totalAmount) || 0;
        const storedTax = storedNet > 0 ? storedTotal - storedNet : 0;
        const contact = fullQuote.client?.clientContacts?.[0] || ({} as any);
        const data: QuotePrintData = {
            quoteId: fullQuote.quoteId,
            client: fullQuote.client
                ? {
                      ...fullQuote.client,
                      clientAddress: fullQuote.client.clientAddress || "",
                      clientPhone: fullQuote.client.clientPhone || "",
                      clientEmail: fullQuote.client.clientEmail || "",
                      invoiceInfo: {
                          taxName: fullQuote.client.invoiceInfo?.taxName || fullQuote.client.clientName || "",
                          taxCode: fullQuote.client.invoiceInfo?.taxCode || fullQuote.client.legalId || "",
                          taxAddress: fullQuote.client.invoiceInfo?.taxAddress || fullQuote.client.clientAddress || "",
                          taxEmail: fullQuote.client.invoiceInfo?.taxEmail || "",
                      },
                  }
                : null,
            contactPerson: fullQuote.contactPerson?.contactName || (contact as any).contactName || "",
            contactPhone: fullQuote.contactPerson?.contactPhone || (contact as any).contactPhone || "",
            contactIdentity: fullQuote.contactPerson?.identityId || "",
            reportEmail: fullQuote.contactPerson?.contactEmail || "",
            contactEmail: fullQuote.contactPerson?.contactEmail || "",
            contactPosition: (contact as any).contactPosition || "",
            contactAddress: (contact as any).contactAddress || "",
            clientAddress: fullQuote.client?.clientAddress || "",
            taxName: fullQuote.client?.invoiceInfo?.taxName || fullQuote.client?.clientName || "",
            taxCode: fullQuote.client?.invoiceInfo?.taxCode || fullQuote.client?.legalId || "",
            taxAddress: fullQuote.client?.invoiceInfo?.taxAddress || fullQuote.client?.clientAddress || "",
            samples: (fullQuote.samples || []).map((s: any) => ({
                sampleName: s.sampleName || "",
                sampleTypeName: s.sampleTypeName || "",
                sampleNote: s.sampleNote || "",
                analyses: (s.analyses || []).map((a: any) => ({
                    parameterName: a.parameterName,
                    parameterId: a.parameterId,
                    feeBeforeTax: a.feeBeforeTax || 0,
                    taxRate: a.taxRate || 0,
                    feeAfterTax: a.feeAfterTax || 0,
                    protocolCode: a.protocolCode || "",
                    protocolSource: a.protocolSource || "",
                    protocolAccreditation: a.protocolAccreditation || "",
                    sampleTypeName: a.sampleTypeName || "",
                })),
            })),
            pricing: { subtotal: storedSubtotal, discountAmount: storedDiscount, feeBeforeTax: storedNet, tax: storedTax, total: storedTotal },
            discountRate: Number(fullQuote.discountRate) || 0,
            commission: 0,
        };
        setPrintData(data);
        setIsPrintModalOpen(true);
    };

    const handleBack = () => {
        if (editorRef.current?.hasUnsavedChanges()) {
            if (confirm("Bạn có thay đổi chưa lưu. Bạn có muốn rời đi không?")) navigate("/customer/quotes");
        } else {
            navigate("/customer/quotes");
        }
    };

    const handleSaveSuccess = (createdQuote?: any) => {
        fetchQuotes();
        setLocalViewMode("view");
        if (createdQuote?.quoteId) navigate(`/customer/quotes/detail?quoteId=${createdQuote.quoteId}`);
        else navigate("/customer/quotes");
    };

    // ====== EDITOR MODE (full-screen, no CustomerLayout) ======
    if (isEditorActive) {
        return (
            <div className="h-screen flex flex-col bg-background">
                <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold text-foreground">
                            {isCreate ? "Tạo báo giá mới" : localViewMode === "edit" ? `Chỉnh sửa - ${selectedQuote?.quoteId || ""}` : `Chi tiết - ${selectedQuote?.quoteId || ""}`}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {localViewMode === "view" && (
                            <>
                                {(selectedQuote?.quoteStatus?.toLowerCase() === "draft" || selectedQuote?.quoteStatus?.toLowerCase() === "sent") && (
                                    <button
                                        onClick={() => setLocalViewMode("edit")}
                                        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        <span>Chỉnh sửa</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => editorRef.current?.export()}
                                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    <FileDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">In Báo giá</span>
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
                    <CustomerQuoteEditor ref={editorRef} mode={localViewMode as any} initialData={selectedQuote || undefined} onBack={handleBack} onSaveSuccess={handleSaveSuccess} />
                </div>
                {printData && <QuotePrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
            </div>
        );
    }

    // ====== LIST MODE ======
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Báo giá</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Danh sách các báo giá</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-card rounded-lg border border-border p-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm báo giá..."
                        className="w-full pl-9 pr-4 py-1.5 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Mã BG</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">Người liên hệ</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tổng tiền</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Ngày tạo</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : quotes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                                        Chưa có báo giá nào
                                    </td>
                                </tr>
                            ) : (
                                quotes.map((quote) => (
                                    <tr key={quote.quoteId} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-3 py-2 text-sm font-medium text-primary cursor-pointer whitespace-nowrap" onClick={() => handleViewDetail(quote)}>
                                            {quote.quoteId}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-foreground">
                                            <div className="font-medium line-clamp-1">{quote.contactPerson?.contactName || "—"}</div>
                                            <div className="text-xs text-muted-foreground">{quote.contactPerson?.contactPhone || ""}</div>
                                        </td>
                                        <td className="px-3 py-2 text-sm font-medium text-foreground">{Math.ceil(Number(quote.totalAmount || 0)).toLocaleString("vi-VN")} đ</td>
                                        <td className="px-3 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                            {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString("vi-VN") : "—"}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                {quote.quoteStatus}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => handleViewDetail(quote)}
                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                title="Xem"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handlePrint(quote)} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title="In">
                                                <FileDown className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!isLoading && (totalPages > 1 || quotes.length > 0) && (
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
            {printData && <QuotePrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
        </div>
    );
}
