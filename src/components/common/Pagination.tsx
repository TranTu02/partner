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
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage <= 4) {
                // Near start: 1, 2, 3, 4, 5, ... N
                for (let i = 2; i <= 5; i++) pages.push(i);
                pages.push("...");
            } else if (currentPage >= totalPages - 3) {
                // Near end: 1, ..., N-4, N-3, N-2, N-1, N
                pages.push("...");
                for (let i = totalPages - 4; i < totalPages; i++) pages.push(i);
            } else {
                // Middle: 1, ..., X-1, X, X+1, ..., N
                pages.push("...");
                const start = currentPage - 1;
                const end = currentPage + 1;
                for (let i = start; i <= end; i++) {
                    pages.push(i);
                }
                pages.push("...");
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-4 md:px-6 border-t border-border bg-card gap-4">
            {/* Items info - Bottom on mobile, Left on desktop */}
            <div className="text-sm text-muted-foreground order-3 md:order-1 text-center md:text-left w-full md:w-auto">
                {t("pagination.showing")} <span className="font-medium text-foreground">{startItem}</span> {t("pagination.to")} <span className="font-medium text-foreground">{endItem}</span>{" "}
                {t("pagination.of")} <span className="font-medium text-foreground">{totalItems}</span> {t("pagination.results")}
            </div>

            {/* Page controls wrapper - Top on mobile, Right on desktop */}
            <div className="flex flex-col md:flex-row items-center gap-4 order-1 md:order-2 w-full md:w-auto">
                {/* Navigation Buttons - Top row on mobile */}
                <div className="flex items-center gap-2 justify-center w-full md:w-auto">
                    {/* First Page */}
                    <button
                        onClick={handleFirst}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden sm:flex"
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
                        {getPageNumbers().map((page, index) =>
                            page === "..." ? (
                                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page as number)}
                                    className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        page === currentPage ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted text-foreground"
                                    }`}
                                >
                                    {page}
                                </button>
                            ),
                        )}
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
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden sm:flex"
                        aria-label={t("pagination.last")}
                        title={t("pagination.last")}
                    >
                        <ChevronsRight className="w-4 h-4 text-foreground" />
                    </button>
                </div>

                {/* Rows per page - Middle row on mobile */}
                {onItemsPerPageChange && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center w-full md:w-auto">
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
