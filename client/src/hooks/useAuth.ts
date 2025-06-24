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
  // Check if we should use cached data instead of making network requests
  const shouldUseCachedData = !navigator.onLine && localStorage.getItem('greenpath_user');
  
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      // If offline and we have cached data, return it immediately
      if (!navigator.onLine) {
        const cached = localStorage.getItem('greenpath_user');
        if (cached) {
          try {
            const cachedUser = JSON.parse(cached);
            console.log('[Auth] Using cached user data for offline mode:', cachedUser);
            return { ...cachedUser, offline: true };
          } catch (parseError) {
            console.error('[Auth] Failed to parse cached user data:', parseError);
            localStorage.removeItem('greenpath_user');
          }
        }
      }

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
              console.log('[Auth] Using cached user data for error fallback:', cachedUser);
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
    enabled: !shouldUseCachedData, // Disable query if we should use cached data
    retry: (failureCount, error: any) => {
      // Don't retry if offline
      if (!navigator.onLine) return false;
      // Don't retry auth errors if we have cached data
      if (error.message?.includes('401') && localStorage.getItem('greenpath_user')) return false;
      return failureCount < 1; // Reduce retry attempts further
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true, // Refetch when back online
    refetchInterval: false, // Disable automatic refetching
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

  // If we're using cached data (offline), get it manually
  let currentUser = user;
  let currentIsLoading = isLoading;
  
  if (shouldUseCachedData && !user && !isLoading) {
    const cached = localStorage.getItem('greenpath_user');
    if (cached) {
      try {
        const cachedUser = JSON.parse(cached);
        currentUser = { ...cachedUser, offline: true };
        currentIsLoading = false;
      } catch (parseError) {
        console.error('[Auth] Failed to parse cached user data in return:', parseError);
        localStorage.removeItem('greenpath_user');
      }
    }
  }

  return {
    user: currentUser as User | undefined,
    isLoading: currentIsLoading,
    isAuthenticated: !!currentUser,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    changePassword: changePasswordMutation.mutateAsync,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isChangePasswordPending: changePasswordMutation.isPending,
  };
}