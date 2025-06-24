
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export interface User {
  userId: string;
  role: string;
  name: string;
  villageId: string | null;
  isFirstLogin: boolean;
  offline?: boolean;
}

export function useAuth() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedUser, setCachedUser] = useState<User | null>(null);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached user on mount
    const cached = localStorage.getItem('greenpath_user');
    if (cached) {
      try {
        const parsedUser = JSON.parse(cached);
        setCachedUser(parsedUser);
      } catch (error) {
        console.error('[Auth] Failed to parse cached user:', error);
        localStorage.removeItem('greenpath_user');
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: networkUser, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      console.log('[Auth] Making network request for user data');
      
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        const userData = await response.json();

        // Cache user data for offline use
        if (userData && !userData.message) {
          localStorage.setItem('greenpath_user', JSON.stringify(userData));
          setCachedUser(userData);
        }

        return userData;
      } catch (error: any) {
        console.error('[Auth] Network request failed:', error);
        throw error;
      }
    },
    enabled: !isOffline || !cachedUser, // Only query when online OR no cached data
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: false,
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
      localStorage.removeItem('greenpath_user');
      setCachedUser(null);
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

  // Determine current user and loading state
  let currentUser: User | undefined;
  let currentIsLoading = isLoading;

  if (isOffline && cachedUser) {
    // Offline with cached data - use cached user
    currentUser = { ...cachedUser, offline: true };
    currentIsLoading = false;
  } else if (!isOffline && networkUser) {
    // Online with network data
    currentUser = networkUser;
  } else if (!isOffline && !networkUser && cachedUser) {
    // Online but no network data yet, but have cached - use cached
    currentUser = { ...cachedUser, offline: false };
  }

  console.log('[Auth] Current state:', {
    isOffline,
    cachedUser: !!cachedUser,
    networkUser: !!networkUser,
    currentUser: !!currentUser,
    isLoading: currentIsLoading,
    queryEnabled: !isOffline || !cachedUser
  });

  return {
    user: currentUser,
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
