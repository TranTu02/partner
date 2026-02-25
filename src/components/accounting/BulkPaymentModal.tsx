import { useState, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { updateOrder } from "@/api/index";

interface PaymentRow {
    id: string;
    orderId: string;
    totalPaid: string;
    paymentDate: string;
    status?: "pending" | "processing" | "success" | "error";
    error?: string;
}

interface BulkPaymentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkPaymentModal({ open, onClose, onSuccess }: BulkPaymentModalProps) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<PaymentRow[]>([
        { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10), orderId: "", totalPaid: "", paymentDate: "", status: "pending" },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    if (!open) return null;

    const addRow = () => {
        setRows([...rows, { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10), orderId: "", totalPaid: "", paymentDate: "", status: "pending" }]);
    };
    const removeRow = (id: string) => {
        if (rows.length === 1) return;
        setRows(rows.filter((row) => row.id !== id));
    };

    const updateRow = (id: string, field: keyof PaymentRow, value: string) => {
        setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    };

    // Format currency for display (with thousand separators)
    const formatCurrencyDisplay = (value: string) => {
        if (!value) return "";
        const numericValue = value.replace(/[^0-9]/g, "");
        if (!numericValue) return "";
        return parseInt(numericValue).toLocaleString("vi-VN");
    };

    // Handle currency input - strip non-numeric and store raw number
    const handleCurrencyInput = (id: string, value: string) => {
        const numericValue = value.replace(/[^0-9]/g, "");
        updateRow(id, "totalPaid", numericValue);
    };

    const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: keyof PaymentRow) => {
        if (e.key === "Enter" || e.key === "Tab") {
            // If on last row and last field, add new row
            if (rowIndex === rows.length - 1 && field === "paymentDate" && !e.shiftKey) {
                e.preventDefault();
                addRow();
                // Focus first cell of new row after render
                setTimeout(() => {
                    const inputs = tableContainerRef.current?.querySelectorAll("input");
                    if (inputs) {
                        const lastRowFirstInput = inputs[inputs.length - 3]; // 3 inputs per row
                        (lastRowFirstInput as HTMLInputElement)?.focus();
                    }
                }, 50);
            }
        }
    };

    // Handle paste from Excel/Google Sheets (TSV format)
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
        const clipboardData = e.clipboardData.getData("text");

        // Check if it looks like multi-cell paste (contains tabs or newlines)
        if (!clipboardData.includes("\t") && !clipboardData.includes("\n")) {
            // Single cell paste, let default behavior handle it
            return;
        }

        e.preventDefault();

        // Parse TSV data (tab-separated values, newline for rows)
        const pastedRows = clipboardData
            .split(/\r?\n/)
            .filter((line) => line.trim() !== "")
            .map((line) => line.split("\t"));

        if (pastedRows.length === 0) return;

        const fields: (keyof PaymentRow)[] = ["orderId", "totalPaid", "paymentDate"];
        const newRows = [...rows];

        pastedRows.forEach((pastedRow, pasteRowIdx) => {
            const targetRowIndex = rowIndex + pasteRowIdx;

            // Add new rows if needed
            while (newRows.length <= targetRowIndex) {
                newRows.push({ id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10), orderId: "", totalPaid: "", paymentDate: "", status: "pending" });
            }

            // Fill columns starting from the current column
            pastedRow.forEach((cellValue, pasteColIdx) => {
                const targetColIndex = colIndex + pasteColIdx;
                if (targetColIndex < fields.length) {
                    const field = fields[targetColIndex];
                    let processedValue = cellValue.trim();
                    // Clean currency values for totalPaid field
                    if (field === "totalPaid") {
                        processedValue = processedValue.replace(/[^0-9]/g, "");
                    }
                    // Normalize date format YYYY/MM/DD -> YYYY-MM-DD
                    if (field === "paymentDate") {
                        if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(processedValue)) {
                            processedValue = processedValue.replace(/\//g, "-");
                        }
                    }
                    newRows[targetRowIndex] = { ...newRows[targetRowIndex], [field]: processedValue };
                }
            });
        });

        setRows(newRows);
    };

    const getColIndex = (field: keyof PaymentRow): number => {
        const fields: (keyof PaymentRow)[] = ["orderId", "totalPaid", "paymentDate"];
        return fields.indexOf(field);
    };

    // Helper to parse date to ISO string
    const parsePaymentDate = (dateStr: string): string | undefined => {
        if (!dateStr || !dateStr.trim()) return undefined;
        const cleanStr = dateStr.trim();

        // Try YYYY-MM-DD or YYYY/MM/DD
        const ymdParts = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (ymdParts) {
            const year = parseInt(ymdParts[1], 10);
            const month = parseInt(ymdParts[2], 10);
            const day = parseInt(ymdParts[3], 10);
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date.toISOString();
        }

        // Try DD-MM-YYYY or DD/MM/YYYY
        const dmyParts = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmyParts) {
            const day = parseInt(dmyParts[1], 10);
            const month = parseInt(dmyParts[2], 10);
            const year = parseInt(dmyParts[3], 10);
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date.toISOString();
        }

        // Try standard Date parse
        const date = new Date(cleanStr);
        if (!isNaN(date.getTime())) return date.toISOString();

        return undefined;
    };

    const handleSubmit = async () => {
        // Filter out empty rows
        const validRowsIndices = rows.map((row, index) => ({ ...row, originalIndex: index })).filter((row) => row.orderId.trim() !== "");

        if (validRowsIndices.length === 0) {
            toast.error(t("accounting.bulkPayment.noData"));
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;
        let errorCount = 0;

        // Process sequentially
        for (const validRow of validRowsIndices) {
            const { id, orderId, totalPaid, paymentDate } = validRow;

            // Update status to processing
            setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "processing", error: undefined } : r)));

            // 1s Delay per request as requested
            await new Promise((resolve) => setTimeout(resolve, 1000));

            try {
                const updatedPaymentDate = parsePaymentDate(paymentDate);

                const response = await updateOrder({
                    body: {
                        orderId: orderId.trim(),
                        totalPaid: totalPaid ? parseFloat(totalPaid.replace(/[^0-9.-]/g, "")) : totalPaid === "0" ? null : undefined,
                        paymentDate: updatedPaymentDate,
                    },
                });

                if (response.success) {
                    successCount++;
                    // Update status to success (Green)
                    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "success", error: undefined } : r)));
                } else {
                    errorCount++;
                    const errorMsg = response.error?.message || "Failed";
                    // Update status to error (Red)
                    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "error", error: errorMsg } : r)));
                }
            } catch (error) {
                errorCount++;
                // Update status to error (Red)
                setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "error", error: "Error occurred" } : r)));
            }
        }

        setIsSubmitting(false);

        // Show summary toast
        if (successCount > 0) {
            toast.success(t("accounting.bulkPayment.successCount", { count: successCount }));
            onSuccess();
        }
        if (errorCount > 0) {
            toast.error(t("accounting.bulkPayment.errorCount", { count: errorCount }));
        }

        // Delay slightly before clearing successful rows so user can see the green state
        setTimeout(() => {
            setRows((prevRows) => {
                // Keep only rows that are NOT success (i.e., keep pending, error, or empty rows if any)
                // Actually we just want to remove the ones we successfully processed.
                // If there are errors, they stay.
                const nextRows = prevRows.filter((row) => row.status !== "success");

                if (nextRows.length === 0) {
                    // Reset to one empty row if all cleared
                    // Also close modal if everything was successful?
                    // The requirement says "xóa hết hàng xanh đi và giữ lại các hàng bị error".
                    // If no error rows left, we can arguably close or leave one empty row.
                    // Usually if all success, we might want to close.
                    // But let's stick to "delete successful rows".
                    return [{ id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10), orderId: "", totalPaid: "", paymentDate: "", status: "pending" }];
                }
                return nextRows;
            });

            // If complete success (no errors), close modal?
            // Requirement says "giữ lại các hàng bị error". If errorCount == 0, then we might auto close.
            if (errorCount === 0 && successCount > 0) {
                onClose();
            }
        }, 1000);
    };

    const handleClose = () => {
        setRows([{ id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10), orderId: "", totalPaid: "", paymentDate: "", status: "pending" }]);
        onClose();
    };

    // Helper for row styles
    const getRowClass = (row: PaymentRow) => {
        if (row.status === "success") return "bg-green-50 border-green-200";
        if (row.status === "error") return "bg-red-50 border-red-200";
        if (row.status === "processing") return "bg-blue-50 border-blue-200"; // Optional feedback for processing
        return "hover:bg-muted/30";
    };

    const getBorderClass = (row: PaymentRow) => {
        if (row.status === "success") return "border-green-300";
        if (row.status === "error") return "border-red-300";
        if (row.status === "processing") return "border-blue-300";
        return "border-border";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border" style={{ height: "80vh" }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground">{t("accounting.bulkPayment.title")}</h2>
                    <button onClick={handleClose} disabled={isSubmitting} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Table Container */}
                <div ref={tableContainerRef} className="flex-1 overflow-auto">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-muted">
                                <th className="border border-border px-4 py-3 text-left text-sm font-semibold text-foreground bg-muted w-12">#</th>
                                <th className="border border-border px-4 py-3 text-left text-sm font-semibold text-foreground bg-muted">{t("accounting.bulkPayment.orderId")}</th>
                                <th className="border border-border px-4 py-3 text-left text-sm font-semibold text-foreground bg-muted">{t("accounting.bulkPayment.amount")}</th>
                                <th className="border border-border px-4 py-3 text-left text-sm font-semibold text-foreground bg-muted">{t("accounting.bulkPayment.paymentDate")}</th>
                                <th className="border border-border px-4 py-3 text-center text-sm font-semibold text-foreground bg-muted w-28">{t("common.action")}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card">
                            {rows.map((row, index) => (
                                <tr key={row.id} className={getRowClass(row)}>
                                    <td className="border border-border px-4 py-2 text-sm text-muted-foreground text-center relative">
                                        {index + 1}
                                        {row.status === "error" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" title={row.error} />}
                                        {row.status === "success" && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}
                                    </td>
                                    <td className={`border p-0 ${getBorderClass(row)}`}>
                                        <input
                                            type="text"
                                            value={row.orderId}
                                            onChange={(e) => updateRow(row.id, "orderId", e.target.value)}
                                            onKeyDown={(e) => handleCellKeyDown(e, index, "orderId")}
                                            onPaste={(e) => handlePaste(e, index, getColIndex("orderId"))}
                                            disabled={isSubmitting || row.status === "success"}
                                            className="w-full px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground disabled:opacity-70"
                                            placeholder={t("accounting.bulkPayment.orderIdPlaceholder")}
                                        />
                                    </td>
                                    <td className={`border p-0 ${getBorderClass(row)}`}>
                                        <input
                                            type="text"
                                            value={formatCurrencyDisplay(row.totalPaid)}
                                            onChange={(e) => handleCurrencyInput(row.id, e.target.value)}
                                            onKeyDown={(e) => handleCellKeyDown(e, index, "totalPaid")}
                                            onPaste={(e) => handlePaste(e, index, getColIndex("totalPaid"))}
                                            disabled={isSubmitting || row.status === "success"}
                                            className="w-full px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground text-right disabled:opacity-70"
                                            placeholder={t("accounting.bulkPayment.amountPlaceholder")}
                                        />
                                    </td>
                                    <td className={`border p-0 ${getBorderClass(row)}`}>
                                        <input
                                            type="text"
                                            value={row.paymentDate}
                                            onChange={(e) => updateRow(row.id, "paymentDate", e.target.value)}
                                            onKeyDown={(e) => handleCellKeyDown(e, index, "paymentDate")}
                                            onPaste={(e) => handlePaste(e, index, getColIndex("paymentDate"))}
                                            disabled={isSubmitting || row.status === "success"}
                                            className="w-full px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground disabled:opacity-70"
                                            placeholder="YYYY-MM-DD"
                                        />
                                    </td>
                                    <td className={`border px-2 py-2 text-center ${getBorderClass(row)}`}>
                                        <div className="flex items-center justify-center gap-2">
                                            {row.error && (
                                                <span className="text-xs text-red-500 font-medium" title={row.error}>
                                                    Error
                                                </span>
                                            )}
                                            {row.status === "success" && <span className="text-xs text-green-600 font-medium">Done</span>}
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                disabled={rows.length === 1 || isSubmitting}
                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Add Row Button */}
                    <div className="p-4">
                        <button
                            onClick={addRow}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-dashed border-primary/50 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4" />
                            {t("accounting.bulkPayment.addRow")}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
                    <div className="text-sm text-muted-foreground">{t("accounting.bulkPayment.rowCount", { count: rows.filter((r) => r.orderId.trim()).length })}</div>
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors">
                            {t("common.cancel")}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? t("common.processing") : t("common.confirm")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
