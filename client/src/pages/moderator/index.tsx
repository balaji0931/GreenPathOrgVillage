import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTerminology } from "@/hooks/useTerminology";
import { cn } from "@/lib/utils";
import {
  BarChart3, Building2, AlertCircle, LayoutDashboard,
  LogOut, User, Bell, Settings
} from "lucide-react";

import OverviewTab from "./OverviewTab";
import VillagesTab from "./VillagesTab";
import IssuesTab from "./IssuesTab";
import MoreMenu from "./MoreMenu";

export default function ModeratorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeMoreScreen, setActiveMoreScreen] = useState<string | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);

  // Fetch villages for reuse across tabs
  const { data: villages = [] } = useQuery<any[]>({
    queryKey: ["/api/moderator/villages"],
  });

  // Fetch overview stats for village data (used by VillagesTab)
  const { data: overviewData } = useQuery<any>({
    queryKey: ["/api/moderator/overview-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/moderator/overview-stats?date=${today}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const villageList = overviewData?.villages || [];
  const { label } = useTerminology(villages?.[0]?.unitType);

  const handleVillageTap = (villageId: string) => {
    setSelectedVillageId(villageId);
    setActiveTab("villages");
  };

  const tabTitle = () => {
    if (activeTab === "more" && activeMoreScreen) {
      const titles: Record<string, string> = {
        managers: "Managers", announcements: "Announcements", profile: "Profile",
        "activity-log": "Activity Log",
      };
      return titles[activeMoreScreen] || "More";
    }
    if (activeTab === "villages" && selectedVillageId) {
      return "Daily Report";
    }
    const titles: Record<string, string> = {
      overview: "Overview", villages: label.orgPlural, issues: "Issues", more: "More",
    };
    return titles[activeTab] || "Dashboard";
  };

  const tabSubtitle = () => {
    if (activeTab === "villages" && selectedVillageId) {
      const v = villageList.find((v: any) => v.villageId === selectedVillageId);
      return `${selectedVillageId} - ${v?.name || ''}`;
    }
    return null;
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab onVillageTap={handleVillageTap} />;
      case "villages":
        return <VillagesTab villages={villageList} selectedVillageId={selectedVillageId} onSelectVillage={setSelectedVillageId} />;
      case "issues":
        return <IssuesTab villages={villageList} />;
      case "more":
        return <MoreMenu activeScreen={activeMoreScreen} setActiveScreen={setActiveMoreScreen} villages={villages} />;
      default:
        return <OverviewTab onVillageTap={handleVillageTap} />;
    }
  };

  // Bottom nav tabs
  const tabs = [
    { id: "overview", icon: BarChart3, label: "Overview" },
    { id: "villages", icon: Building2, label: label.orgPlural },
    { id: "issues", icon: AlertCircle, label: "Issues" },
    { id: "more", icon: LayoutDashboard, label: "More" },
  ];

  // Desktop sidebar items (all flat)
  const sidebarItems = [
    { id: "overview", icon: BarChart3, label: "Overview", group: "main" },
    { id: "villages", icon: Building2, label: label.orgPlural, group: "main" },
    { id: "issues", icon: AlertCircle, label: "Issues", group: "main" },
    { id: "managers", icon: User, label: "Managers", group: "manage" },
    { id: "announcements", icon: Bell, label: "Announcements", group: "manage" },
    { id: "profile", icon: Settings, label: "Profile", group: "settings" },
    { id: "activity-log", icon: BarChart3, label: "Activity Log", group: "settings" },
  ];

  const handleSidebarClick = (id: string) => {
    if (["overview", "villages", "issues"].includes(id)) {
      setActiveTab(id);
      setActiveMoreScreen(null);
      if (id !== "villages") setSelectedVillageId(null);
    } else {
      setActiveTab("more");
      setActiveMoreScreen(id);
    }
  };

  const isSidebarActive = (id: string) => {
    if (["overview", "villages", "issues"].includes(id)) return activeTab === id && !activeMoreScreen;
    return activeMoreScreen === id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-white to-blue-50/30 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Left: logo always visible */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logos/logo.svg" alt="GreenPath" className="h-9 w-9 flex-shrink-0 md:hidden" />
            <img src="/logos/logo-full.svg" alt="GreenPath" className="hidden md:block h-10 w-auto flex-shrink-0" />
          </div>

          {/* Center: page title (desktop only — pushed after sidebar) */}
          <div className="flex-1 min-w-0 md:pl-[180px]">
            <div className="flex flex-col justify-center min-w-0">
              {tabSubtitle() && (
                <span className="text-[10px] sm:text-[12px] text-green-600 font-bold uppercase tracking-widest leading-none truncate">
                  {tabSubtitle()}
                </span>
              )}
              <span className="text-lg font-bold text-gray-900 leading-tight truncate">
                {tabTitle()}
              </span>
            </div>
          </div>

          {/* Right: mobile = bell + avatar, desktop = name + role */}
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {/* Mobile buttons */}
            <button onClick={() => { setActiveTab("more"); setActiveMoreScreen("announcements"); }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors active:scale-90 md:hidden">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={() => { setActiveTab("more"); setActiveMoreScreen(null); }}
              className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold active:scale-90 flex-shrink-0 md:hidden">
              {(user?.name || "M").charAt(0).toUpperCase()}
            </button>
            {/* Desktop name + role */}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{user?.name || "Moderator"}</span>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Moderator</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex">
            {tabs.map(({ id, icon: Icon, label }) => {
              const isActive = activeTab === id;
              return (
                <button key={id}
                  onClick={() => { setActiveTab(id); setActiveMoreScreen(null); if (id !== "villages") setSelectedVillageId(null); }}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-90 relative",
                    isActive ? "text-green-600" : "text-gray-400"
                  )}>
                  {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-full" />}
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn("text-[10px] font-semibold", isActive ? "text-green-600" : "text-gray-400")}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block w-56 bg-white border-r sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-3">
            <nav className="space-y-1">
              {/* Main */}
              {sidebarItems.filter(i => i.group === "main").map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => handleSidebarClick(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                    isSidebarActive(id) ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"
                  )}>
                  <Icon className="h-4 w-4 flex-shrink-0" />{label}
                </button>
              ))}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mb-1">Management</p>
                {sidebarItems.filter(i => i.group === "manage").map(({ id, icon: Icon, label }) => (
                  <button key={id} onClick={() => handleSidebarClick(id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                      isSidebarActive(id) ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"
                    )}>
                    <Icon className="h-4 w-4 flex-shrink-0" />{label}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold px-3 mb-1">Settings</p>
                {sidebarItems.filter(i => i.group === "settings").map(({ id, icon: Icon, label }) => (
                  <button key={id} onClick={() => handleSidebarClick(id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-sm font-medium",
                      isSidebarActive(id) ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    )}>
                    <Icon className="h-4 w-4 flex-shrink-0" />{label}
                  </button>
                ))}
              </div>
              {/* Logout */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => logout()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut className="h-4 w-4 flex-shrink-0" />Logout
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-6">
          <div className="p-3 sm:p-6 max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
