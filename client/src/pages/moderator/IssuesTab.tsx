import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, Phone, X, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IssuesTabProps {
  villages: any[];
}

export default function IssuesTab({ villages }: IssuesTabProps) {
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  const { data: issues = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/moderator/issues"],
  });

  const villageNameMap = useMemo(() => {
    const map = new Map<string, string>();
    villages.forEach((v: any) => map.set(v.villageId, v.name || v.villageId));
    return map;
  }, [villages]);

  // Manager phone map from villages
  const managerPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    villages.forEach((v: any) => { if (v.managerPhone) map.set(v.villageId, v.managerPhone); });
    return map;
  }, [villages]);

  const issueVillages = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i: any) => set.add(i.villageId));
    return Array.from(set);
  }, [issues]);

  const filtered = useMemo(() => {
    return issues.filter((i: any) => {
      if (filter !== "all" && i.villageId !== filter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    });
  }, [issues, filter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading issues...</span>
      </div>
    );
  }

  /* ──── Full-screen Photo Viewer ──── */
  if (photoOpen && selectedIssue?.photoUrl) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        <div className="flex items-center justify-between p-3">
          <button onClick={() => setPhotoOpen(false)} className="p-2 rounded-full bg-white/10 active:scale-90">
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <button onClick={() => setPhotoOpen(false)} className="p-2 rounded-full bg-white/10 active:scale-90">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <img src={selectedIssue.photoUrl} alt="Issue photo" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      </div>
    );
  }

  /* ──── Issue Detail View ──── */
  if (selectedIssue) {
    const isOpen = selectedIssue.status === "open";
    const isInProgress = selectedIssue.status === "in_progress";
    const statusColor = isOpen ? "bg-red-50 text-red-600 border-red-100" : isInProgress ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-green-50 text-green-600 border-green-100";
    const statusLabel = isInProgress ? "In Progress" : selectedIssue.status === "open" ? "Open" : "Resolved";
    const managerPhone = managerPhoneMap.get(selectedIssue.villageId);

    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-green-50/50 via-white to-blue-50/30 pb-3">
          <div className="flex items-start gap-2">
            <button onClick={() => setSelectedIssue(null)} className="p-2 rounded-xl hover:bg-gray-100 active:scale-90 transition-all flex-shrink-0 mt-0.5">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <div className="text-sm font-black text-gray-900">{selectedIssue.title}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                {villageNameMap.get(selectedIssue.villageId) || selectedIssue.villageId} · {selectedIssue.category}
              </div>
            </div>
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex-shrink-0 mt-0.5 ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Description */}
          <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-4">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</div>
            <p className="text-sm text-gray-700 font-medium leading-relaxed">{selectedIssue.description || "No description provided."}</p>
          </div>

          {/* Meta info */}
          <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-gray-400 uppercase">Reported by</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">{selectedIssue.reportedBy || "—"}</span>
                {selectedIssue.reporterPhone && (
                  <a href={`tel:${selectedIssue.reporterPhone}`} className="p-1 rounded-lg bg-green-100 text-green-600 active:scale-90">
                    <Phone className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-gray-400 uppercase">Date</span>
              <span className="font-bold text-gray-700">{new Date(selectedIssue.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-gray-400 uppercase">Village</span>
              <span className="font-bold text-gray-700">{villageNameMap.get(selectedIssue.villageId) || selectedIssue.villageId}</span>
            </div>
          </div>

          {/* Manager Reply */}
          {selectedIssue.managerReply && (
            <div className="bg-green-50/70 backdrop-blur-md border border-green-100 rounded-2xl p-4">
              <div className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-2">Manager Reply</div>
              <p className="text-sm text-green-800 font-medium leading-relaxed">{selectedIssue.managerReply}</p>
            </div>
          )}
        </div>

        {/* Sticky Bottom Buttons */}
        <div className="sticky bottom-0 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
          <div className="grid grid-cols-2 gap-3">
            {selectedIssue.photoUrl ? (
              <button
                onClick={() => setPhotoOpen(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-2xl py-3 text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
              >
                <ImageIcon className="h-4 w-4" />View Photo
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-gray-100 text-gray-400 rounded-2xl py-3 text-xs font-black uppercase tracking-widest">
                <ImageIcon className="h-4 w-4" />No Photo
              </div>
            )}

            {managerPhone ? (
              <a
                href={`tel:${managerPhone}`}
                className="flex items-center justify-center gap-2 bg-green-600 text-white rounded-2xl py-3 text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm"
              >
                <Phone className="h-4 w-4" />Call Manager
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-gray-100 text-gray-400 rounded-2xl py-3 text-xs font-black uppercase tracking-widest">
                <Phone className="h-4 w-4" />No Phone
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ──── Issues List View ──── */
  return (
    <div className="space-y-3 pb-4">
      <div className="grid grid-cols-2 gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 text-xs font-bold rounded-xl">
            <SelectValue placeholder="All Villages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Villages ({issues.length})</SelectItem>
            {issueVillages.map(vid => (
              <SelectItem key={vid} value={vid}>{villageNameMap.get(vid) || vid}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs font-bold rounded-xl">
            <SelectValue placeholder="Open" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((issue: any) => {
          const isOpen = issue.status === "open";
          const isInProgress = issue.status === "in_progress";
          const dotColor = isOpen ? "bg-red-500" : isInProgress ? "bg-amber-500" : "bg-green-500";
          const statusColor = isOpen ? "bg-red-50 text-red-600" : isInProgress ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600";
          const statusLabel = isInProgress ? "in progress" : issue.status;

          return (
            <button
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className="w-full text-left bg-white/70 backdrop-blur-md border border-white/20 shadow-sm rounded-2xl p-3 transition-all active:scale-[0.98] hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-gray-900 truncate">{issue.title}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${statusColor}`}>{statusLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{villageNameMap.get(issue.villageId) || issue.villageId}</span>
                    <span>{issue.category}</span>
                    <span>·</span>
                    <span>{new Date(issue.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            No issues found
          </div>
        )}
      </div>
    </div>
  );
}
