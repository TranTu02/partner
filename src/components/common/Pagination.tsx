import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
    const { t } = useTranslation();
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

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
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push("...");
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push("...");
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    if (totalPages <= 1) {
        return null; // Don't show pagination if only 1 page
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
                {/* Previous button */}
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("pagination.previous")}
                >
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) => (
                        <button
                            key={index}
                            onClick={() => typeof page === "number" && onPageChange(page)}
                            disabled={page === "..."}
                            className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                                page === currentPage
                                    ? "bg-primary text-primary-foreground"
                                    : page === "..."
                                    ? "cursor-default text-muted-foreground"
                                    : "border border-border hover:bg-muted text-foreground"
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                {/* Next button */}
                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("pagination.next")}
                >
                    <ChevronRight className="w-4 h-4 text-foreground" />
                </button>
            </div>
        </div>
    );
}
