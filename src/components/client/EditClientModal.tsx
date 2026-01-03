import { useState } from "react";
import { X } from "lucide-react";
import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";

interface EditClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
    onConfirm: (updatedClient: any) => void;
}

export function EditClientModal({ isOpen, onClose, client, onConfirm }: EditClientModalProps) {
    const { t } = useTranslation();
    const [clientName, setClientName] = useState(client.clientName);
    const [legalId, setLegalId] = useState(client.legalId);
    const [clientAddress, setClientAddress] = useState(client.clientAddress);
    const [invoiceEmail, setInvoiceEmail] = useState(client.invoiceEmail);
    const [invoiceInfo, setInvoiceInfo] = useState(client.invoiceInfo);
    const [clientSaleScope, setClientSaleScope] = useState<"public" | "private">(client.clientSaleScope);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !legalId || !clientAddress) {
            alert(t("validation.fillAll"));
            return;
        }

        const updatedClient = {
            ...client, // Keep existing fields
            id: client.clientId, // Ensure ID is passed contextually if needed for API (API expects 'id' in body usually, or passed separately)
            // Wait, updateClient API expects { id: "...", ...updates }.
            // My previous ClientsPage code calls updateClient({ body: updatedClient }).
            // So I should ensure 'id' or 'clientId' is present.
            // The API usually maps clientId to id or vice versa depending on backend.
            // Let's assume the backend handles the ID from the body or query.
            // My API implementation: updateClient = api.post("/v1/client/edit", { body })
            // So body should contain the ID.
            // Client type has `clientId`. I should probably ensure `id` is also set or the backend accepts `clientId`.
            // User's DATABASE.md uses `clientId`. My API Docs used `id` in Input for Edit.
            // I will include both to be safe or map it.
            id: client.clientId,
            clientId: client.clientId,
            clientName,
            legalId,
            clientAddress,
            invoiceEmail,
            invoiceInfo,
            clientSaleScope,
        };

        onConfirm(updatedClient);
        // onClose is called by parent on success, or should be?
        // In ClientsPage, I wrote: setIsEditModalOpen(false) on success.
        // But here I see onClose() called at the end of handleSubmit.
        // If I keep onClose() here, the modal closes immediately before API finishes.
        // That's standard for optmistic UI or simple flows. I'll remove onClose() here and let Parent handle it?
        // No, current logic in ClientsPage handles closing.
        // But wait, the previous code called onClose() here.
        // I should probably remove onClose() from here and let the parent decide when to close (on success),
        // or keep it if we don't care about loading state in modal.
        // Given I added toast and async in parent, let's NOT close here instantly.
        // But `onConfirm` is passed as `(updatedClient) => void`.
        // I will NOT call onClose() here. I will let the parent close it.
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-2xl min-w-[500px] shadow-xl border border-border max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{t("client.edit.title")}</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("client.code")}: <span className="text-primary font-semibold">{client.clientId}</span>
                            </p>
                        </div>
                        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
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

                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">{t("client.accessScope")}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="public"
                                        checked={clientSaleScope === "public"}
                                        onChange={(e) => setClientSaleScope(e.target.value as "public")}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    {t("client.scope.public")}
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                                    <input
                                        type="radio"
                                        name="scope"
                                        value="private"
                                        checked={clientSaleScope === "private"}
                                        onChange={(e) => setClientSaleScope(e.target.value as "private")}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    {t("client.scope.private")}
                                </label>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                            <p className="text-xs text-blue-600">
                                <strong>{t("common.note")}:</strong> {t("client.edit.note")}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-border sticky bottom-0 bg-card">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors text-sm font-medium">
                            {t("common.cancel")}
                        </button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                            {t("common.saveChanges")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
