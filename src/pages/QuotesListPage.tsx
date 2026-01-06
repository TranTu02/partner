import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Eye, FileDown, Pencil, Search, Save, ArrowLeft } from "lucide-react";
import type { QuoteEditorRef } from "@/components/quote/QuoteEditor";
import { QuoteEditor } from "@/components/quote/QuoteEditor";
// import type { Quote } from "../data/mockData";
// import { mockQuotes } from "../data/mockData";

import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getQuotes } from "@/api/index";
import type { Quote } from "@/types/quote";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";

import { MainLayout } from "@/components/layout/MainLayout";

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
                const found = quotes.find((q) => q.quoteId === quoteId);
                if (found) {
                    setSelectedQuote(found);
                }
                // Else maybe fetch detail specifically? Rely on list for now.
            } else if (isCreate) {
                setSelectedQuote(null);
            }
        };
        loadSelectedQuote();
    }, [quoteId, isDetail, isEdit, isCreate, quotes]);

    const handleCreate = () => navigate("/quotes/create");
    const handleViewDetail = (quote: Quote) => navigate(`/quotes/detail?quoteId=${quote.quoteId}`);
    const handleEdit = (quote: Quote) => navigate(`/quotes/edit?quoteId=${quote.quoteId}`);

    const handleBack = () => {
        if (editorRef.current?.hasUnsavedChanges()) {
            if (confirm(t("common.unsavedChanges"))) {
                navigate("/quotes");
            }
        } else {
            navigate("/quotes");
        }
    };

    const handleSaveSuccess = () => {
        fetchQuotes();
        navigate("/quotes");
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
                            <button
                                onClick={() => editorRef.current?.export()}
                                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                            >
                                <FileDown className="w-4 h-4" />
                                <span className="hidden sm:inline">{t("quote.print", "In Báo giá")}</span>
                            </button>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.createdDate")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quote.status")}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("common.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : quotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">
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
                                                <div className="text-xs text-muted-foreground">{quote.contactPerson?.identityName || "N/A"}</div>
                                            </td>
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
                                                    <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title={t("quote.download")}>
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
        </MainLayout>
    );
}
