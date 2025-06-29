import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Recycle } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InstallPWA } from "@/components/InstallPWA";
import Footer from "@/components/Footer";
import { useTranslation } from 'react-i18next';
import { Leaf } from "lucide-react";

export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoginPending } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
                <Recycle className="h-8 w-8 text-green-600" />
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

                {/* loginMutation.error && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {loginMutation.error?.message || t("auth.loginError")}
                    </AlertDescription>
                  </Alert>
                ) */}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-green-600 hover:bg-green-700" 
                  disabled={isLoginPending}
                >
                  {isLoginPending ? (
                    <>
                      {/* <Loader2 className="mr-2 h-4 w-4 animate-spin" /> */}
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