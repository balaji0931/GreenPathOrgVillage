import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export type SubscriptionState = 
  | "active"
  | "warning_30"
  | "warning_15"
  | "warning_7"
  | "grace"
  | "expired"
  | "loading"
  | "no_subscription";

export interface SubscriptionInfo {
  id: number;
  villageId: string;
  startDate: string;
  endDate: string;
  gracePeriodDays: number;
  state: SubscriptionState;
  daysRemaining: number;
}

export function useSubscription() {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/subscriptions/villages", user?.villageId, "active"],
    enabled: !!user && !!user.villageId && user.role !== "admin",
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/villages/${user?.villageId}/active`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    refetchInterval: 1000 * 60 * 60, // check every hour
  });

  if (user?.role === "admin") {
    return { subscription: null, state: "active" as SubscriptionState, isLoading: false };
  }

  if (isLoading) return { subscription: null, state: "loading" as SubscriptionState, isLoading: true };
  
  if (!data) return { subscription: null, state: "no_subscription" as SubscriptionState, isLoading: false };

  const now = new Date().getTime();
  const endDate = new Date(data.endDate).getTime();
  const graceEnd = endDate + (data.gracePeriodDays * 24 * 60 * 60 * 1000);
  
  const daysToEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

  let state: SubscriptionState = "active";

  if (now > graceEnd) {
    state = "expired";
  } else if (now > endDate && now <= graceEnd) {
    state = "grace";
  } else if (daysToEnd >= 16 && daysToEnd <= 30) {
    state = "warning_30";
  } else if (daysToEnd >= 8 && daysToEnd <= 15) {
    state = "warning_15";
  } else if (daysToEnd >= 0 && daysToEnd <= 7) {
    state = "warning_7";
  }

  return {
    subscription: {
      ...data,
      state,
      daysRemaining: Math.max(0, daysToEnd)
    } as SubscriptionInfo,
    state,
    isLoading: false
  };
}
