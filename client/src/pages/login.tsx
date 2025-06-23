import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-pale to-white p-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-primary rounded-full mb-4">
            <Leaf className="text-white text-3xl" size={36} />
          </div>
          <h1 className="text-3xl font-bold text-green-dark mb-2">{t('app.title')}</h1>
          <p className="text-gray-600 text-sm px-4">
            Empowering Clean Villages through Smart Waste Management
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="mt-2 focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  {t('auth.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 focus:ring-2 focus:ring-green-primary focus:border-transparent"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-green-primary hover:bg-green-dark text-white font-medium py-3"
                disabled={isLoginPending}
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
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                New users are created by administrators only
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
