import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Cookies from "js-cookie";
import { CUSTOMER_TOKEN_KEY } from "@/api/customer";
import { LoginPage } from "@/pages/LoginPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { ParametersPage } from "@/pages/ParametersPage";
import { QuotesListPage } from "@/pages/QuotesListPage";
import { OrdersListPage } from "@/pages/OrdersListPage";
import { AccountingPage } from "@/pages/AccountingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SampleRequestFormPage } from "@/pages/SampleRequestFormPage";

// Customer Portal imports
import { CustomerLoginPage } from "@/customerPage/CustomerLoginPage";
import { CustomerDashboardPage } from "@/customerPage/CustomerDashboardPage";
import { CustomerQuotesPage } from "@/customerPage/CustomerQuotesPage";
import { CustomerOrdersPage } from "@/customerPage/CustomerOrdersPage";
import { CustomerParametersPage } from "@/customerPage/CustomerParametersPage";
import { CustomerLayout } from "@/customerComponents/layout/CustomerLayout";

function AppRoutes() {
    const { user, hasAccess } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Redirect logic:
    const isCustomerPath = location.pathname.startsWith("/customer");
    const isCustomerLogin = location.pathname === "/customer/login";
    const isSampleForm = location.pathname === "/form/request-sample";
    // Check cookie directly: AuthContext loads async, cookie is instant
    const hasCustomerToken = !!Cookies.get(CUSTOMER_TOKEN_KEY);
    const hasStaffToken = !!Cookies.get("authToken");

    // 1. Staff area: no staff token and not a customer/public path AND no customer token → show login
    if (!user && !hasStaffToken && !isCustomerPath && !isSampleForm && !hasCustomerToken) {
        return <LoginPage />;
    }

    // 2. Customer area: no user, no customerAuthToken, not on login page → redirect
    if (!user && !hasCustomerToken && isCustomerPath && !isCustomerLogin) {
        return <Navigate to="/customer/login" replace />;
    }

    // 3. Root redirection based on user type
    if (location.pathname === "/") {
        if (user?.roles?.client) {
            return <Navigate to="/customer/dashboard" replace />;
        }
        if (user) {
            return <Navigate to="/dashboard" replace />;
        }
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
                <Route path="/" element={<Navigate to={user?.roles?.client ? "/customer/dashboard" : "/dashboard"} replace />} />
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

                {/* ====== Customer Portal Routes ====== */}
                <Route path="/customer/login" element={<CustomerLoginPage />} />

                {/* Full-screen editor routes (outside CustomerLayout) */}
                <Route path="/customer/quotes/create" element={<CustomerQuotesPage />} />
                <Route path="/customer/quotes/detail" element={<CustomerQuotesPage />} />
                <Route path="/customer/quotes/edit" element={<CustomerQuotesPage />} />
                <Route path="/customer/orders/create" element={<CustomerOrdersPage />} />
                <Route path="/customer/orders/detail" element={<CustomerOrdersPage />} />
                <Route path="/customer/orders/edit" element={<CustomerOrdersPage />} />

                <Route path="/customer" element={<CustomerLayout />}>
                    <Route index element={<Navigate to="/customer/dashboard" replace />} />
                    <Route path="dashboard" element={<CustomerDashboardPage />} />
                    <Route path="quotes" element={<CustomerQuotesPage />} />
                    <Route path="orders" element={<CustomerOrdersPage />} />
                    <Route path="parameters" element={<CustomerParametersPage />} />
                </Route>

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
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const isCustomer = location.pathname.startsWith("/customer");

    const handleLoginAgain = () => {
        logout(); // Clear session first
        navigate(isCustomer ? "/customer/login" : "/login", { replace: true });
    };

    return (
        <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
            <div className="text-center p-8 bg-card rounded-2xl shadow-xl border border-border max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
                <div className="text-6xl mb-6 drop-shadow-sm">🔒</div>
                <h1 className="text-2xl font-bold text-foreground mb-3">Không có quyền truy cập</h1>
                <p className="text-sm text-muted-foreground mb-8 text-balance">
                    Tài khoản của bạn không có đủ quyền để truy cập trang này. Vui lòng kiểm tra lại hoặc đăng nhập bằng tài khoản khác.
                </p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-full py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-all"
                    >
                        Quay lại
                    </button>
                    <button 
                        onClick={handleLoginAgain}
                        className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all"
                    >
                        Đăng nhập lại
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
