import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

export function SubscriptionBanner() {
  const { subscription, state, isLoading } = useSubscription();
  const { user } = useAuth();

  if (isLoading || !user) return null;
  if (!subscription && state !== "no_subscription") return null;
  if (state === "active" || user.role === "admin" || user.role === "generator") return null;

  let bgColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
  let title = subscription ? "Subscription expires in " + subscription.daysRemaining + " days." : "No Active Subscription";
  if (subscription && subscription.daysRemaining === 1) {
    title = "Subscription expires tomorrow.";
  } else if (subscription && subscription.daysRemaining === 0) {
    title = "Subscription expires today.";
  }
  let subtitle = "";

  // Set colors
  if (state === "warning_15") {
    bgColor = "bg-orange-100 text-orange-800 border-orange-200";
  } else if (state === "warning_7") {
    bgColor = "bg-red-100 text-red-800 border-red-200";
  } else if (state === "grace") {
    bgColor = "bg-red-100 text-red-800 border-red-200";
    title = "Subscription has expired.";
    subtitle = "GreenPath is currently operating in the grace period.\n";
  } else if (state === "expired") {
    bgColor = "bg-gray-800 text-gray-100 border-gray-900";
    title = "Subscription Expired";
    if (user.role === "manager" || user.role === "pdo") {
      subtitle = "GreenPath is currently in Read-Only Mode.\nHistorical data remains available, but new operational data cannot be recorded until the subscription is renewed.";
    } else {
      subtitle = "GreenPath is currently in Read-Only Mode.\nNew operational updates cannot be recorded.\n";
      if (user.role === "collector") {
        subtitle = "GreenPath is currently in Read-Only Mode.\nNew collection entries cannot be recorded.\n";
      }
    }
  } else if (state === "no_subscription") {
    bgColor = "bg-gray-800 text-gray-100 border-gray-900";
    title = "No Active Subscription";
    if (user.role === "manager" || user.role === "pdo") {
      subtitle = "GreenPath is currently in Read-Only Mode.\nNo subscription has been recorded for this village.";
    } else {
      subtitle = "GreenPath is currently in Read-Only Mode.\nNew operational updates cannot be recorded.\n";
    }
  }

  // Set role-specific action text
  let actionText = "";
  if (state !== "expired" || (user.role !== "manager" && user.role !== "pdo")) {
    if (user.role === "collector") {
      actionText = state === "warning_30" 
        ? "Please inform your supervisor to ensure uninterrupted GreenPath services."
        : "Please contact your supervisor.";
      if (state === "warning_15") actionText = "Please inform your supervisor.";
    } else if (user.role === "fieldworker" || user.role === "moderator") {
      actionText = state === "warning_30"
        ? "Please inform your manager so the subscription can be renewed before expiry."
        : "Please contact your manager.";
      if (state === "warning_15") actionText = "Please contact your manager regarding renewal.";
    } else if (user.role === "manager" || user.role === "pdo") {
      if (state === "warning_30") actionText = "Please renew your village's GreenPath subscription before the expiry date to avoid service interruption.";
      else if (state === "warning_15") actionText = "Please renew your village's subscription to avoid interruption.";
      else if (state === "warning_7") actionText = "Please renew your subscription as soon as possible.";
      else if (state === "grace") actionText = "Please renew the subscription before read-only mode begins.";
    }
  }

  return (
    <div className={`w-full px-4 py-2 border-b text-xs font-medium ${bgColor} shadow-sm relative`}>
      <div className="flex items-start gap-2 max-w-7xl mx-auto">
        <span className="text-md leading-tight mt-0.5">⚠️</span>
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-baseline gap-0.5 md:gap-2">
          <span className="font-bold">{title}</span>
          {subtitle && <span className="whitespace-pre-line md:whitespace-normal">{subtitle}</span>}
          {actionText && <span>{actionText}</span>}
        </div>
      </div>
    </div>
  );
}
