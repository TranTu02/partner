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
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window !== "undefined") {
            return window.innerWidth >= 768;
        }
        return true;
    });

    // Close sidebar on mobile when route changes or initially if small screen?
    // Actually, let's just handle overlay click to close.

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Mobile Overlay Backdrop */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />}

            {/* Sidebar Area */}
            {/* 
                Mobile: fixed, z-50, always w-64, slide in/out using translate.
                Desktop: relative, transitions width/translate to push content.
            */}
            <div
                className={`
                    fixed inset-y-0 left-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:hidden md:border-none"}
                `}
            >
                <div className="min-w-64 h-full">
                    <Sidebar activeMenu={activeMenu} onMenuClick={onMenuClick} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {headerContent}
                </Header>
                <div className="flex-1 overflow-auto bg-background p-4 md:p-6">{children}</div>
            </div>
        </div>
    );
}
