import { X, Mail, MapPin, FileText, DollarSign, Calendar, Globe, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Client } from "@/types/client";

interface ClientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
}

export function ClientDetailModal({ isOpen, onClose, client }: ClientDetailModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl min-w-[600px] shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#d9d9d9] sticky top-0 bg-white z-10">
                    <div>
                        <h2 style={{ fontSize: "20px", fontWeight: 700 }}>{t("client.details")}</h2>
                        <p style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.45)", marginTop: "4px" }}>
                            {t("client.code")}: <span style={{ color: "#1890FF", fontWeight: 600 }}>{client.clientId}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>{t("client.basicInfo")}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", marginBottom: "4px" }}>{t("client.name")}</div>
                                <div style={{ fontSize: "14px", fontWeight: 500 }}>{client.clientName}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", marginBottom: "4px" }}>{t("client.taxCode")}</div>
                                <div style={{ fontSize: "14px", fontWeight: 500 }}>{client.legalId}</div>
                            </div>
                            <div className="col-span-2">
                                <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", marginBottom: "4px" }}>
                                    <MapPin className="w-3 h-3 inline-block mr-1" />
                                    {t("client.address")}
                                </div>
                                <div style={{ fontSize: "14px" }}>{client.clientAddress}</div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Info */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>
                            <FileText className="w-4 h-4 inline-block mr-2" />
                            {t("client.invoiceInfo")}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", marginBottom: "4px" }}>
                                    <Mail className="w-3 h-3 inline-block mr-1" />
                                    {t("client.invoiceEmail")}
                                </div>
                                <div style={{ fontSize: "14px", color: "#1890FF" }}>{client.invoiceEmail || client.clientEmail}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", marginBottom: "4px" }}>{t("client.taxName")}</div>
                                    <div style={{ fontSize: "14px" }}>{client.invoiceInfo?.taxName || "-"}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", marginBottom: "4px" }}>{t("client.taxCode")}</div>
                                    <div style={{ fontSize: "14px" }}>{client.invoiceInfo?.taxCode || "-"}</div>
                                </div>
                                <div className="col-span-2">
                                    <div style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", marginBottom: "4px" }}>{t("client.taxAddress")}</div>
                                    <div style={{ fontSize: "14px" }}>{client.invoiceInfo?.taxAddress || "-"}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Business Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-blue-600" />
                                <div style={{ fontSize: "12px", color: "#1890FF" }}>{t("client.totalRevenue")}</div>
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1890FF" }}>{client.totalOrderAmount.toLocaleString("vi-VN")} đ</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-green-600" />
                                <div style={{ fontSize: "12px", color: "#52C41A" }}>{t("client.lastOrder")}</div>
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 600, color: "#52C41A" }}>{client.lastOrder ? new Date(client.lastOrder).toLocaleDateString("vi-VN") : "Chưa có"}</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                                {client.clientSaleScope === "public" ? <Globe className="w-4 h-4 text-orange-600" /> : <Lock className="w-4 h-4 text-orange-600" />}
                                <div style={{ fontSize: "12px", color: "#FA8C16" }}>{t("client.accessScope")}</div>
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 600, color: "#FA8C16" }}>{client.clientSaleScope === "public" ? t("client.scope.public") : t("client.scope.private")}</div>
                        </div>
                    </div>

                    {/* Access Control */}
                    {client.clientSaleScope === "private" && (
                        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px", color: "#FA8C16" }}>
                                <Lock className="w-4 h-4 inline-block mr-2" />
                                {t("client.accessControl")}
                            </h3>
                            <div style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.65)" }}>{t("client.identityIds")}:</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {client.availableByIds.map((id) => (
                                    <span key={id} className="px-3 py-1 bg-white rounded border border-orange-300" style={{ fontSize: "12px", fontWeight: 500, color: "#FA8C16" }}>
                                        {id}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Contacts */}
                    <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                            {t("client.contacts")} ({client.clientContacts?.length || 0})
                        </h3>
                        {!client.clientContacts || client.clientContacts.length === 0 ? (
                            <div className="text-center py-8 text-gray-400" style={{ fontSize: "14px" }}>
                                {t("client.noContacts")}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {client.clientContacts.map((contact, index: number) => (
                                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>{contact.contactName}</div>
                                        {contact.contactPhone && <div style={{ fontSize: "13px", color: "#666", marginBottom: "2px" }}>{contact.contactPhone}</div>}
                                        {contact.contactEmail && (
                                            <div style={{ fontSize: "14px", color: "#1890FF" }}>
                                                <Mail className="w-3 h-3 inline-block mr-1" />
                                                {contact.contactEmail}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-[#d9d9d9] sticky bottom-0 bg-white">
                    <button onClick={onClose} className="px-4 py-2 bg-[#1890FF] text-white rounded-lg hover:bg-[#0d7ae0] transition-colors" style={{ fontSize: "14px", fontWeight: 500 }}>
                        {t("common.close")}
                    </button>
                </div>
            </div>
        </div>
    );
}
