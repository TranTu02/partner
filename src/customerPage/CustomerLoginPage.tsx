import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRight, Shield, Loader2, ArrowLeft } from "lucide-react";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { OtpInput } from "@/customerComponents/auth/OtpInput";
import { customerLoginRequest, customerLoginVerify, customerMe, CUSTOMER_TOKEN_KEY, CUSTOMER_DATA_KEY } from "@/api/customer";
import LogoFull from "@/assets/LOGO-FULL.png";

export function CustomerLoginPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2>(1);
    const [clientId, setClientId] = useState("");
    const [maskedEmail, setMaskedEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // OTP timer
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    // Session check via /customer/v1/auth/me using customerAuthToken
    useEffect(() => {
        const token = Cookies.get(CUSTOMER_TOKEN_KEY);
        if (!token) return;

        // Validate customer token with backend
        customerMe({}).then((res) => {
            if (res.success && res.data) {
                // Token valid — refresh profile and redirect
                const profile = res.data?.identity || res.data;
                localStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(profile));
                navigate("/customer/dashboard", { replace: true });
            } else {
                // Token invalid/expired — clear customer session only
                Cookies.remove(CUSTOMER_TOKEN_KEY);
                localStorage.removeItem(CUSTOMER_DATA_KEY);
            }
        }).catch(() => {
            // Network error: let user stay on login page
        });
    }, [navigate]);

    const handleRequestOtp = async () => {
        const trimmed = clientId.trim();
        if (!trimmed) {
            setError("Vui lòng nhập mã khách hàng");
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            const res = await customerLoginRequest({ body: { clientId: trimmed } });
            if (res.success) {
                setMaskedEmail(res.data?.maskedEmail || res.data?.email || "***@***.***");
                setStep(2);
                setCountdown(300); // 5 minutes
                toast.success("Mã xác thực đã được gửi đến email của bạn");
            } else {
                setError(res.error?.message || "Không tìm thấy mã khách hàng hoặc lỗi hệ thống");
            }
        } catch {
            setError("Lỗi kết nối. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (otpCode: string) => {
        setError("");
        setIsLoading(true);

        try {
            const res = await customerLoginVerify({ body: { clientId: clientId.trim(), otpCode } });
            if (res.success && res.data) {
                const { token, identity } = res.data;
                if (token) {
                    // Save to customerAuthToken — isolated from staff authToken
                    Cookies.set(CUSTOMER_TOKEN_KEY, token, { expires: 1 });
                }
                localStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(identity || { clientId: clientId.trim() }));
                toast.success("Đăng nhập thành công!");
                navigate("/customer/dashboard", { replace: true });
            } else {
                setError(res.error?.message || "Mã xác thực không đúng hoặc đã hết hạn");
            }
        } catch {
            setError("Lỗi kết nối. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        await handleRequestOtp();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-background to-indigo-50 dark:from-gray-900 dark:via-background dark:to-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img src={LogoFull} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-4" />
                    <h1 className="text-lg font-bold text-foreground">Cổng thông tin Khách hàng</h1>
                    <p className="text-sm text-muted-foreground mt-1">Đăng nhập bằng mã khách hàng & xác thực OTP</p>
                </div>

                {/* Login Card */}
                <div className="bg-card rounded-2xl shadow-xl border border-border p-8 transition-all duration-500">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Mail className="w-3.5 h-3.5" />
                            Mã KH
                        </div>
                        <div className="w-8 h-px bg-border" />
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Shield className="w-3.5 h-3.5" />
                            Xác thực
                        </div>
                    </div>

                    {step === 1 ? (
                        /* Step 1: Client ID */
                        <div className="space-y-5 animate-fade-in-scale">
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-2">Mã Khách Hàng</label>
                                <input
                                    type="text"
                                    value={clientId}
                                    onChange={(e) => { setClientId(e.target.value.toUpperCase()); setError(""); }}
                                    onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                                    className="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-input text-foreground text-sm font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal transition-all"
                                    placeholder="Ví dụ: CLI-001"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2.5 rounded-xl text-sm animate-fade-in-scale">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleRequestOtp}
                                disabled={isLoading || !clientId.trim()}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-semibold disabled:opacity-50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        Gửi mã xác thực
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* Step 2: OTP Verification */
                        <div className="space-y-5 animate-fade-in-scale">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">
                                    Mã xác thực đã gửi đến
                                </p>
                                <p className="text-sm font-semibold text-foreground mt-1">{maskedEmail}</p>
                            </div>

                            <OtpInput onComplete={handleVerifyOtp} disabled={isLoading} />

                            {/* Timer */}
                            {countdown > 0 && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Mã hết hạn sau <span className="font-semibold text-warning">{formatTime(countdown)}</span>
                                </p>
                            )}

                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2.5 rounded-xl text-sm animate-fade-in-scale">
                                    {error}
                                </div>
                            )}

                            {isLoading && (
                                <div className="flex justify-center">
                                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    onClick={() => { setStep(1); setError(""); setCountdown(0); }}
                                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Quay lại
                                </button>

                                <button
                                    onClick={handleResend}
                                    disabled={countdown > 0}
                                    className={`text-sm font-medium transition-colors ${countdown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:text-primary/80"}`}
                                >
                                    Gửi lại mã
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-muted-foreground">
                    <p>© 2025 IRDOP LIMS. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
