import { useState, type ReactNode } from "react";
import { Sidebar } from "../Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
    children: ReactNode;
    headerContent?: ReactNode;
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function MainLayout({ children, headerContent, activeMenu, onMenuClick }: MainLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            {/* Sidebar Area */}
            <div
                className={`transition-all duration-300 ease-in-out border-r border-border bg-card flex flex-col ${
                    isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full opacity-0 overflow-hidden border-none"
                }`}
            >
                <div className="min-w-64 h-full">
                    <Sidebar activeMenu={activeMenu} onMenuClick={onMenuClick} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {headerContent}
                </Header>
                <div className="flex-1 overflow-auto bg-background p-6">{children}</div>
            </div>
        </div>
    );
}
