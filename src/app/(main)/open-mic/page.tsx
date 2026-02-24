"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  MicVocal,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  Music2,
  Guitar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { updateApplicationStatus } from "./actions";
import type { OpenMicApplication, ApplicationStatus, Event } from "@/types";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return format(date, "MMM d, yyyy");
}

function statusBadge(status: ApplicationStatus) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
  }
}

type AppWithEvent = OpenMicApplication & {
  events: Pick<Event, "name"> | null;
};

export default function OpenMicPage() {
  const router = useRouter();
  const { profile } = useUser();
  const isOrganiser = profile?.role === "organiser";

  const [applications, setApplications] = useState<AppWithEvent[]>([]);
  const [openMicEvents, setOpenMicEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState("all");

  // Detail modal
  const [detailApp, setDetailApp] = useState<AppWithEvent | null>(null);
  const [notes, setNotes] = useState("");

  const fetchApplications = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("open_mic_applications")
      .select("*, events!open_mic_applications_event_id_fkey(name)")
      .order("submitted_at", { ascending: false });

    setApplications((data as AppWithEvent[]) || []);
  }, []);

  const fetchEvents = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("open_mic_enabled", true)
      .order("date", { ascending: false });

    setOpenMicEvents((data as Event[]) || []);
  }, []);

  useEffect(() => {
    Promise.all([fetchApplications(), fetchEvents()]).then(() =>
      setLoading(false)
    );
  }, [fetchApplications, fetchEvents]);

  const filtered =
    selectedEvent === "all"
      ? applications
      : applications.filter((a) => a.event_id === selectedEvent);

  const pending = filtered.filter((a) => a.status === "pending");
  const approved = filtered.filter((a) => a.status === "approved");
  const rejected = filtered.filter((a) => a.status === "rejected");

  async function handleAction(appId: string, status: ApplicationStatus) {
    const result = await updateApplicationStatus(appId, status, notes || undefined);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      status === "approved" ? "Application approved!" : "Application rejected."
    );
    setDetailApp(null);
    setNotes("");
    fetchApplications();
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 text-center text-muted-foreground">
        Loading applications...
      </div>
    );
  }

  if (!isOrganiser) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto text-center">
        <MicVocal className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground">
          Only organisers can manage open mic applications.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard")}
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  function AppCard({ app }: { app: AppWithEvent }) {
    return (
      <div
        className="p-4 rounded-xl border bg-card hover:shadow-sm transition-all cursor-pointer"
        onClick={() => {
          setDetailApp(app);
          setNotes(app.organiser_notes || "");
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p style={{ fontWeight: 500 }}>{app.full_name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {app.events?.name} &middot; {formatRelativeTime(app.submitted_at)}
            </p>
          </div>
          {statusBadge(app.status)}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Music2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{app.song}</span>
          </div>
          {app.instrument_needs && (
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                <Guitar className="w-3 h-3 mr-1" />
                {app.instrument_needs.length > 40
                  ? app.instrument_needs.slice(0, 40) + "..."
                  : app.instrument_needs}
              </Badge>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {app.email}
            </span>
            {app.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {app.phone}
              </span>
            )}
          </div>
        </div>
        {app.status !== "approved" && app.status !== "rejected" ? (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(app.id, "approved");
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(app.id, "rejected");
              }}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          </div>
        ) : app.status === "rejected" ? (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(app.id, "approved");
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Approve Instead
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleAction(app.id, "rejected");
              }}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reject Instead
            </Button>
          </div>
        )}
      </div>
    );
  }

  function EmptyState({ message }: { message: string }) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MicVocal className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1>Open Mic Applications</h1>
      </div>

      {/* Filter + Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="w-full md:w-[250px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {openMicEvents.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 text-sm">
          <span
            className="text-amber-600 dark:text-amber-400"
            style={{ fontWeight: 500 }}
          >
            {pending.length} Pending
          </span>
          <span className="text-muted-foreground/50">&middot;</span>
          <span
            className="text-green-600 dark:text-green-400"
            style={{ fontWeight: 500 }}
          >
            {approved.length} Approved
          </span>
          <span className="text-muted-foreground/50">&middot;</span>
          <span
            className="text-red-600 dark:text-red-400"
            style={{ fontWeight: 500 }}
          >
            {rejected.length} Rejected
          </span>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejected.length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? (
            <EmptyState message="No pending applications" />
          ) : (
            pending.map((app) => <AppCard key={app.id} app={app} />)
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-3">
          {approved.length === 0 ? (
            <EmptyState message="No approved applications" />
          ) : (
            approved.map((app) => <AppCard key={app.id} app={app} />)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-3">
          {rejected.length === 0 ? (
            <EmptyState message="No rejected applications" />
          ) : (
            rejected.map((app) => <AppCard key={app.id} app={app} />)
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState message="No applications yet" />
          ) : (
            filtered.map((app) => <AppCard key={app.id} app={app} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog
        open={!!detailApp}
        onOpenChange={(open) => {
          if (!open) setDetailApp(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review this open mic application
            </DialogDescription>
          </DialogHeader>
          {detailApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="text-sm" style={{ fontWeight: 500 }}>
                    {detailApp.full_name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{statusBadge(detailApp.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-sm">{detailApp.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="text-sm">{detailApp.phone || "Not provided"}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Song</Label>
                <p className="text-sm" style={{ fontWeight: 500 }}>
                  {detailApp.song}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Instrument / Backing Track Needs
                </Label>
                <p className="text-sm whitespace-pre-wrap">
                  {detailApp.instrument_needs || "None specified"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Event</Label>
                <p className="text-sm">
                  {detailApp.events?.name || "Unknown"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="text-sm">
                  {format(
                    new Date(detailApp.submitted_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Organiser Notes (internal)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailApp && detailApp.status !== "approved" && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAction(detailApp.id, "approved")}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {detailApp.status === "rejected" ? "Approve Instead" : "Approve"}
              </Button>
            )}
            {detailApp && detailApp.status !== "rejected" && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200"
                onClick={() => handleAction(detailApp.id, "rejected")}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {detailApp.status === "approved" ? "Reject Instead" : "Reject"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailApp(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
