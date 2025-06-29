import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Leaf } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InstallPWA } from "@/components/InstallPWA";
import Footer from "@/components/Footer";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <InstallPWA />
          <Card className="shadow-lg">
            <CardHeader className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Leaf className="h-8 w-8 text-green-600" />
                <CardTitle className="text-2xl font-bold text-green-800">
                  {t("app.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                {t("auth.loginDescription")}
              </CardDescription>
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="userId" className="text-sm font-medium">
                    {t("auth.userId")}
                  </label>
                  <Input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder={t("auth.userIdPlaceholder")}
                    disabled={isLoginPending}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    {t("auth.password")}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.passwordPlaceholder")}
                    disabled={isLoginPending}
                    required
                    className="h-11"
                  />
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
                  <label htmlFor="terms-agreement" className="text-sm text-gray-600">
                    I agree to the{" "}
                    <a
                      href="/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700 underline"
                    >
                      Terms of Service
                    </a>
                    {" "}and{" "}
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

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-green-600 hover:bg-green-700" 
                  disabled={isLoginPending || !agreedToTerms}
                >
                  {isLoginPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.loggingIn")}
                    </>
                  ) : (
                    t("auth.login")
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}