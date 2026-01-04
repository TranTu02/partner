import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Eye, Lock, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getClients, createClient, updateClient, deleteClient } from "@/api";
import type { Client } from "@/types/client"; // Ensure correct type import path
import { AddClientModal } from "@/components/client/AddClientModal";
import { ClientDetailModal } from "@/components/client/ClientDetailModal";
import { EditClientModal } from "@/components/client/EditClientModal";
import { MainLayout } from "@/components/layout/MainLayout";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";

interface ClientsPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function ClientsPage({ activeMenu, onMenuClick }: ClientsPageProps) {
    const { t } = useTranslation();
    const [clients, setClients] = useState<Client[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [isLoading, setIsLoading] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const fetchClients = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getClients({
                query: {
                    page,
                    itemsPerPage,
                    search: searchQuery || undefined,
                },
            });
            if (response.success && response.data) {
                setClients(response.data as Client[]);
                if (response.meta) {
                    setTotalPages(response.meta.totalPages || 1);
                    setTotalItems(response.meta.total || 0);
                }
            } else {
                toast.error("Failed to fetch clients");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error connecting to server");
        } finally {
            setIsLoading(false);
        }
    }, [page, searchQuery, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchClients();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [fetchClients]);

    const handleAddClient = async (newClientData: any) => {
        try {
            const response = await createClient({ body: newClientData });
            if (response.success) {
                toast.success(t("client.createSuccess"));
                setIsAddModalOpen(false);
                fetchClients(); // Refresh list
            } else {
                toast.error(response.error?.message || "Failed to create client");
            }
        } catch (error) {
            toast.error("Error creating client");
        }
    };

    const handleUpdateClient = async (updatedClient: any) => {
        try {
            const response = await updateClient({
                body: updatedClient,
            });
            if (response.success) {
                toast.success(t("client.updateSuccess"));
                setIsEditModalOpen(false);
                fetchClients(); // Refresh list
            } else {
                toast.error(response.error?.message || "Failed to update client");
            }
        } catch (error) {
            toast.error("Error updating client");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("client.confirmDelete"))) return;

        try {
            const response = await deleteClient({ body: { id } });
            if (response.success) {
                toast.success(t("client.deleteSuccess"));
                fetchClients(); // Refresh list
            } else {
                toast.error(response.error?.message || "Failed to delete client");
            }
        } catch (error) {
            toast.error("Error deleting client");
        }
    };

    const handleViewDetail = (client: Client) => {
        setSelectedClient(client);
        setIsDetailModalOpen(true);
    };

    const handleEdit = (client: Client) => {
        setSelectedClient(client);
        setIsEditModalOpen(true);
    };

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-xl font-bold text-foreground">{t("client.management")}</h1>
                <p className="text-sm text-muted-foreground">{t("client.subtitle")}</p>
            </div>
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                {t("client.add.title")}
            </button>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div>
                {/* Search Bar */}
                <div className="bg-card rounded-lg border border-border p-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("client.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-lg border border-border overflow-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("client.code")}</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("client.name")}</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("client.taxCode")}</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("client.totalRevenue")}</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-medium">{t("client.lastOrder")}</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-medium">{t("client.accessScope")}</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-medium">{t("common.action")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                        Loading...
                                    </td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                        {t("client.noClientsFound")}
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.clientId} className="border-t border-border hover:bg-muted">
                                        <td className="px-6 py-4 text-sm text-primary font-medium">{client.clientId}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-foreground">{client.clientName}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{client.legalId}</td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{client.totalOrderAmount?.toLocaleString("vi-VN") || 0} đ</td>
                                        <td className="px-6 py-4 text-center text-sm text-foreground">{client.lastOrder ? new Date(client.lastOrder).toLocaleDateString("vi-VN") : "-"}</td>
                                        <td className="px-6 py-4 text-center">
                                            {client.clientSaleScope === "public" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded text-xs">
                                                    <Globe className="w-3 h-3" />
                                                    {t("client.scope.public")}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning rounded text-xs">
                                                    <Lock className="w-3 h-3" />
                                                    {t("client.scope.private")}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewDetail(client)}
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title={t("client.details")}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(client)}
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title={t("common.edit")}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(client.clientId)}
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    title={t("common.delete")}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && clients.length > 0 && (
                    <Pagination 
                        currentPage={page} 
                        totalPages={totalPages} 
                        totalItems={totalItems} 
                        itemsPerPage={itemsPerPage} 
                        onPageChange={(p) => setPage(p)}
                        onItemsPerPageChange={(items) => {
                            setItemsPerPage(items);
                            setPage(1);
                        }}
                    />
                )}
            </div>

            <AddClientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onConfirm={handleAddClient} />

            {selectedClient && (
                <>
                    <ClientDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} client={selectedClient} />
                    <EditClientModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} client={selectedClient} onConfirm={handleUpdateClient} />
                </>
            )}
        </MainLayout>
    );
}
