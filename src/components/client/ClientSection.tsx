import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";

interface ClientSectionProps {
    clients: Client[];
    selectedClient: Client | null;
    selectedContactId: string;
    reportEmail: string;
    onClientChange: (client: Client | null) => void;
    onContactChange: (contactId: string) => void;
    onReportEmailChange: (email: string) => void;
    onAddressChange: (address: string) => void;
    address: string;
}

export function ClientSection({ clients, selectedClient, selectedContactId, reportEmail, onClientChange, onContactChange, onReportEmailChange, onAddressChange, address }: ClientSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-white rounded-lg border border-[#d9d9d9] p-6">
            <h3 className="mb-4" style={{ fontSize: "16px", fontWeight: 600 }}>
                {t("client.basicInfo")}
            </h3>

            <div className="space-y-4">
                {/* Row 1 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500, color: "rgba(0, 0, 0, 0.85)" }}>
                            {t("client.name")} <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg bg-white focus:border-[#1890FF] focus:outline-none focus:ring-1 focus:ring-[#1890FF]"
                            style={{ fontSize: "14px" }}
                            value={selectedClient?.clientId || ""}
                            onChange={(e) => {
                                const client = clients.find((c) => c.clientId === e.target.value);
                                onClientChange(client || null);
                            }}
                        >
                            <option value="">{t("client.selectClient")}...</option>
                            {clients.map((client) => (
                                <option key={client.clientId} value={client.clientId}>
                                    {client.clientName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500, color: "rgba(0, 0, 0, 0.85)" }}>
                            {t("client.taxCode")}
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg bg-gray-50 cursor-not-allowed"
                            style={{ fontSize: "14px" }}
                            value={selectedClient?.legalId || ""}
                            readOnly
                            disabled
                        />
                    </div>
                </div>

                {/* Row 2 */}
                <div>
                    <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500, color: "rgba(0, 0, 0, 0.85)" }}>
                        {t("client.address")} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg focus:border-[#1890FF] focus:outline-none focus:ring-1 focus:ring-[#1890FF]"
                        style={{ fontSize: "14px" }}
                        value={address}
                        onChange={(e) => onAddressChange(e.target.value)}
                        placeholder={t("client.address")}
                    />
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500, color: "rgba(0, 0, 0, 0.85)" }}>
                            {t("client.contactPerson")} <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg bg-white focus:border-[#1890FF] focus:outline-none focus:ring-1 focus:ring-[#1890FF]"
                            style={{ fontSize: "14px" }}
                            value={selectedContactId}
                            onChange={(e) => onContactChange(e.target.value)}
                            disabled={!selectedClient}
                        >
                            <option value="">{t("client.selectContact")}...</option>
                            {((selectedClient as any)?.contacts || (selectedClient as any)?.clientContacts || []).map((contact: any, index: number) => (
                                <option key={index} value={contact.name || contact.contactName}>
                                    {contact.name || contact.contactName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500, color: "rgba(0, 0, 0, 0.85)" }}>
                            {t("client.reportEmail")} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg focus:border-[#1890FF] focus:outline-none focus:ring-1 focus:ring-[#1890FF]"
                            style={{ fontSize: "14px" }}
                            value={reportEmail}
                            onChange={(e) => onReportEmailChange(e.target.value)}
                            placeholder="email@company.com"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
