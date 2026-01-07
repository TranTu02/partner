import { useState, useEffect } from "react";
import { X, Plus, Trash2, Copy } from "lucide-react";
import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";
import { getClientDetail } from "@/api/index";

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

    // Deconstruct invoiceInfo or initialize default
    const [invoiceInfo, setInvoiceInfo] = useState<{
        taxName?: string;
        taxCode?: string; // Often matches legalId but can be different
        taxAddress?: string;
        taxEmail?: string;
    }>(client.invoiceInfo || {});

    const [clientContacts, setClientContacts] = useState<any[]>(client.clientContacts || []);

    const [clientSaleScope, setClientSaleScope] = useState<"public" | "private">(client.clientSaleScope);

    // Fetch Details on Open
    useEffect(() => {
        if (isOpen && client.clientId) {
            getClientDetail({ query: { clientId: client.clientId } })
                .then((res) => {
                    if (res.success && res.data) {
                        const detailed = res.data as Client;
                        setClientName(detailed.clientName);
                        setLegalId(detailed.legalId);
                        setClientAddress(detailed.clientAddress);
                        setInvoiceEmail(detailed.invoiceEmail);
                        setInvoiceInfo(detailed.invoiceInfo || {});
                        setClientContacts(detailed.clientContacts || []);
                        setClientSaleScope(detailed.clientSaleScope as "public" | "private");
                    }
                })
                .catch((err) => console.error("Failed to fetch client detail", err));
        }
    }, [isOpen, client.clientId]);

    if (!isOpen) return null;

    const handleAddContact = () => {
        setClientContacts([...clientContacts, { contactName: "", contactPhone: "", contactEmail: "", contactPosition: "", contactAddress: "", contactId: undefined }]);
    };

    const handleRemoveContact = (index: number) => {
        const newContacts = [...clientContacts];
        newContacts.splice(index, 1);
        setClientContacts(newContacts);
    };

    const handleContactChange = (index: number, field: string, value: string) => {
        const newContacts = [...clientContacts];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setClientContacts(newContacts);
    };

    const handleCopyBasicInfo = () => {
        setInvoiceInfo({
            taxName: clientName,
            taxCode: legalId,
            taxAddress: clientAddress,
            taxEmail: invoiceEmail,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !legalId || !clientAddress) {
            alert(t("validation.fillAll"));
            return;
        }

        const updatedClient = {
            ...client,
            id: client.clientId,
            clientId: client.clientId,
            clientName,
            legalId,
            clientAddress,
            invoiceEmail,
            invoiceInfo, // Now passed as object
            clientContacts,
            clientSaleScope,
        };

        onConfirm(updatedClient);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-4xl min-w-[600px] shadow-xl border border-border max-h-[90vh] overflow-y-auto">
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
                    <div className="p-6 space-y-8">
                        {/* Basic Info Group */}
                        <div className="space-y-4">
                            <h3 className="text-base font-semibold text-primary border-b border-border pb-2">{t("client.basicInfo")}</h3>
                            <div className="grid grid-cols-2 gap-4">
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

                                <div className="col-span-2">
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

                                <div className="col-span-2">
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("client.invoiceEmail")}</label>
                                    <input
                                        type="email"
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                        value={invoiceEmail}
                                        onChange={(e) => setInvoiceEmail(e.target.value)}
                                        placeholder="email@company.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Invoice Info Group - Structured */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                                <h3 className="text-base font-semibold text-primary">{t("client.invoiceInfo")}</h3>
                                <button type="button" onClick={handleCopyBasicInfo} className="text-xs text-primary hover:underline flex items-center gap-1">
                                    <Copy className="w-3 h-3" />
                                    {t("client.copyBasicInfo")}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxName")}</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                        value={invoiceInfo.taxName || ""}
                                        onChange={(e) => setInvoiceInfo((prev) => ({ ...prev, taxName: e.target.value }))}
                                        placeholder={t("client.taxNamePlaceholder")}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxCode")}</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                        value={invoiceInfo.taxCode || ""}
                                        onChange={(e) => setInvoiceInfo((prev) => ({ ...prev, taxCode: e.target.value }))}
                                        placeholder={t("client.taxCodePlaceholder")}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxEmail")}</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                        value={invoiceInfo.taxEmail || ""}
                                        onChange={(e) => setInvoiceInfo((prev) => ({ ...prev, taxEmail: e.target.value }))}
                                        placeholder={t("client.taxEmailPlaceholder")}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxAddress")}</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                        value={invoiceInfo.taxAddress || ""}
                                        onChange={(e) => setInvoiceInfo((prev) => ({ ...prev, taxAddress: e.target.value }))}
                                        placeholder={t("client.taxAddressPlaceholder")}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contacts Group - Dynamic List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                                <h3 className="text-base font-semibold text-primary">{t("client.contacts")}</h3>
                                <button type="button" onClick={handleAddContact} className="flex items-center gap-1 text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded">
                                    <Plus className="w-3 h-3" /> {t("common.add")}
                                </button>
                            </div>

                            {clientContacts.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-2">{t("client.noContacts")}</p>}

                            <div className="space-y-3">
                                {clientContacts.map((contact, idx) => (
                                    <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border relative group">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveContact(idx)}
                                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder={t("client.contactPerson")}
                                                    value={contact.contactName}
                                                    onChange={(e) => handleContactChange(idx, "contactName", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder={t("client.position")}
                                                    value={contact.contactPosition || ""}
                                                    onChange={(e) => handleContactChange(idx, "contactPosition", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder={t("client.contactPhone")}
                                                    value={contact.contactPhone}
                                                    onChange={(e) => handleContactChange(idx, "contactPhone", e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder={t("client.contactEmail")}
                                                    value={contact.contactEmail}
                                                    onChange={(e) => handleContactChange(idx, "contactEmail", e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
                                                    placeholder={t("client.contactAddress")}
                                                    value={contact.contactAddress || ""}
                                                    onChange={(e) => handleContactChange(idx, "contactAddress", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Access Scope */}
                        <div className="space-y-4">
                            <h3 className="text-base font-semibold text-primary border-b border-border pb-2">{t("client.accessScope")}</h3>
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
                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mt-2">
                                <p className="text-xs text-blue-600">
                                    <strong>{t("common.note")}:</strong> {t("client.edit.note")}
                                </p>
                            </div>
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
