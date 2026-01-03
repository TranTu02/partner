import { MainLayout } from "@/components/layout/MainLayout";

interface SettingsPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function SettingsPage({ activeMenu, onMenuClick }: SettingsPageProps) {
    const headerContent = (
        <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Cài đặt</h1>
            <p style={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.45)" }}>Cấu hình hệ thống và tùy chỉnh</p>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div>
                <div className="bg-white rounded-lg border border-[#d9d9d9] p-6">
                    <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Cài đặt chung</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500 }}>
                                Tên công ty
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg"
                                style={{ fontSize: "14px" }}
                                placeholder="Nhập tên công ty..."
                                defaultValue="Trung tâm Kiểm nghiệm ABC"
                            />
                        </div>
                        <div>
                            <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500 }}>
                                Email liên hệ
                            </label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg"
                                style={{ fontSize: "14px" }}
                                placeholder="email@example.com"
                                defaultValue="contact@lababc.com"
                            />
                        </div>
                        <div>
                            <label className="block mb-2" style={{ fontSize: "14px", fontWeight: 500 }}>
                                Số điện thoại
                            </label>
                            <input type="tel" className="w-full px-3 py-2 border border-[#d9d9d9] rounded-lg" style={{ fontSize: "14px" }} placeholder="0123456789" defaultValue="028 1234 5678" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button className="px-4 py-2 bg-[#1890FF] text-white rounded-lg hover:bg-[#0d7ae0] transition-colors" style={{ fontSize: "14px", fontWeight: 500 }}>
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
