
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
  const [cachedUser, setCachedUser] = useState<User | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for cached user on mount
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

  // Only make network request if online OR no cached data exists
  const shouldQuery = !isOffline || !cachedUser;

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
        
        // If we have cached data, use it instead of throwing
        if (cachedUser) {
          console.log('[Auth] Using cached user data due to network error');
          return { ...cachedUser, offline: true };
        }
        
        throw error;
      }
    },
    enabled: shouldQuery,
    retry: false, // Don't retry at all
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Determine which user data to return
  let currentUser: User | undefined = networkUser;
  let currentIsLoading = isLoading;

  // If offline and we have cached data, use cached data
  if (isOffline && cachedUser && !networkUser) {
    currentUser = { ...cachedUser, offline: true };
    currentIsLoading = false;
  }

  console.log('[Auth] Current state:', {
    isOffline,
    cachedUser: !!cachedUser,
    networkUser: !!networkUser,
    currentUser: !!currentUser,
    isLoading: currentIsLoading,
    shouldQuery
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
