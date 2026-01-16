import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Eye, FileDown, Pencil, Search, Save, ArrowLeft, Copy } from "lucide-react";
import type { QuoteEditorRef } from "@/components/quote/QuoteEditor";
import { QuoteEditor } from "@/components/quote/QuoteEditor";
// import type { Quote } from "../data/mockData";
// import { mockQuotes } from "../data/mockData";

import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getQuotes, getQuoteDetail } from "@/api/index";

import type { Quote } from "@/types/quote";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { MainLayout } from "@/components/layout/MainLayout";
import { QuotePrintPreviewModal } from "@/components/quote/QuotePrintPreviewModal";
import type { QuotePrintData } from "@/components/quote/QuotePrintTemplate";

interface QuotesListPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function QuotesListPage({ activeMenu, onMenuClick }: QuotesListPageProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const editorRef = useRef<QuoteEditorRef>(null);

    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<QuotePrintData | null>(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Determine current view from URL
    const isCreate = location.pathname.endsWith("/create");
    const isDetail = location.pathname.endsWith("/detail");
    const isEdit = location.pathname.endsWith("/edit");
    const quoteId = searchParams.get("quoteId");
    const duplicateId = searchParams.get("duplicateId");

    const isEditorActive = isCreate || isDetail || isEdit;
    const viewMode = isCreate ? "create" : isEdit ? "edit" : "view";

    // API Fetch
    const fetchQuotes = useCallback(async () => {
        setIsLoading(true);
        try {
            const query: any = {
                search: searchQuery || undefined,
                page: currentPage,
                itemsPerPage,
            };
            const response = await getQuotes({ query });
            if (response.success && response.data) {
                setQuotes(response.data as Quote[]);
                if (response.meta) {
                    setTotalPages(response.meta.totalPages || 0);
                    setTotalItems(response.meta.total || 0);
                }
            } else {
                if (response.error) {
                    console.error("Fetch quotes error", response.error);
                }
            }
        } catch (error) {
            console.error("Failed to fetch quotes", error);
            toast.error("Error fetching quotes");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, currentPage, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchQuotes();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchQuotes]);

    // Set selected quote based on URL ID
    useEffect(() => {
        const loadSelectedQuote = async () => {
            if ((isDetail || isEdit) && quoteId) {
                try {
                    const response = await getQuoteDetail({ query: { quoteId } });
                    if (response.success && response.data) {
                        setSelectedQuote(response.data as Quote);
                    } else {
                        // Fallback
                        const found = quotes.find((q) => q.quoteId === quoteId);
                        if (found) setSelectedQuote(found);
                    }
                } catch (error) {
                    console.error("Failed to load quote detail", error);
                    const found = quotes.find((q) => q.quoteId === quoteId);
                    if (found) setSelectedQuote(found);
                }
            } else if (isCreate) {
                if (duplicateId) {
                    try {
                        const response = await getQuoteDetail({ query: { quoteId: duplicateId } });
                        if (response.success && response.data) {
                            setSelectedQuote(response.data as Quote);
                        } else {
                            const found = quotes.find((q) => q.quoteId === duplicateId);
                            if (found) setSelectedQuote(found);
                        }
                    } catch (error) {
                        console.error("Failed to load duplicate quote", error);
                        const found = quotes.find((q) => q.quoteId === duplicateId);
                        if (found) setSelectedQuote(found);
                    }
                } else {
                    setSelectedQuote(null);
                }
            }
        };
        loadSelectedQuote();
    }, [quoteId, isDetail, isEdit, isCreate, duplicateId, quotes]);

    const handleCreate = () => navigate("/quotes/create");
    const handleViewDetail = (quote: Quote) => navigate(`/quotes/detail?quoteId=${quote.quoteId}`);
    const handleEdit = (quote: Quote) => navigate(`/quotes/edit?quoteId=${quote.quoteId}`);

    const handleDuplicate = (quote: Quote) => {
        navigate(`/quotes/create?duplicateId=${quote.quoteId}`);
    };

    const handlePrint = async (quote: Quote) => {
        let fullQuote = quote;
        if (!quote.samples || quote.samples.length === 0) {
            try {
                const res = await getQuoteDetail({ query: { quoteId: quote.quoteId } });
                if (res.success && res.data) {
                    fullQuote = res.data as Quote;
                }
            } catch (e) {
                console.error("Failed to fetch full quote for print", e);
                toast.error("Failed to load full quote details");
                return;
            }
        }

        // Calculate Pricing
        const storedSubtotal = Number(fullQuote.totalFeeBeforeTax) || 0;
        const storedDiscount = Number((fullQuote as any).totalDiscountValue) || 0;
        const storedNet = Number((fullQuote as any).totalFeeBeforeTaxAndDiscount) || storedSubtotal - storedDiscount;
        const storedTotal = Number(fullQuote.totalAmount) || 0;
        const storedTax = storedNet > 0 ? storedTotal - storedNet : 0;

        // Contacts
        const contact = fullQuote.client?.clientContacts?.[0] || {};
        const contactPerson = fullQuote.contactPerson?.contactName || contact.contactName || (contact as any).name || "";
        const contactPhone = fullQuote.contactPerson?.contactPhone || contact.contactPhone || (contact as any).phone || "";
        const contactIdentity = fullQuote.contactPerson?.identityId || contact.identityId || "";
        const contactEmail = fullQuote.contactPerson?.contactEmail || contact.contactEmail || (contact as any).email || "";
        const contactPosition = contact.contactPosition || (contact as any).position || "";
        const contactAddress = contact.contactAddress || "";

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

            contactPerson,
            contactPhone,
            contactIdentity,
            reportEmail: contactEmail,
            contactEmail,
            contactPosition,
            contactAddress,

            clientAddress: fullQuote.client?.clientAddress || "",
            taxName: fullQuote.client?.invoiceInfo?.taxName || fullQuote.client?.clientName || "",
            taxCode: fullQuote.client?.invoiceInfo?.taxCode || fullQuote.client?.legalId || "",
            taxAddress: fullQuote.client?.invoiceInfo?.taxAddress || fullQuote.client?.clientAddress || "",

            samples: (fullQuote.samples || []).map((s) => ({
                sampleName: s.sampleName || "",
                sampleMatrix: s.sampleMatrix || "",
                sampleNote: s.sampleNote || "",
                analyses: (s.analyses || []).map((a: any) => {
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
            discountRate: fullQuote.discountRate || 0,
            commission: 0,
        };

        setPrintData(data);
        setIsPrintModalOpen(true);
    };

    const handleBack = () => {
        if (editorRef.current?.hasUnsavedChanges()) {
            if (confirm(t("common.unsavedChanges"))) {
                navigate("/quotes");
            }
        } else {
            navigate("/quotes");
        }
    };

    const handleSaveSuccess = (createdQuote?: any) => {
        fetchQuotes();
        if (createdQuote && createdQuote.quoteId) {
            navigate(`/quotes/detail?quoteId=${createdQuote.quoteId}`);
        } else {
            navigate("/quotes");
        }
    };

    const handleCreateOrder = () => {
        if (selectedQuote) {
            navigate(`/orders/create?quoteId=${selectedQuote.quoteId}`);
        }
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
                                    ? t("quote.create")
                                    : viewMode === "edit"
                                    ? `${t("quote.edit")} ${selectedQuote?.quoteId ? `- ${selectedQuote.quoteId}` : ""}`
                                    : `${t("quote.detail")} ${selectedQuote?.quoteId ? `- ${selectedQuote.quoteId}` : ""}`}
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {viewMode === "view" && (
                            <>
                                <button
                                    onClick={() => navigate(`/quotes/edit?quoteId=${selectedQuote?.quoteId}`)}
                                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    <Pencil className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t("common.edit")}</span>
                                </button>
                                <button
                                    onClick={handleCreateOrder}
                                    className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t("quote.createOrder", "Tạo đơn hàng")}</span>
                                </button>
                                <button
                                    onClick={() => editorRef.current?.export()}
                                    className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                                >
                                    <FileDown className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t("quote.printButton", "In Báo giá")}</span>
                                </button>
                            </>
                        )}
                        {viewMode !== "view" && (
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
                    <QuoteEditor ref={editorRef} mode={viewMode} initialData={selectedQuote || undefined} onBack={handleBack} onSaveSuccess={handleSaveSuccess} />
                </div>
            </div>
        );
    }

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-lg font-semibold text-foreground">{t("quote.management")}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{t("quote.subtitle")}</p>
            </div>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                {t("quote.create")}
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
                            placeholder={t("quote.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Quotes List */}
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.code")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.client")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.salePerson")}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("order.total")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.createdDate")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.status")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : quotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-muted-foreground">
                                            {t("common.noData")}
                                        </td>
                                    </tr>
                                ) : (
                                    quotes.map((quote) => (
                                        <tr key={quote.quoteId} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-primary cursor-pointer" onClick={() => handleViewDetail(quote)}>
                                                {quote.quoteId}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground">
                                                <div>{quote.client?.clientName || "Unknown Client"}</div>
                                                <div className="text-xs text-muted-foreground">{quote.contactPerson?.contactName || "N/A"}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-foreground">{quote.salePerson || "-"}</td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{(quote.totalAmount || 0).toLocaleString("vi-VN")} đ</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{quote.createdAt ? new Date(quote.createdAt).toLocaleDateString("vi-VN") : "N/A"}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}>{quote.quoteStatus}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleViewDetail(quote)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("common.view")}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(quote)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("common.edit")}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDuplicate(quote)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("common.duplicate")}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrint(quote)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                                                        title={t("quote.download")}
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

                    {!isLoading && quotes.length > 0 && (
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
            {printData && <QuotePrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
        </MainLayout>
    );
}
