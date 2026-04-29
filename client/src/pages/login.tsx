import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher} from "@/components/LanguageSwitcher";
import { InstallPWA } from "@/components/InstallPWA";
import { Eye, EyeOff, ArrowLeft, Shield, Users, BarChart3, Loader2 } from "lucide-react";
import { useLocation } from 'wouter';

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { login, isLoginPending } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  // Show install prompt only after login page has fully loaded
  useEffect(() => {
    const timer = setTimeout(() => setShowInstallPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast({
        title: t('app.error'),
        description: "Please agree to the Terms of Service and Privacy Policy before logging in.",
        variant: "destructive",
      });
      return;
    }

    try {
      await login({ userId, password });
      toast({
        title: t('app.success'),
        description: t('auth.loginSuccess', 'Logged in successfully'),
      });
    } catch (_error: unknown) {
      toast({
        title: t('app.error'),
        description: t('auth.loginError', 'Invalid credentials. Please try again.'),
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Left panel - illustration side (hidden on mobile) */}
      <div className="md:p-5 hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-20 left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-12 w-full">
          {/* Logo */}
          <img
            src="/logos/logo-dark.svg"
            alt="GreenPath"
            className="h-10 w-auto mb-6 self-start"
          />

          {/* Tagline */}
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Waste management
            <br />
            infrastructure for
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              communities, cities
            </span>
            <br />
            & institutions
          </h2>

          {/* Login illustration */}
          <div className="mb-2 flex justify-center">
            <style>{`
              @keyframes loginFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
              }
            `}</style>
            <img
              src="/images/illustrations/step-5-analyze.png"
              alt="Connected community waste management"
              className="w-100 h-auto drop-shadow-xl"
              style={{ animation: 'loginFloat 5s ease-in-out infinite' }}
            />
          </div>

          {/* Trust stats */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: Users, value: "2,000+", label: "Households" },
              { icon: Shield, value: "95%", label: "Segregation" },
              { icon: BarChart3, value: "3+", label: "Deployments" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 md:p-6">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>
          <LanguageSwitcher />
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-12 xl:px-20 pb-8">
          <div className="w-full max-w-md">
            {/* Logo (mobile only) */}
            <div className="lg:hidden text-center mb-8">
              <img
                src="/logos/logo-full.svg"
                alt="GreenPath"
                className="h-10 w-auto mx-auto mb-3"
              />
              <p className="text-sm text-slate-500">
                Waste management platform for communities
              </p>
            </div>

            <div className="mb-8 hidden lg:block">
              {/* Trust line */}
              <p className="text-xs text-slate-500 text-center italic mb-8">
                Used daily by collectors, households and managers across active deployments.
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Welcome back
              </h1>
              <p className="text-slate-500">
                Together we Digitize waste collection. Track every pickup. Monitor segregation quality. Generate actionable insights.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <Label htmlFor="userId" className="text-sm font-medium text-slate-700">
                  {t('auth.userId')}
                </Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="V001-M1, V001-C1, V001-G1..."
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-2 h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base"
                  required
                />
              </div>

              <div className="relative">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  {t('auth.password')}
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 pr-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-3 py-1">
                <input
                  type="checkbox"
                  id="terms-agreement"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                  required
                />
                <label htmlFor="terms-agreement" className="text-sm text-slate-500 leading-relaxed">
                  I agree to{" "}
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 underline"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-700/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                disabled={isLoginPending || !agreedToTerms}
              >
                {isLoginPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t('app.loading')}
                  </>
                ) : (
                  t('auth.loginButton')
                )}
              </Button>

            </form>

            {showInstallPrompt && (
              <div data-nosnippet className="mt-4">
                <InstallPWA showInline={true} />
              </div>
            )}

            {/* Legal footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">
                Terms of Service
              </a>
              <a href="/data-protection" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors">
                Data Protection
              </a>
            </div>

            <div className="mt-4 text-center text-xs text-slate-300">
              © {new Date().getFullYear()} GreenPath. All rights reserved.
            </div>
          </div>
        </div>
    </div>

      {/* Floating install popup (bottom-right card) */}
      {showInstallPrompt && (
        <div data-nosnippet>
          <InstallPWA />
        </div>
      )}
    </div>
  );
}
