import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest, setCsrfToken, fetchCsrfToken, getCsrfToken } from "@/lib/queryClient";

export interface User {
  userId: string;
  role: string;
  name: string;
  villageId: string | null;
  isFirstLogin: boolean;
}

export function useAuth() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
  });

  // Fetch CSRF token on mount if user is authenticated and no token exists
  useEffect(() => {
    if (user && !getCsrfToken()) {
      fetchCsrfToken();
    }
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { userId, password });
      const data = await response.json();
      // Store CSRF token from login response
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
      // Clear CSRF token on logout
      setCsrfToken(null);
    },
    onSuccess: () => {
      refetch();
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", { newPassword });
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  return {
    user: user as User | undefined,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    changePassword: changePasswordMutation.mutateAsync,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isChangePasswordPending: changePasswordMutation.isPending,
  };
}