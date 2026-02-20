import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher} from "@/components/LanguageSwitcher";
import { InstallPWA } from "@/components/InstallPWA";
import { Eye, EyeOff, Home } from "lucide-react";
import { useLocation } from 'wouter';

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoginPending } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

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
    } catch (error: any) {
      toast({
        title: t('app.error'),
        description: error.message || t('auth.loginError'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-pale to-white p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            className="bg-green-600 text-white border-green-400 hover:bg-green-50"
            onClick={() => setLocation("/")}
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-4">
          <div className="mb-4">
            <img src="/logos/logo-full.svg" alt="GreenPath" className="w-auto h-12 mx-auto" />
          </div>
          <p className="text-gray-600 text-sm px-4">
            Empowering Clean Villages through Smart Waste Management
          </p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <p className="text-xs text-gray-500 mb-1 text-center">
                For first-time login, your User ID and Password are the same.
              </p>

              <div>
                <Label htmlFor="userId" className="text-gray-700 font-medium">
                  {t('auth.userId')}
                </Label>
                <Input
                  id="userId"
                  type="text"
                  placeholder="V001-M1, V001-C1, V001-G1..."
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1 focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  required
                />
              </div>

              {/* ✅ Password input with show/hide toggle */}
              <div className="relative">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  {t('auth.password')}
                </Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 pr-14 focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-[42px] right-3 text-sm text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}

                </button>
              </div>

              <div className="flex items-start space-x-2 py-2">
                <input
                  type="checkbox"
                  id="terms-agreement"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="terms-agreement" className="text-[12px] md:text-sm text-gray-600">
                  I agree to{" "}
                  <a
                    href="/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 underline"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Please change your password after logging in from the Profile section.
              </p>

              <Button
                type="submit"
                className="w-full bg-green-primary hover:bg-green-dark text-white font-medium py-3"
                disabled={isLoginPending || !agreedToTerms}
              >
                {isLoginPending ? (
                  <>
                    <div className="spinner mr-2" />
                    {t('app.loading')}
                  </>
                ) : (
                  t('auth.loginButton')
                )}
              </Button>

              <div className="mt-4">
                <InstallPWA showInline={true} />
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 mb-1">
                New users are created by administrators only
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col items-center gap-3">
              <div className="text-xs text-gray-500">
                © {new Date().getFullYear()} GreenPath. All rights reserved.
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs">
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-green-600 transition-colors underline"
                >
                  Privacy Policy
                </a>
                <a
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-green-600 transition-colors underline"
                >
                  Terms of Service
                </a>
                <a
                  href="/data-protection"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-green-600 transition-colors underline"
                >
                  Data Protection
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
