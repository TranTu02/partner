import { Menu, ChevronLeft } from "lucide-react";

interface HeaderProps {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    children?: React.ReactNode;
}

export function Header({ isSidebarOpen, toggleSidebar, children }: HeaderProps) {
    return (
        <header className="sticky top-0 z-10 bg-card border-b border-border h-16 flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center gap-4 flex-1">
                <button onClick={toggleSidebar} className="p-2 hover:bg-muted/50 rounded-lg text-muted-foreground transition-colors" title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}>
                    {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div className="flex-1">{children}</div>
            </div>
        </header>
    );
}
