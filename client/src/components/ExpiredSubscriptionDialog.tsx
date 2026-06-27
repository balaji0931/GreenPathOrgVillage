import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function ExpiredSubscriptionDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleExpired = () => {
      setOpen(true);
    };

    window.addEventListener("subscription_expired", handleExpired);
    return () => window.removeEventListener("subscription_expired", handleExpired);
  }, []);

  if (!user) return null;

  let title = "Subscription Expired";
  let description = "GreenPath is currently operating in Read-Only Mode.\n\nHistorical data is still available, but new operational entries cannot be recorded until the subscription is renewed.";
  let contactText = "Please contact your manager.";

  if (user.role === "generator") {
    title = "Service Temporarily Unavailable";
    description = "Waste submissions are currently unavailable because the village's GreenPath subscription has expired.";
    contactText = "Please contact your Panchayat for assistance.";
  } else if (user.role === "collector") {
    contactText = "Please inform your supervisor.";
  } else if (user.role === "fieldworker" || user.role === "moderator") {
    contactText = "Please inform your manager.";
  } else if (user.role === "manager" || user.role === "pdo") {
    contactText = "Please renew the subscription.";
  } else if (user.role === "admin") {
    title = "Village Subscription Expired";
    description = "";
    contactText = "Renew the subscription from Subscription Management to restore full functionality.";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md z-[100]">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <span className="text-xl">⚠️</span> {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {description && (
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {description}
            </div>
          )}
          <div className="text-sm font-semibold text-gray-900 mt-4">
            {contactText}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Close
          </Button>
          <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
            Check Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
