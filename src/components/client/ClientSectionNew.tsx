import { useState } from "react";
import { Search, Plus } from "lucide-react";
import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";

interface ClientSectionNewProps {
    clients: Client[];
    selectedClient: Client | null;
    contactPerson: string;
    contactPhone: string;
    contactIdentity: string;
    reportEmail: string;
    onClientChange: (client: Client | null) => void;
    onContactPersonChange: (name: string) => void;
    onContactPhoneChange: (phone: string) => void;
    onContactIdentityChange: (identity: string) => void;
    onReportEmailChange: (email: string) => void;
    onAddressChange: (address: string) => void;
    onAddNewClient: () => void;
    address: string;
    isReadOnly?: boolean;
}

export function ClientSectionNew({
    clients,
    selectedClient,
    contactPerson,
    contactPhone,
    contactIdentity,
    reportEmail,
    onClientChange,
    onContactPersonChange,
    onContactPhoneChange,
    onContactIdentityChange,
    onReportEmailChange,
    onAddressChange,
    onAddNewClient,
    address,
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
        <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground">{t("client.basicInfo")}</h3>

            <div className="space-y-4">
                {/* Row 1 */}
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
                            className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed text-sm disabled:opacity-50"
                            value={selectedClient?.legalId || ""}
                            readOnly
                            disabled
                        />
                    </div>
                </div>

                {/* Row 2 */}
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

                {/* Row 3 */}
                <div className="grid grid-cols-2 gap-4">
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
                        <label className="block mb-2 text-sm font-medium text-foreground">
                            {t("client.reportEmail")} <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={reportEmail}
                            onChange={(e) => onReportEmailChange(e.target.value)}
                            placeholder="email@company.com"
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
                        <label className="block mb-2 text-sm font-medium text-foreground">{t("client.contactIdentity")}</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            value={contactIdentity}
                            onChange={(e) => onContactIdentityChange(e.target.value)}
                            placeholder={t("client.contactIdentity")}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
