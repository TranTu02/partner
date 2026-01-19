import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { ParametersPage } from "@/pages/ParametersPage";
import { QuotesListPage } from "@/pages/QuotesListPage";
import { OrdersListPage } from "@/pages/OrdersListPage";
import { AccountingPage } from "@/pages/AccountingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SampleRequestFormPage } from "@/pages/SampleRequestFormPage";

function AppRoutes() {
    const { user, isGuest, hasAccess } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Show login page if not authenticated, unless accessing the public sample request form
    if (!user && !isGuest && location.pathname !== "/form/request-sample") {
        return <LoginPage />;
    }

    // Determine active menu based on current path
    const currentPath = location.pathname.substring(1).split("/")[0] || "dashboard";
    const activeMenu = currentPath === "" ? "dashboard" : currentPath;

    const handleMenuClick = (menu: string) => {
        if (hasAccess(menu)) {
            navigate(`/${menu}`);
        }
    };

    const commonProps = {
        activeMenu,
        onMenuClick: handleMenuClick,
    };

    // Protected Route Wrapper
    const ProtectedRoute = ({ menuId, element }: { menuId: string; element: React.ReactNode }) => {
        if (!hasAccess(menuId)) {
            return <AccessDeniedPage />;
        }
        return element;
    };

    return (
        <div className="flex flex-col h-screen bg-[#F0F2F5] overflow-hidden" style={{ fontFamily: "var(--font-family)" }}>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/form/request-sample" element={<SampleRequestFormPage />} />
                <Route path="/dashboard" element={<ProtectedRoute menuId="dashboard" element={<DashboardPage {...commonProps} />} />} />
                <Route path="/clients" element={<ProtectedRoute menuId="clients" element={<ClientsPage {...commonProps} />} />} />

                {/* Orders and Quotes handle their own sub-routes */}
                <Route path="/orders/*" element={<ProtectedRoute menuId="orders" element={<OrdersListPage {...commonProps} />} />} />
                <Route path="/quotes/*" element={<ProtectedRoute menuId="quotes" element={<QuotesListPage {...commonProps} />} />} />

                <Route path="/parameters" element={<ProtectedRoute menuId="parameters" element={<ParametersPage {...commonProps} />} />} />
                <Route path="/accounting" element={<ProtectedRoute menuId="accounting" element={<AccountingPage {...commonProps} />} />} />
                <Route path="/settings" element={<ProtectedRoute menuId="settings" element={<SettingsPage {...commonProps} />} />} />
                <Route path="/admin/*" element={<ProtectedRoute menuId="admin" element={<AdminDashboard />} />}/>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
}

import { Toaster } from "@/components/ui/sonner";
import AdminDashboard from "@/pages/AdminDashboardPage";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
                <Toaster duration={1000} style={{ zIndex: 99999 }} />
            </BrowserRouter>
        </AuthProvider>
    );
}

function AccessDeniedPage() {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <div className="text-5xl mb-4">🔒</div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Không có quyền truy cập</h1>
                <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập trang này</p>
            </div>
        </div>
    );
}

export default App;
