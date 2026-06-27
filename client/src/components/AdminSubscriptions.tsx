import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Plus } from "lucide-react";
import { differenceInDays, format } from "date-fns";

export function AdminSubscriptions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    villageId: "",
    startDate: "",
    endDate: "",
    gracePeriodDays: 30,
  });

  const { data: villages = [], isLoading: villagesLoading } = useQuery<any[]>({
    queryKey: ["/api/villages"],
  });

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery<any[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: ["/api/subscriptions/villages", selectedVillage],
    enabled: !!selectedVillage,
  });

  const addSubMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/subscriptions", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscription added successfully" });
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setFormData({ villageId: "", startDate: "", endDate: "", gracePeriodDays: 30 });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add subscription", description: err.message, variant: "destructive" });
    }
  });

  const editSubMutation = useMutation({
    mutationFn: async (data: { id: number; gracePeriodDays?: number; endDate?: string, startDate?: string }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subscription updated successfully" });
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update subscription", description: err.message, variant: "destructive" });
    }
  });

  // Calculate duration
  const start = new Date(formData.startDate);
  const end = new Date(formData.endDate);
  const duration = (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) 
    ? differenceInDays(end, start) 
    : 0;

  // Process village statuses
  const villageStatuses = villages.map(v => {
    // Determine active subscription similar to backend
    const allSubs = subscriptions.filter(s => s.villageId === v.villageId);
    let activeSub = null;
    let status = "No Subscription";
    let badgeClass = "bg-gray-100 text-gray-800";

    if (allSubs.length > 0) {
      const now = new Date();
      for (const sub of allSubs) {
        const subStart = new Date(sub.startDate);
        const subEnd = new Date(sub.endDate);
        const graceEnd = new Date(subEnd);
        graceEnd.setDate(graceEnd.getDate() + sub.gracePeriodDays);

        if (now >= subStart && now <= graceEnd) {
          activeSub = sub;
          if (now <= subEnd) {
            status = "🟢 Active";
            badgeClass = "bg-green-100 text-green-800";
          } else {
            status = "🟡 Grace";
            badgeClass = "bg-yellow-100 text-yellow-800";
          }
          break;
        }
      }

      if (!activeSub) {
        // Check if there are future ones
        const future = allSubs.find(s => new Date(s.startDate) > now);
        if (future) {
          status = "🔵 Upcoming";
          badgeClass = "bg-blue-100 text-blue-800";
        } else {
          status = "🔴 Expired";
          badgeClass = "bg-red-100 text-red-800";
        }
      }
    }

    return {
      ...v,
      status,
      badgeClass,
      activeSub
    };
  });

  const getSubState = (sub: any) => {
    const now = new Date();
    const start = new Date(sub.startDate);
    const end = new Date(sub.endDate);
    const grace = new Date(end);
    grace.setDate(grace.getDate() + sub.gracePeriodDays);

    if (now < start) return { isStarted: false, isEnded: false };
    if (now > grace) return { isStarted: true, isEnded: true };
    return { isStarted: true, isEnded: false }; // Active or Grace
  };

  const handleEditOpen = (sub: any) => {
    setSelectedSub(sub);
    const sd = new Date(sub.startDate);
    const ed = new Date(sub.endDate);
    
    // adjust for timezone offset to YYYY-MM-DD
    const tzOffset = sd.getTimezoneOffset() * 60000; 
    const startStr = new Date(sd.getTime() - tzOffset).toISOString().split('T')[0];
    const endStr = new Date(ed.getTime() - tzOffset).toISOString().split('T')[0];

    setFormData({
      villageId: sub.villageId,
      startDate: startStr,
      endDate: endStr,
      gracePeriodDays: sub.gracePeriodDays,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = () => {
    const { isStarted, isEnded } = getSubState(selectedSub);
    const payload: any = { id: selectedSub.id };

    if (!isStarted) {
      payload.startDate = formData.startDate;
      payload.endDate = formData.endDate;
      payload.gracePeriodDays = formData.gracePeriodDays;
    } else if (isStarted && !isEnded) {
      payload.endDate = formData.endDate;
      payload.gracePeriodDays = formData.gracePeriodDays;
    }

    editSubMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Subscription Management</h2>
          <p className="text-sm text-gray-500">Manage organization subscriptions and access levels.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Subscription
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Villages & Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Current Range</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {villageStatuses.map((v) => (
                  <tr key={v.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.name} <span className="text-xs text-gray-500 font-normal">({v.villageId})</span></td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={v.badgeClass}>
                        {v.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {v.activeSub ? `${format(new Date(v.activeSub.startDate), 'MMM d, yyyy')} - ${format(new Date(v.activeSub.endDate), 'MMM d, yyyy')}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {v.activeSub && (
                          <Button variant="outline" size="sm" onClick={() => handleEditOpen(v.activeSub)}>
                            <Edit className="h-3 w-3 mr-1" /> Edit Active
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { setSelectedVillage(v.villageId); setIsHistoryOpen(true); }}>
                          <Eye className="h-3 w-3 mr-1" /> History
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {villageStatuses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No organizations found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Subscription Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={formData.villageId} onValueChange={(val) => setFormData({...formData, villageId: val})}>
                <SelectTrigger><SelectValue placeholder="Select Organization" /></SelectTrigger>
                <SelectContent>
                  {villages.map(v => (
                    <SelectItem key={v.villageId} value={v.villageId}>{v.name} ({v.villageId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grace Period (Days)</Label>
              <Input type="number" min={0} value={formData.gracePeriodDays} onChange={e => setFormData({...formData, gracePeriodDays: parseInt(e.target.value) || 0})} />
            </div>
            {duration > 0 && (
              <div className="text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                Duration: {duration} days
              </div>
            )}
            <Button className="w-full" onClick={() => addSubMutation.mutate(formData)} disabled={addSubMutation.isPending || !formData.villageId || !formData.startDate || !formData.endDate}>
              {addSubMutation.isPending ? "Creating..." : "Create Subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSub && (() => {
              const { isStarted, isEnded } = getSubState(selectedSub);
              return (
                <>
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input disabled value={villages.find(v => v.villageId === formData.villageId)?.name || formData.villageId} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={formData.startDate} disabled={isStarted} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={formData.endDate} disabled={isEnded} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Grace Period (Days)</Label>
                    <Input type="number" min={0} disabled={isEnded} value={formData.gracePeriodDays} onChange={e => setFormData({...formData, gracePeriodDays: parseInt(e.target.value) || 0})} />
                  </div>
                  {isEnded && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      This subscription has ended and is read-only. Create a new subscription instead.
                    </div>
                  )}
                  {duration > 0 && (
                    <div className="text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                      Duration: {duration} days
                    </div>
                  )}
                  <Button className="w-full" onClick={handleEditSubmit} disabled={editSubMutation.isPending || isEnded}>
                    {editSubMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Subscription History</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {historyLoading ? (
              <p>Loading history...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2">Start Date</th>
                      <th className="px-4 py-2">End Date</th>
                      <th className="px-4 py-2">Grace Period</th>
                      <th className="px-4 py-2">Created At</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(sub => (
                      <tr key={sub.id} className="border-b">
                        <td className="px-4 py-2">{format(new Date(sub.startDate), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-2">{format(new Date(sub.endDate), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-2">{sub.gracePeriodDays} days</td>
                        <td className="px-4 py-2 text-gray-500">{format(new Date(sub.createdAt), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => { setIsHistoryOpen(false); handleEditOpen(sub); }}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No subscription history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
