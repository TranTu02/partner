import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Loader2, Copy } from "lucide-react";
import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";
import { getClients } from "@/api";
import debounce from "lodash.debounce"; // Ensure you have this or implement a simple debounce

interface ClientSectionNewProps {
    clients: Client[]; // Still passed for initial data or fallback
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
    clients: _initialClients,
    selectedClient,
    address,
    clientPhone = "",
    clientEmail = "",
    contactPerson,
    contactPhone,
    contactEmail = "",
    contactPosition = "",
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
    onContactEmailChange,
    onContactPositionChange,
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
    const [isLoading, setIsLoading] = useState(false);

    // Server-side search state
    const [searchResults, setSearchResults] = useState<Client[]>([]);

    // Debounced search function
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSearch = useCallback(
        debounce(async (query: string) => {
            if (!query.trim()) {
                setSearchResults([]);
                return;
            }

            setIsLoading(true);
            try {
                // Assuming getClients supports a 'search' query param
                // Or we use 'otherFilters' if the API requires that specific format
                const response = await getClients({
                    query: {
                        page: 1,
                        itemsPerPage: 20, // Limit results
                        search: query,
                    },
                });

                if (response.success && response.data) {
                    // Check if response.data is the array directly or if it is inside a 'data' property (paginated)
                    const results = Array.isArray(response.data) ? response.data : (response.data as any)?.data && Array.isArray((response.data as any)?.data) ? (response.data as any)?.data : [];

                    setSearchResults(results as Client[]);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Failed to search clients:", error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 500),
        [],
    );

    useEffect(() => {
        if (showDropdown) {
            debouncedSearch(searchQuery);
        } else {
            // Do not clear results immediately to avoid flicker if just toggling
        }
    }, [searchQuery, showDropdown, debouncedSearch]);

    // Sync search query with selected client when it changes externally
    useEffect(() => {
        if (selectedClient) {
            setSearchQuery(selectedClient.clientName);
        }
        // If selectedClient becomes null, meaning was cleared externally, we might want to clear input?
        // But if cleared internally by typing, we don't want this to loop.
        // We only update if selectedClient exists.
    }, [selectedClient]);

    // Determine which list to show:
    // If we have search results from server, use them.
    // Otherwise, if we have initialClients (passed from parent), filter them client-side fallback (optional, but good if parent provided full list).
    // Given the request is "search server side", we prioritize server search results when searching.
    // If not searching, we show nothing or recent? Let's stick to search results logic.
    // const displayClients = searchResults.length > 0 ? searchResults : [];

    const handleSelectClient = (client: Client) => {
        onClientChange(client);
        setSearchQuery(client.clientName);
        setShowDropdown(false);
    };

    const handleCopyBasicInfo = () => {
        onTaxNameChange?.(selectedClient?.clientName || searchQuery);
        onTaxCodeChange?.(selectedClient?.legalId || "");
        onTaxAddressChange?.(address);
        onTaxEmailChange?.(clientEmail || "");
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
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(true);
                                        // If cleared, allow selection to be cleared or just let user search new
                                        if (!e.target.value && selectedClient) {
                                            onClientChange(null);
                                        }
                                    }}
                                    onFocus={() => {
                                        if (!isReadOnly) {
                                            setShowDropdown(true);
                                            // Trigger search if empty or existing
                                            debouncedSearch(searchQuery);
                                        }
                                    }}
                                    // Blur needs care, clicking dropdown item might trigger blur first.
                                    // Usually solved by using onMouseDown on the dropdown items or a click outside hook.
                                    // For simplicity, we won't auto-close on blur instantly to allow click to register.
                                    // Better: use a ClickOutside wrapper.
                                    placeholder={t("client.searchPlaceholder")}
                                    disabled={isReadOnly}
                                />
                                {isLoading && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* Dropdown */}
                            {showDropdown && searchQuery && !isReadOnly && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                                    {isLoading ? (
                                        <div className="px-4 py-3 text-center">
                                            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((client) => (
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
                            {/* Overlay to close dropdown when clicking outside - simple version */}
                            {showDropdown && <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowDropdown(false)} />}
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
                                value={address || ""}
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
                                value={clientPhone || ""}
                                onChange={(e) => onClientPhoneChange?.(e.target.value)}
                                placeholder={t("client.phone")}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block mb-2 text-sm font-medium text-foreground">{t("client.email")}</label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                value={clientEmail || ""}
                                onChange={(e) => onClientEmailChange?.(e.target.value)}
                                placeholder={t("client.emailPlaceholder", "Email")}
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
                <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                    <h3 className="text-base font-semibold text-primary">{t("client.invoiceInfo")}</h3>
                    {!isReadOnly && (
                        <button type="button" onClick={handleCopyBasicInfo} className="text-xs text-primary hover:underline flex items-center gap-1">
                            <Copy className="w-3 h-3" />
                            {t("client.copyBasicInfo")}
                        </button>
                    )}
                </div>
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
