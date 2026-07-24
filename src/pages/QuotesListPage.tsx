import { useState, useEffect, useRef } from "react";
import { Plus, Eye, FileDown, Pencil, Search, Save, ArrowLeft, Copy, MoreHorizontal } from "lucide-react";
import type { QuoteEditorRef } from "@/components/quote/QuoteEditor";
import { QuoteEditor } from "@/components/quote/QuoteEditor";

import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getQuotes, getQuoteDetail } from "@/api/index";

import type { Quote } from "@/types/quote";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { MainLayout } from "@/components/layout/MainLayout";
import { QuotePrintPreviewModal } from "@/components/quote/QuotePrintPreviewModal";
import type { QuotePrintData } from "@/components/quote/QuotePrintTemplate";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface QuotesListPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function QuotesListPage({ activeMenu, onMenuClick }: QuotesListPageProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const editorRef = useRef<QuoteEditorRef>(null);

    // URL params as single source of truth for query, page, itemsPerPage
    const searchQueryUrl = searchParams.get("search") || "";
    const currentPage = Number(searchParams.get("page")) || 1;
    const itemsPerPage = Number(searchParams.get("itemsPerPage")) || 20;

    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [searchQuery, setSearchQuery] = useState(searchQueryUrl);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Print State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<QuotePrintData | null>(null);

    // Pagination State
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    const isCreate = searchParams.get("create") === "true";
    const quoteId = searchParams.get("quoteId");
    const duplicateId = searchParams.get("duplicateId");
    const isEdit = searchParams.get("edit") === "true" && !!quoteId;
    const isDetail = !isEdit && !!quoteId;

    const isEditorActive = isCreate || !!quoteId;
    const viewMode = isCreate ? "create" : isEdit ? "edit" : "view";

    // Đồng bộ ngược từ URL về local state searchQuery khi URL thay đổi (nhấn Back/Forward)
    useEffect(() => {
        // Chỉ đồng bộ ngược khi local searchQuery khớp với searchQueryUrl cũ, tránh ghi đè lúc người dùng đang gõ và chờ debounce
        const isCurrentlyTyping = searchQuery !== searchQueryUrl;
        if (!isCurrentlyTyping) {
            setSearchQuery(searchQueryUrl);
        }
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

    // Fetch quotes
    useEffect(() => {
        const fetchQuotes = async () => {
            setIsLoading(true);
            try {
                const query: any = {
                    search: searchQueryUrl || undefined,
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
        };

        fetchQuotes();
    }, [searchQueryUrl, currentPage, itemsPerPage]);

    // Set selected quote based on URL ID
    useEffect(() => {
        const loadSelectedQuote = async () => {
            if ((isDetail || isEdit) && quoteId) {
                try {
                    const response = await getQuoteDetail({ query: { quoteId } });
                    if (response.success && response.data) {
                        setSelectedQuote(response.data as Quote);
                    } else {
                        setSelectedQuote(null);
                    }
                } catch (error) {
                    console.error("Failed to load quote detail", error);
                    setSelectedQuote(null);
                }
            } else if (isCreate) {
                if (duplicateId) {
                    try {
                        const response = await getQuoteDetail({ query: { quoteId: duplicateId } });
                        if (response.success && response.data) {
                            const sourceData = { ...response.data } as any;
                            const duplicatedSamples = (sourceData.samples || []).map((s: any, sIdx: number) => ({
                                ...s,
                                id: `temp-sample-${Date.now()}-${sIdx}-${Math.random().toString(36).slice(2)}`,
                                sampleId: undefined,
                                analyses: (s.analyses || []).map((a: any, aIdx: number) => ({
                                    ...a,
                                    id: `temp-analysis-${Date.now()}-${sIdx}-${aIdx}-${Math.random().toString(36).slice(2)}`,
                                })),
                            }));
                            const duplicatedQuote = {
                                ...sourceData,
                                quoteId: undefined,
                                samples: duplicatedSamples,
                            } as any;
                            setSelectedQuote(duplicatedQuote as Quote);
                        } else {
                            setSelectedQuote(null);
                        }
                    } catch (error) {
                        console.error("Failed to load duplicate quote", error);
                        setSelectedQuote(null);
                    }
                } else {
                    setSelectedQuote(null);
                }
            } else {
                setSelectedQuote(null);
            }
        };
        loadSelectedQuote();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quoteId, isDetail, isEdit, isCreate, duplicateId]);

    const handleCreate = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("create", "true");
        newParams.delete("quoteId");
        newParams.delete("edit");
        setSearchParams(newParams, { replace: true });
    };
    const handleViewDetail = (quote: Quote) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("quoteId", quote.quoteId);
        newParams.delete("edit");
        newParams.delete("create");
        setSearchParams(newParams, { replace: true });
    };
    const handleEdit = (quote: Quote) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("quoteId", quote.quoteId);
        newParams.set("edit", "true");
        newParams.delete("create");
        setSearchParams(newParams, { replace: true });
    };

    const handleDuplicate = (quote: Quote) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set("create", "true");
        newParams.set("duplicateId", quote.quoteId);
        newParams.delete("quoteId");
        newParams.delete("edit");
        setSearchParams(newParams, { replace: true });
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
        const contact = (fullQuote.client?.clientContacts?.[0] || {}) as any;
        const contactPerson = fullQuote.contactPerson?.contactName || contact.contactName || contact.name || "";
        const contactPhone = fullQuote.contactPerson?.contactPhone || contact.contactPhone || contact.phone || "";
        const contactIdentity = fullQuote.contactPerson?.identityId || contact.identityId || "";
        const contactEmail = fullQuote.contactPerson?.contactEmail || contact.contactEmail || contact.email || "";
        const contactPosition = contact.contactPosition || contact.position || "";
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
                sampleTypeName: s.sampleTypeName || (s as any).sampleMatrix || (s as any).matrix || (s as any).librarySampleType?.sampleTypeName || "",
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
            discountRate: Number(fullQuote.discountRate) || 0,
            commission: 0,
        };

        setPrintData(data);
        setIsPrintModalOpen(true);
    };

    const closeModal = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("quoteId");
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

    const handleSaveSuccess = (createdQuote?: any) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("create");
        newParams.delete("edit");
        newParams.delete("duplicateId");
        if (createdQuote && createdQuote.quoteId) {
            newParams.set("quoteId", createdQuote.quoteId);
        } else {
            newParams.delete("quoteId");
        }
        setSearchParams(newParams, { replace: true });
    };

    const handleCreateOrder = () => {
        if (selectedQuote) {
            navigate(`/orders?create=true&quoteId=${selectedQuote.quoteId}`);
        }
    };

    const handleSaveTrigger = () => {
        editorRef.current?.save();
    };



    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-lg font-semibold text-foreground">{t("quote.management")}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{t("quote.subtitle")}</p>
            </div>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t("quote.create")}</span>
            </button>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div className="space-y-2">
                {" "}
                {/* Reduced padding: space-y-4 -> space-y-2 */}
                {/* Filters */}
                <div className="bg-card rounded-lg border border-border p-2">
                    {" "}
                    {/* Reduced padding: p-4 -> p-2 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("quote.searchPlaceholder")}
                            className="w-full pl-9 pr-4 py-1.5 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm" // Reduced padding
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
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.code")}</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[250px]">{t("quote.client")}</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t("order.salePerson")}</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[150px]">{t("order.total")}</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t("quote.createdDate")}</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.status")}</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-2 text-center text-sm text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : quotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-2 text-center text-sm text-muted-foreground">
                                            {t("common.noData")}
                                        </td>
                                    </tr>
                                ) : (
                                    quotes.map((quote) => (
                                        <tr key={quote.quoteId} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-3 py-2 text-sm font-medium text-primary cursor-pointer whitespace-nowrap" onClick={() => handleViewDetail(quote)}>
                                                {quote.quoteId}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-foreground">
                                                <div className="font-medium line-clamp-2">{quote.client?.clientName || "Unknown Client"}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{quote.contactPerson?.contactName || "N/A"}</div>
                                            </td>
                                            <td className="px-3 py-2 text-sm text-foreground hidden md:table-cell">{quote.salePerson || "-"}</td>
                                            <td className="px-3 py-2 text-left text-sm font-medium text-foreground">{(quote.totalAmount || 0).toLocaleString("vi-VN")} đ</td>
                                            <td className="px-3 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                                                {quote.createdAt ? new Date(String(quote.createdAt).replace(/^"+|"+$/g, '').trim()).toLocaleDateString("vi-VN") : "N/A"}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-gray-100 text-gray-800`}>{quote.quoteStatus}</span>
                                            </td>
                                            <td className="px-3 py-2">
                                                {/* Desktop: Show buttons directly */}
                                                <div className="hidden md:flex items-center gap-2">
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

                                                {/* Mobile: Show Dropdown */}
                                                <div className="md:hidden">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="h-8 w-8 p-0 hover:bg-muted rounded-full flex items-center justify-center transition-colors">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleViewDetail(quote)}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                {t("common.view")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(quote)}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                {t("common.edit")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDuplicate(quote)}>
                                                                <Copy className="mr-2 h-4 w-4" />
                                                                {t("common.duplicate")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handlePrint(quote)}>
                                                                <FileDown className="mr-2 h-4 w-4" />
                                                                {t("quote.download")}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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
                            onPageChange={handlePageChange}
                            onItemsPerPageChange={handleItemsPerPageChange}
                        />
                    )}
                </div>
            </div>
            {printData && <QuotePrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}

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
                                            onClick={() => {
                                                const newParams = new URLSearchParams(searchParams);
                                                newParams.set("edit", "true");
                                                setSearchParams(newParams, { replace: true });
                                            }}
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
                                        <span className="hidden sm:inline">{t("common.save")}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 overflow-hidden">
                            <QuoteEditor ref={editorRef} mode={viewMode} initialData={selectedQuote || undefined} onBack={handleBack} onSaveSuccess={handleSaveSuccess} />
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
