import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, MapPin, ShoppingCart, FileText, Clock, CheckCircle, ArrowRight, Pencil, Plus, X, Save, Loader2, User, Users, ShieldCheck, DollarSign, Calendar, Trash2 } from "lucide-react";
import { customerMe, customerGetOrders, customerUpdateProfile } from "@/api/customer";
import { toast } from "sonner";

export function CustomerDashboardPage() {
    const navigate = useNavigate();
    const [client, setClient] = useState<any>(null);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalQuotes: 0, totalOrders: 0, processing: 0, completed: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddContact = () => {
        const newContacts = [...(editForm?.clientContacts || []), { contactName: "", contactPhone: "", contactEmail: "", contactAddress: "", contactId: "" }];
        setEditForm({ ...editForm, clientContacts: newContacts });
    };

    const handleRemoveContact = (index: number) => {
        const newContacts = [...(editForm?.clientContacts || [])];
        newContacts.splice(index, 1);
        setEditForm({ ...editForm, clientContacts: newContacts });
    };

    const handleContactChange = (index: number, field: string, value: string) => {
        const newContacts = [...(editForm?.clientContacts || [])];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setEditForm({ ...editForm, clientContacts: newContacts });
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [profileRes, ordersRes] = await Promise.all([
                customerMe({}), // GET /customer/v1/auth/me — authoritative client profile
                customerGetOrders({ query: { page: 1, itemsPerPage: 8 } }),
            ]);

            if (profileRes.success && profileRes.data) {
                // me returns identity or the profile directly
                const profile = profileRes.data?.identity || profileRes.data;
                setClient(profile);
                setEditForm(profile);
                // Keep localStorage in sync
                localStorage.setItem("customer", JSON.stringify(profile));
            }

            if (ordersRes.success && ordersRes.data) {
                setRecentOrders(Array.isArray(ordersRes.data) ? ordersRes.data.slice(0, 8) : []);
                const all = Array.isArray(ordersRes.data) ? ordersRes.data : [];
                const totalOrders = ordersRes.meta?.total || all.length;
                const processing = all.filter((o: any) => o.orderStatus === "Processing" || o.orderStatus === "Pending").length;
                const completed = all.filter((o: any) => o.orderStatus === "Completed" || o.orderStatus === "Done").length;
                setStats({ totalQuotes: 0, totalOrders, processing, completed });
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Không thể tải dữ liệu");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            // Ensure invoiceInfo is flat for update if API expects it that way,
            // or keep nested if that's the structure.
            const res = await customerUpdateProfile({ body: editForm });
            if (res.success) {
                toast.success("Cập nhật thông tin thành công");
                setClient(editForm);
                setIsEditModalOpen(false);

                const customerStr = localStorage.getItem("customer");
                if (customerStr) {
                    const customer = JSON.parse(customerStr);
                    localStorage.setItem("customer", JSON.stringify({ ...customer, clientName: editForm.clientName }));
                }
            } else {
                toast.error(res.error?.message || "Lỗi cập nhật thông tin");
            }
        } catch {
            toast.error("Lỗi kết nối server");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const statusColors: Record<string, string> = {
        Processing: "bg-blue-100 text-blue-700 border-blue-200",
        Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
        Completed: "bg-green-100 text-green-700 border-green-200",
        Done: "bg-green-100 text-green-700 border-green-200",
        Cancelled: "bg-red-100 text-red-700 border-red-200",
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Tổng quan</h1>
                    <p className="text-sm text-muted-foreground">Chào mừng bạn quay lại, {client?.clientName || "Khách hàng"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate("/customer/quotes")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo báo giá
                    </button>
                    <button
                        onClick={() => navigate("/customer/orders")}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Tạo đơn hàng
                    </button>
                </div>
            </div>

            {/* Company Info Detailed Profile */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="bg-muted/30 px-6 py-4 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Chi tiết khách hàng</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mã KH:</span>
                            <span className="text-xs font-mono font-bold text-primary">{client?.clientId || "—"}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditForm(client);
                            setIsEditModalOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors border border-border flex items-center gap-2 text-xs font-medium"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Chỉnh sửa
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Main Client Info */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                            <DetailItem label="Tên khách hàng" value={client?.clientName} />
                            <DetailItem label="Mã số thuế" value={client?.legalId || client?.invoiceInfo?.taxCode} />
                            <div className="md:col-span-2">
                                <DetailItem label="Địa chỉ" value={client?.clientAddress} icon={MapPin} />
                            </div>
                        </div>
                    </div>

                    {/* Billing Info Section */}
                    <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                        <SectionTitle icon={FileText} title="Thông tin hóa đơn" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12 mt-4">
                            <div className="md:col-span-2">
                                <DetailItem label="Email hóa đơn" value={client?.invoiceInfo?.taxEmail} icon={Mail} />
                            </div>
                            <DetailItem label="Tên công ty (HĐ)" value={client?.invoiceInfo?.taxName || client?.clientName} />
                            <DetailItem label="Mã số thuế" value={client?.invoiceInfo?.taxCode || client?.legalId} />
                            <div className="md:col-span-2">
                                <DetailItem label="Địa chỉ (HĐ)" value={client?.invoiceInfo?.taxAddress || client?.clientAddress} icon={MapPin} />
                            </div>
                        </div>
                    </div>

                    {/* Mini Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <MiniStatBox label="Tổng doanh thu" value={`${Math.ceil(client?.totalRevenue || 0).toLocaleString("vi-VN")} đ`} icon={DollarSign} color="blue" />
                        <MiniStatBox label="Đơn hàng cuối" value={client?.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString("vi-VN") : "Chưa có"} icon={Calendar} color="green" />
                        <MiniStatBox label="Phạm vi truy cập" value={client?.accessScope || "Private"} icon={ShieldCheck} color="orange" />
                    </div>

                    {/* Contacts & Responsibles */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Contacts List */}
                        <div className="space-y-3">
                            <SectionTitle icon={Users} title={`Người liên hệ (${client?.clientContacts?.length || 0})`} />
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {(client?.clientContacts || []).length > 0 ? (
                                    client.clientContacts.map((contact: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-muted/20 border border-border rounded-xl">
                                            <p className="text-sm font-bold text-foreground">{contact.contactName || contact.name || "—"}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{contact.contactPhone || contact.phone || "—"}</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                {contact.contactId && <p className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">ID: {contact.contactId}</p>}
                                                {contact.contactEmail && <p className="text-[10px] text-primary truncate">{contact.contactEmail}</p>}
                                            </div>
                                            {contact.contactAddress && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{contact.contactAddress}</p>}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Chưa có người liên hệ</p>
                                )}
                            </div>
                        </div>

                        {/* Assignees (availableByName) */}
                        <div className="space-y-3">
                            <SectionTitle icon={User} title="Thông tin phụ trách" />
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(client?.availableByName) && client.availableByName.length > 0 ? (
                                    client.availableByName.map((name: string, idx: number) => (
                                        <span key={idx} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">
                                            {name}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">Chưa có thông tin người phụ trách</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
                    <div className="relative w-full max-w-5xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-fade-in-scale">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <h3 className="text-lg font-bold text-foreground">Chỉnh sửa thông tin khách hàng</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                                {/* Basic Info Section */}
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5" />
                                        Thông tin cơ bản
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <EditLabel>Tên khách hàng</EditLabel>
                                            <EditInput value={editForm?.clientName} onChange={(val) => setEditForm({ ...editForm, clientName: val })} />
                                        </div>
                                        <div>
                                            <EditLabel>Mã số thuế</EditLabel>
                                            <EditInput value={editForm?.legalId} onChange={(val) => setEditForm({ ...editForm, legalId: val })} />
                                        </div>
                                        <div>
                                            <EditLabel>Số điện thoại</EditLabel>
                                            <EditInput value={editForm?.clientPhone} onChange={(val) => setEditForm({ ...editForm, clientPhone: val })} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <EditLabel>Email liên hệ</EditLabel>
                                            <EditInput value={editForm?.clientEmail} onChange={(val) => setEditForm({ ...editForm, clientEmail: val })} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <EditLabel>Địa chỉ</EditLabel>
                                            <EditArea value={editForm?.clientAddress} onChange={(val) => setEditForm({ ...editForm, clientAddress: val })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Info Section */}
                                <div className="space-y-6">
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" />
                                        Thông tin hóa đơn
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <EditLabel>Email hóa đơn</EditLabel>
                                            <EditInput
                                                value={editForm?.invoiceInfo?.taxEmail}
                                                onChange={(val) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        invoiceInfo: { ...(editForm.invoiceInfo || {}), taxEmail: val },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <EditLabel>Tên công ty (HĐ)</EditLabel>
                                            <EditInput
                                                value={editForm?.invoiceInfo?.taxName}
                                                onChange={(val) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        invoiceInfo: { ...(editForm.invoiceInfo || {}), taxName: val },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <EditLabel>Mã số thuế (HĐ)</EditLabel>
                                            <EditInput
                                                value={editForm?.invoiceInfo?.taxCode}
                                                onChange={(val) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        invoiceInfo: { ...(editForm.invoiceInfo || {}), taxCode: val },
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <EditLabel>Địa chỉ (HĐ)</EditLabel>
                                            <EditArea
                                                value={editForm?.invoiceInfo?.taxAddress}
                                                onChange={(val) =>
                                                    setEditForm({
                                                        ...editForm,
                                                        invoiceInfo: { ...(editForm.invoiceInfo || {}), taxAddress: val },
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Client Contacts Section */}
                                <div className="md:col-span-2 pt-6 border-t border-border">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" />
                                            Người liên hệ ({editForm?.clientContacts?.length || 0})
                                        </h4>
                                        <button
                                            onClick={handleAddContact}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold hover:bg-primary/20 transition-all"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Thêm người liên hệ
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {(editForm?.clientContacts || []).map((contact: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-muted/30 border border-border rounded-xl relative group">
                                                <button
                                                    onClick={() => handleRemoveContact(idx)}
                                                    className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="space-y-3">
                                                    <div>
                                                        <EditLabel>Tên người liên hệ</EditLabel>
                                                        <input
                                                            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                            value={contact.contactName || ""}
                                                            onChange={(e) => handleContactChange(idx, "contactName", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <EditLabel>Số điện thoại</EditLabel>
                                                            <input
                                                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                                value={contact.contactPhone || ""}
                                                                onChange={(e) => handleContactChange(idx, "contactPhone", e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <EditLabel>Mã định danh (CCCD)</EditLabel>
                                                            <input
                                                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                                value={contact.contactId || ""}
                                                                onChange={(e) => handleContactChange(idx, "contactId", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <EditLabel>Email</EditLabel>
                                                            <input
                                                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                                value={contact.contactEmail || ""}
                                                                onChange={(e) => handleContactChange(idx, "contactEmail", e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <EditLabel>Địa chỉ liên hệ</EditLabel>
                                                            <input
                                                                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                                                value={contact.contactAddress || ""}
                                                                onChange={(e) => handleContactChange(idx, "contactAddress", e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(editForm?.clientContacts || []).length === 0 && (
                                            <div className="md:col-span-2 xl:col-span-3 py-8 text-center border-2 border-dashed border-border rounded-2xl">
                                                <p className="text-sm text-muted-foreground italic">Chưa có người liên hệ nào. Nhấn "Thêm người liên hệ" để bắt đầu.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-xl transition-colors">
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Tổng đơn hàng" value={stats.totalOrders} icon={ShoppingCart} color="blue" />
                <StatCard label="Đang xử lý" value={stats.processing} icon={Clock} color="yellow" />
                <StatCard label="Hoàn thành" value={stats.completed} icon={CheckCircle} color="green" />
                <StatCard label="Báo giá" value={stats.totalQuotes} icon={FileText} color="purple" onClick={() => navigate("/customer/quotes")} />
            </div>

            {/* Recent Orders Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Đơn hàng gần đây</h3>
                    <button onClick={() => navigate("/customer/orders")} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                        Xem tất cả <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mã đơn</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày tạo</th>
                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Số mẫu</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trạng thái</th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        Chưa có đơn hàng nào
                                    </td>
                                </tr>
                            ) : (
                                recentOrders.map((order: any) => (
                                    <tr
                                        key={order.orderId}
                                        className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/customer/orders?orderId=${order.orderId}`)}
                                    >
                                        <td className="px-4 py-3 text-sm font-semibold text-primary">{order.orderId}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                                        <td className="px-4 py-3 text-sm text-center text-foreground">{order.samples?.length || 0}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[order.orderStatus] || "bg-muted text-muted-foreground border-border"}`}
                                            >
                                                {order.orderStatus || "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-foreground">{Math.ceil(Number(order.totalAmount || 0)).toLocaleString("vi-VN")} đ</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Sub-components
function DetailItem({ label, value, icon: Icon }: { label: string; value?: string; icon?: any }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1.5">
                {Icon && <Icon className="w-3 h-3" />}
                {label}
            </span>
            <p className="text-sm font-semibold text-foreground leading-relaxed">{value || <span className="text-muted-foreground/50 italic font-normal">Chưa cập nhật</span>}</p>
        </div>
    );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
    return (
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            {title}
        </h3>
    );
}

function MiniStatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400",
        green: "bg-green-50 border-green-100 text-green-600 dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-400",
        orange: "bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-400",
    };

    return (
        <div className={`p-4 rounded-xl border ${colorMap[color] || colorMap.blue} flex flex-col gap-2`}>
            <div className="flex items-center gap-1.5 opacity-80">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-base font-bold truncate">{value}</p>
        </div>
    );
}

function EditLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest ml-1">{children}</label>;
}

function EditInput({ value, onChange, type = "text" }: { value: string; onChange: (val: string) => void; type?: string }) {
    return (
        <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
        />
    );
}

function EditArea({ value, onChange, rows = 3 }: { value: string; onChange: (val: string) => void; rows?: number }) {
    return (
        <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium resize-none"
        />
    );
}

function StatCard({ label, value, icon: Icon, color, onClick }: { label: string; value: number; icon: any; color: string; onClick?: () => void }) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
        yellow: "bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900",
        green: "bg-green-50 text-green-600 border-green-100 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
        purple: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900",
    };

    return (
        <div className={`rounded-2xl border p-5 transition-all ${colorMap[color]} ${onClick ? "cursor-pointer hover:shadow-md" : ""}`} onClick={onClick}>
            <div className="flex items-center justify-between mb-3">
                <Icon className="w-5 h-5 opacity-70" />
                {onClick && <ArrowRight className="w-4 h-4 opacity-50" />}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-70 mt-1">{label}</p>
        </div>
    );
}
