import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (items: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }: PaginationProps) {
    const { t } = useTranslation();
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const handleFirst = () => {
        if (currentPage > 1) {
            onPageChange(1);
        }
    };

    const handleLast = () => {
        if (currentPage < totalPages) {
            onPageChange(totalPages);
        }
    };

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const getPageNumbers = () => {
        const pages: number[] = [];
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
            {/* Items info */}
            <div className="text-sm text-muted-foreground">
                {t("pagination.showing")} <span className="font-medium text-foreground">{startItem}</span> {t("pagination.to")} <span className="font-medium text-foreground">{endItem}</span>{" "}
                {t("pagination.of")} <span className="font-medium text-foreground">{totalItems}</span> {t("pagination.results")}
            </div>

            {/* Page controls */}
            <div className="flex items-center gap-2">
                {/* First Page */}
                <button
                    onClick={handleFirst}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("pagination.first")}
                    title={t("pagination.first")}
                >
                    <ChevronsLeft className="w-4 h-4 text-foreground" />
                </button>

                {/* Previous Page */}
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("pagination.previous")}
                    title={t("pagination.previous")}
                >
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page) => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                                page === currentPage ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted text-foreground"
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                {/* Next Page */}
                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("pagination.next")}
                    title={t("pagination.next")}
                >
                    <ChevronRight className="w-4 h-4 text-foreground" />
                </button>

                {/* Last Page */}
                <button
                    onClick={handleLast}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("pagination.last")}
                    title={t("pagination.last")}
                >
                    <ChevronsRight className="w-4 h-4 text-foreground" />
                </button>
                {/* End buttons */}
                {onItemsPerPageChange && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
                        <span>{t("pagination.rowsPerPage")}:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                onItemsPerPageChange(Number(e.target.value));
                            }}
                            className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {[10, 20, 50, 100].map((pageSize) => (
                                <option key={pageSize} value={pageSize}>
                                    {pageSize}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}
