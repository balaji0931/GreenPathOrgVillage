import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  userId: string;
  role: string;
  name: string;
  villageId: string | null;
  isFirstLogin: boolean;
}

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        const userData = await response.json();

        // Cache user data for offline use
        if (userData && !userData.message) {
          localStorage.setItem('greenpath_user', JSON.stringify(userData));
        }

        return userData;
      } catch (error: any) {
        if (error.message?.includes('Failed to fetch') || error.message?.includes('401') || !navigator.onLine) {
          // Return cached user if offline or unauthorized (but we have cached data)
          const cached = localStorage.getItem('greenpath_user');
          if (cached) {
            try {
              const cachedUser = JSON.parse(cached);
              console.log('[Auth] Using cached user data for offline/unauthorized mode:', cachedUser);
              return { ...cachedUser, offline: true };
            } catch (parseError) {
              console.error('[Auth] Failed to parse cached user data:', parseError);
              localStorage.removeItem('greenpath_user');
            }
          }
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry if offline or if we have cached data
      if (!navigator.onLine) return false;
      if (error.message?.includes('401') && localStorage.getItem('greenpath_user')) return false;
      return failureCount < 2; // Reduce retry attempts
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Refetch when back online
  });

  const loginMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { userId, password });
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
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