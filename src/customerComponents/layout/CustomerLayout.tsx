import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CustomerSidebar } from "./CustomerSidebar";
import { Header } from "@/components/layout/Header";

export function CustomerLayout() {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const activeMenu = location.pathname.split("/")[2] || "dashboard";

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
                    onClick={() => setIsSidebarOpen(false)} 
                />
            )}

            {/* Sidebar */}
            <div
                className={`
                    fixed inset-y-0 left-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:hidden md:border-none"}
                `}
            >
                <div className="min-w-64 h-full">
                    <CustomerSidebar activeMenu={activeMenu} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header 
                    isSidebarOpen={isSidebarOpen} 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">Customer Portal</span>
                    </div>
                </Header>
                <div className="flex-1 overflow-auto bg-background p-4 md:p-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
