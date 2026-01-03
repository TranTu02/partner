import { useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Client } from "@/types/client";

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (client: any) => void;
    currentIdentityId?: string;
}

export function AddClientModal({ isOpen, onClose, onConfirm, currentIdentityId = "ID001" }: AddClientModalProps) {
    const { t } = useTranslation();
    const [clientName, setClientName] = useState("");
    const [legalId, setLegalId] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [invoiceEmail, setInvoiceEmail] = useState("");
    const [invoiceInfo, setInvoiceInfo] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !legalId || !clientAddress) {
            alert(t("validation.fillAll"));
            return;
        }

        onConfirm({
            clientName,
            legalId,
            clientAddress,
            invoiceEmail: invoiceEmail || `invoice@${clientName.toLowerCase().replace(/\s+/g, "")}.com`,
            invoiceInfo: invoiceInfo || `${t("client.invoiceInfo")} ${clientName}`,
            clientSaleScope: "private",
            availableByIds: [currentIdentityId],
            totalOrderAmount: 0,
            contacts: [],
        });

        // Reset form
        setClientName("");
        setLegalId("");
        setClientAddress("");
        setInvoiceEmail("");
        setInvoiceInfo("");
    };

    const handleClose = () => {
        setClientName("");
        setLegalId("");
        setClientAddress("");
        setInvoiceEmail("");
        setInvoiceInfo("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-2xl min-w-[500px] shadow-xl border border-border">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">{t("client.add.title")}</h2>
                    <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("client.name")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder={t("client.searchPlaceholder")}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("client.taxCode")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={legalId}
                            onChange={(e) => setLegalId(e.target.value)}
                            placeholder={t("client.taxCode")}
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("client.address")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={clientAddress}
                            onChange={(e) => setClientAddress(e.target.value)}
                            placeholder={t("client.address")}
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.invoiceEmail")}</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={invoiceEmail}
                            onChange={(e) => setInvoiceEmail(e.target.value)}
                            placeholder="email@company.com"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.invoiceInfo")}</label>
                        <textarea
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            rows={3}
                            value={invoiceInfo}
                            onChange={(e) => setInvoiceInfo(e.target.value)}
                            placeholder={t("client.invoiceDetails")}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button type="button" onClick={handleClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors text-sm font-medium">
                            {t("common.cancel")}
                        </button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                            {t("client.add.submit")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
