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
    error?: string;
}

interface BulkPaymentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkPaymentModal({ open, onClose, onSuccess }: BulkPaymentModalProps) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<PaymentRow[]>([{ id: crypto.randomUUID(), orderId: "", totalPaid: "", paymentDate: "" }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    if (!open) return null;

    const addRow = () => {
        setRows([...rows, { id: crypto.randomUUID(), orderId: "", totalPaid: "", paymentDate: "" }]);
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
                newRows.push({ id: crypto.randomUUID(), orderId: "", totalPaid: "", paymentDate: "" });
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

        // Try DD-MM-YYYY or DD/MM/YYYY
        const parts = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (parts) {
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10);
            const year = parseInt(parts[3], 10);
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
        const validRows = rows.filter((row) => row.orderId.trim() !== "");

        if (validRows.length === 0) {
            toast.error(t("accounting.bulkPayment.noData"));
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;
        let errorCount = 0;
        const successIds: string[] = [];
        const failedRowsUpdates: Record<string, string> = {}; // map id -> error message

        for (const row of validRows) {
            try {
                const updatedPaymentDate = parsePaymentDate(row.paymentDate);

                // If user entered a date but we couldn't parse it, consider it an error?
                // Or just ignore? Let's assume if they entered something, they want a date.
                // But for now, if undefined, we just don't send it or send undefined.

                const response = await updateOrder({
                    body: {
                        orderId: row.orderId.trim(),
                        totalPaid: row.totalPaid ? parseFloat(row.totalPaid.replace(/[^0-9.-]/g, "")) : row.totalPaid === "0" ? null : undefined,
                        paymentDate: updatedPaymentDate,
                    },
                });

                if (response.success) {
                    successCount++;
                    successIds.push(row.id);
                } else {
                    errorCount++;
                    failedRowsUpdates[row.id] = response.error?.message || "Failed";
                    console.error(`Failed to update order ${row.orderId}:`, response.error);
                }
            } catch (error) {
                errorCount++;
                failedRowsUpdates[row.id] = "Error occurred";
                console.error(`Error updating order ${row.orderId}:`, error);
            }
        }

        setIsSubmitting(false);

        // Update rows: Remove successful ones, update errors on failed ones
        setRows((prevRows) => {
            const nextRows = prevRows
                .filter((row) => !successIds.includes(row.id))
                .map((row) => {
                    if (failedRowsUpdates[row.id]) {
                        return { ...row, error: failedRowsUpdates[row.id] };
                    }
                    return row;
                });

            if (nextRows.length === 0) {
                return [{ id: crypto.randomUUID(), orderId: "", totalPaid: "", paymentDate: "" }];
            }
            return nextRows;
        });

        if (successCount > 0) {
            toast.success(t("accounting.bulkPayment.successCount", { count: successCount }));
            onSuccess();
        }
        if (errorCount > 0) {
            toast.error(t("accounting.bulkPayment.errorCount", { count: errorCount }));
        }

        if (successCount > 0 && errorCount === 0) {
            onClose();
        }
    };

    const handleClose = () => {
        setRows([{ id: crypto.randomUUID(), orderId: "", totalPaid: "", paymentDate: "" }]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border" style={{ height: "80vh" }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground">{t("accounting.bulkPayment.title")}</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
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
                                <tr key={row.id} className={`hover:bg-muted/30 ${row.error ? "bg-red-50 border-red-200" : ""}`}>
                                    <td className="border border-border px-4 py-2 text-sm text-muted-foreground text-center relative">
                                        {index + 1}
                                        {row.error && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" title={row.error} />}
                                    </td>
                                    <td className={`border p-0 ${row.error ? "border-red-300" : "border-border"}`}>
                                        <input
                                            type="text"
                                            value={row.orderId}
                                            onChange={(e) => updateRow(row.id, "orderId", e.target.value)}
                                            onKeyDown={(e) => handleCellKeyDown(e, index, "orderId")}
                                            onPaste={(e) => handlePaste(e, index, getColIndex("orderId"))}
                                            className="w-full px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
                                            placeholder={t("accounting.bulkPayment.orderIdPlaceholder")}
                                        />
                                    </td>
                                    <td className={`border p-0 ${row.error ? "border-red-300" : "border-border"}`}>
                                        <input
                                            type="text"
                                            value={formatCurrencyDisplay(row.totalPaid)}
                                            onChange={(e) => handleCurrencyInput(row.id, e.target.value)}
                                            onKeyDown={(e) => handleCellKeyDown(e, index, "totalPaid")}
                                            onPaste={(e) => handlePaste(e, index, getColIndex("totalPaid"))}
                                            className="w-full px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground text-right"
                                            placeholder={t("accounting.bulkPayment.amountPlaceholder")}
                                        />
                                    </td>
                                    <td className={`border p-0 ${row.error ? "border-red-300" : "border-border"}`}>
                                        <input
                                            type="text"
                                            value={row.paymentDate}
                                            onChange={(e) => updateRow(row.id, "paymentDate", e.target.value)}
                                            onKeyDown={(e) => handleCellKeyDown(e, index, "paymentDate")}
                                            onPaste={(e) => handlePaste(e, index, getColIndex("paymentDate"))}
                                            className="w-full px-4 py-2 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-foreground"
                                            placeholder="DD-MM-YYYY"
                                        />
                                    </td>
                                    <td className={`border px-2 py-2 text-center ${row.error ? "border-red-300" : "border-border"}`}>
                                        <div className="flex items-center justify-center gap-2">
                                            {row.error && (
                                                <span className="text-xs text-red-500 font-medium" title={row.error}>
                                                    Error
                                                </span>
                                            )}
                                            <button
                                                onClick={() => removeRow(row.id)}
                                                disabled={rows.length === 1}
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
                            className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-dashed border-primary/50 rounded-lg hover:bg-primary/10 transition-colors"
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
