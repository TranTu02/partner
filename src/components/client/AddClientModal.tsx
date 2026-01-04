import { useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Client, ClientContact, InvoiceInfo } from "@/types/client";

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (client: any) => void;
    currentIdentityId?: string;
}

export function AddClientModal({ isOpen, onClose, onConfirm, currentIdentityId = "ID001" }: AddClientModalProps) {
    const { t } = useTranslation();

    // Basic Info
    const [clientName, setClientName] = useState("");
    const [legalId, setLegalId] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [invoiceEmail, setInvoiceEmail] = useState("");

    // Invoice Info
    const [taxName, setTaxName] = useState("");
    const [taxCode, setTaxCode] = useState("");
    const [taxAddress, setTaxAddress] = useState("");
    const [taxEmail, setTaxEmail] = useState("");

    // Contact Info (Primary)
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPosition, setContactPosition] = useState("");
    const [contactAddress, setContactAddress] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !clientAddress) {
            alert(t("validation.fillAll"));
            return;
        }

        const invoiceInfo: InvoiceInfo = {
            taxName: taxName || clientName,
            taxCode: taxCode || legalId,
            taxAddress: taxAddress || clientAddress,
            taxEmail: taxEmail || invoiceEmail || "", // Use taxEmail, fallback to invoiceEmail
        };

        const primaryContact: ClientContact = {
            contactId: `C-${Date.now()}`,
            contactName: contactName,
            contactPhone: contactPhone,
            contactEmail: contactEmail,
            contactPosition: contactPosition,
            contactAddress: contactAddress,
            identityId: currentIdentityId,
        };

        const newClient: Partial<Client> = {
            clientName,
            legalId,
            clientAddress,
            clientPhone,
            invoiceEmail: invoiceEmail || contactEmail || "",
            invoiceInfo,
            clientSaleScope: "private",
            availableByIds: [currentIdentityId],
            totalOrderAmount: 0,
            clientContacts: contactName ? [primaryContact] : [],
        };

        onConfirm(newClient);
        handleClose();
    };

    const handleClose = () => {
        // Reset all states
        setClientName("");
        setLegalId("");
        setClientAddress("");
        setClientPhone("");
        setInvoiceEmail("");
        setTaxName("");
        setTaxCode("");
        setTaxAddress("");
        setTaxEmail("");
        setContactName("");
        setContactPhone("");
        setContactEmail("");
        setContactPosition("");
        setContactAddress("");

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-4xl min-w-[600px] shadow-xl border border-border max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="text-xl font-bold text-foreground">{t("client.add.title")}</h2>
                    <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Section 1: Basic Info */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-primary">{t("client.basicInfo")}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block mb-2 text-sm font-medium text-foreground">
                                    {t("client.name")} <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder={t("client.searchPlaceholder")}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxCode")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={legalId}
                                    onChange={(e) => setLegalId(e.target.value)}
                                    placeholder={t("client.taxCode")}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.phone")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    placeholder={t("client.phone")}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block mb-2 text-sm font-medium text-foreground">
                                    {t("client.address")} <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={clientAddress}
                                    onChange={(e) => setClientAddress(e.target.value)}
                                    placeholder={t("client.address")}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.invoiceEmail")}</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={invoiceEmail}
                                    onChange={(e) => setInvoiceEmail(e.target.value)}
                                    placeholder="email@company.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-4"></div>

                    {/* Section 2: Contact Info */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-primary">{t("client.contactInfo")}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.contactPerson")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    placeholder={t("client.contactPerson")}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.position")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={contactPosition}
                                    onChange={(e) => setContactPosition(e.target.value)}
                                    placeholder={t("client.position")}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.contactPhone")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    placeholder={t("client.contactPhone")}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.contactEmail")}</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    placeholder={t("client.contactEmail")}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.contactAddress")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={contactAddress}
                                    onChange={(e) => setContactAddress(e.target.value)}
                                    placeholder={t("client.contactAddress")}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border pt-4"></div>

                    {/* Section 3: Invoice Info */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-primary">{t("client.invoiceInfo")}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxName")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={taxName}
                                    onChange={(e) => setTaxName(e.target.value)}
                                    placeholder={t("client.taxNamePlaceholder")}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxCode")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={taxCode}
                                    onChange={(e) => setTaxCode(e.target.value)}
                                    placeholder={t("client.taxCodePlaceholder")}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxAddress")}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={taxAddress}
                                    onChange={(e) => setTaxAddress(e.target.value)}
                                    placeholder={t("client.taxAddressPlaceholder")}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxEmail")}</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                                    value={taxEmail}
                                    onChange={(e) => setTaxEmail(e.target.value)}
                                    placeholder={t("client.taxEmailPlaceholder")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 sticky bottom-0 bg-card z-10">
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
