import { useState } from "react";
import { Search, Plus } from "lucide-react";
import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";

interface ClientSectionNewProps {
    clients: Client[];
    selectedClient: Client | null;

    // Basic Info
    address: string;
    clientPhone?: string;
    clientEmail?: string;

    // Contact Info
    contactPerson: string;
    contactPhone: string;
    contactIdentity: string;
    contactEmail?: string;
    contactPosition?: string;
    contactAddress?: string;
    reportEmail: string;

    // Invoice Info
    taxName?: string;
    taxCode?: string;
    taxAddress?: string;
    taxEmail?: string;

    // Handlers
    onClientChange: (client: Client | null) => void;
    onAddressChange: (address: string) => void;
    onClientPhoneChange?: (val: string) => void;
    onClientEmailChange?: (val: string) => void;

    onContactPersonChange: (name: string) => void;
    onContactPhoneChange: (phone: string) => void;
    onContactIdentityChange: (identity: string) => void;
    onContactEmailChange?: (val: string) => void;
    onContactPositionChange?: (val: string) => void;
    onContactAddressChange?: (val: string) => void;
    onReportEmailChange: (email: string) => void;

    onTaxNameChange?: (val: string) => void;
    onTaxCodeChange?: (val: string) => void;
    onTaxAddressChange?: (val: string) => void;
    onTaxEmailChange?: (val: string) => void;

    onAddNewClient: () => void;
    isReadOnly?: boolean;
}

export function ClientSectionNew({
    clients,
    selectedClient,
    address,
    clientPhone = "",
    clientEmail = "",
    contactPerson,
    contactPhone,
    contactIdentity,
    contactEmail = "",
    contactPosition = "",
    contactAddress = "",
    reportEmail,
    taxName = "",
    taxCode = "",
    taxAddress = "",
    taxEmail = "",
    onClientChange,
    onAddressChange,
    onClientPhoneChange,
    onClientEmailChange,
    onContactPersonChange,
    onContactPhoneChange,
    onContactIdentityChange,
    onContactEmailChange,
    onContactPositionChange,
    onContactAddressChange,
    onReportEmailChange,
    onTaxNameChange,
    onTaxCodeChange,
    onTaxAddressChange,
    onTaxEmailChange,
    onAddNewClient,
    isReadOnly = false,
}: ClientSectionNewProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    const filteredClients = clients.filter((client) => client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || client.legalId.includes(searchQuery));

    const handleSelectClient = (client: Client) => {
        onClientChange(client);
        setSearchQuery(client.clientName);
        setShowDropdown(false);
    };

    return (
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            {/* Section 1: Basic Client Info */}
            <div>
                <h3 className="mb-4 text-base font-semibold text-primary border-b border-border pb-2">{t("client.basicInfo")}</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block mb-2 text-sm font-medium text-foreground">
                                {t("client.name")} <span className="text-destructive">*</span>
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={searchQuery || selectedClient?.clientName}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => !isReadOnly && setShowDropdown(true)}
                                    placeholder={t("client.searchPlaceholder")}
                                    disabled={isReadOnly}
                                />
                            </div>

                            {/* Dropdown */}
                            {showDropdown && searchQuery && !isReadOnly && (
                                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                                    {filteredClients.length > 0 ? (
                                        filteredClients.map((client) => (
                                            <div
                                                key={client.clientId}
                                                className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                                                onClick={() => handleSelectClient(client)}
                                            >
                                                <div className="text-sm font-medium text-foreground">{client.clientName}</div>
                                                <div className="text-xs text-muted-foreground">MST: {client.legalId}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-center">
                                            <p className="mb-2 text-sm text-muted-foreground">{t("client.noClientsFound")}</p>
                                            <button
                                                onClick={() => {
                                                    onAddNewClient();
                                                    setShowDropdown(false);
                                                }}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
                                            >
                                                <Plus className="w-4 h-4" />
                                                {t("client.add.title")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxCode")}</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground text-sm disabled:opacity-50"
                                value={selectedClient?.legalId || ""}
                                readOnly
                                disabled
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">
                                {t("client.address")} <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                value={address}
                                onChange={(e) => onAddressChange(e.target.value)}
                                placeholder={t("client.address")}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium text-foreground">{t("client.phone")}</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                value={clientPhone}
                                onChange={(e) => onClientPhoneChange?.(e.target.value)}
                                placeholder={t("client.phone")}
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Contact Info */}
            <div>
                <h3 className="mb-4 text-base font-semibold text-primary border-b border-border pb-2">{t("client.contactInfo")}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("client.contactPerson")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={contactPerson}
                            onChange={(e) => onContactPersonChange(e.target.value)}
                            placeholder={t("client.contactPerson")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.position")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={contactPosition}
                            onChange={(e) => onContactPositionChange?.(e.target.value)}
                            placeholder={t("client.position")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("client.contactPhone")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={contactPhone}
                            onChange={(e) => onContactPhoneChange(e.target.value)}
                            placeholder={t("client.contactPhone")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.contactEmail")}</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={contactEmail}
                            onChange={(e) => onContactEmailChange?.(e.target.value)}
                            placeholder={t("client.contactEmail")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("client.reportEmail")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={reportEmail}
                            onChange={(e) => onReportEmailChange(e.target.value)}
                            placeholder={t("client.reportEmail")}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: Invoice Info */}
            <div>
                <h3 className="mb-4 text-base font-semibold text-primary border-b border-border pb-2">{t("client.invoiceInfo")}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxName")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={taxName}
                            onChange={(e) => onTaxNameChange?.(e.target.value)}
                            placeholder={t("client.taxNamePlaceholder")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxCode")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={taxCode}
                            onChange={(e) => onTaxCodeChange?.(e.target.value)}
                            placeholder={t("client.taxCodePlaceholder")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxAddress")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={taxAddress}
                            onChange={(e) => onTaxAddressChange?.(e.target.value)}
                            placeholder={t("client.taxAddressPlaceholder")}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.taxEmail")}</label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={taxEmail}
                            onChange={(e) => onTaxEmailChange?.(e.target.value)}
                            placeholder={t("client.taxEmailPlaceholder")}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
