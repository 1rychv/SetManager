"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Music2,
  FolderOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit,
  Copy,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { updateRSVP, assignRole } from "../actions";
import type { Event, EventMember, Profile, RSVPStatus } from "@/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type MemberWithProfile = EventMember & { profiles: Pick<Profile, "name" | "avatar_url"> };
type EventFull = Event & { event_members: MemberWithProfile[] };

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useUser();
  const [event, setEvent] = useState<EventFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [assignedRole, setAssignedRole] = useState("");

  const isOrganiser = profile?.role === "organiser";

  useEffect(() => {
    async function fetchEvent() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*, event_members(*, profiles(name, avatar_url))")
        .eq("id", id)
        .single();

      setEvent(data as EventFull | null);
      setLoading(false);
    }

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Event not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/events")}
        >
          Back to Events
        </Button>
      </div>
    );
  }

  const myMember = event.event_members.find(
    (m) => m.user_id === profile?.id
  );
  const myRSVP: RSVPStatus = (myMember?.rsvp as RSVPStatus) || "pending";
  const confirmedCount = event.event_members.filter(
    (m) => m.rsvp === "confirmed"
  ).length;

  const rsvpColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "declined":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "maybe":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  async function handleRSVP(status: RSVPStatus) {
    const result = await updateRSVP(event!.id, status);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`RSVP updated to ${status}`);
      // Refresh event data
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*, event_members(*, profiles(name, avatar_url))")
        .eq("id", id)
        .single();
      setEvent(data as EventFull | null);
    }
  }

  async function handleAssignRole() {
    if (selectedMember && assignedRole) {
      const result = await assignRole(
        event!.id,
        selectedMember.userId,
        assignedRole
      );
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Role assigned to ${selectedMember.name}`);
        // Refresh
        const supabase = createClient();
        const { data } = await supabase
          .from("events")
          .select("*, event_members(*, profiles(name, avatar_url))")
          .eq("id", id)
          .single();
        setEvent(data as EventFull | null);
      }
      setAssignModalOpen(false);
      setAssignedRole("");
      setSelectedMember(null);
    }
  }

  const copyPublicLink = () => {
    const link = `${window.location.origin}/apply/${event.slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied!");
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <BackButton href="/events" label="Events" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1>{event.name}</h1>
            {isOrganiser && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/events/${event.id}/edit`)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {format(parseISO(event.date), "EEEE, MMMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {event.start_time?.slice(0, 5)} - {event.end_time?.slice(0, 5)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {event.venue}
            </span>
          </div>
        </div>

        {/* RSVP buttons */}
        <div className="flex gap-2 shrink-0">
          {(["confirmed", "maybe", "declined"] as RSVPStatus[]).map(
            (status) => {
              const labels: Record<string, string> = {
                confirmed: "Going",
                maybe: "Maybe",
                declined: "Can't Make It",
              };
              const isSelected = myRSVP === status;
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className={
                    isSelected && status === "confirmed"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : isSelected && status === "declined"
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : isSelected && status === "maybe"
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : ""
                  }
                  onClick={() => handleRSVP(status)}
                >
                  {labels[status]}
                </Button>
              );
            }
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="setlist">
            <Music2 className="w-3.5 h-3.5 mr-1.5" />
            Setlist
          </TabsTrigger>
          <TabsTrigger value="files">
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            Files
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {event.description && (
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Open Mic section */}
          {event.open_mic_enabled && (
            <div className="p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  Open Mic Enabled
                </Badge>
                <div className="flex gap-2">
                  {isOrganiser && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push("/open-mic")}
                    >
                      View Applications
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={copyPublicLink}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Team Roster */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team ({confirmedCount}/{event.event_members.length} confirmed)
              </h3>
            </div>
            {event.event_members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No team members yet. RSVP to join!
              </p>
            ) : (
              <div className="space-y-1">
                {event.event_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profiles?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p
                          className="text-sm truncate"
                          style={{ fontWeight: 500 }}
                        >
                          {member.profiles?.name}
                        </p>
                        {member.event_role && (
                          <p className="text-xs text-muted-foreground">
                            {member.event_role}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={rsvpColor(member.rsvp)}
                      >
                        {member.rsvp === "confirmed" && (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        )}
                        {member.rsvp === "declined" && (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {member.rsvp === "maybe" && (
                          <HelpCircle className="w-3 h-3 mr-1" />
                        )}
                        {member.rsvp.charAt(0).toUpperCase() +
                          member.rsvp.slice(1)}
                      </Badge>
                      {isOrganiser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMember({
                              userId: member.user_id,
                              name: member.profiles?.name || "",
                            });
                            setAssignedRole(member.event_role || "");
                            setAssignModalOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Setlist Tab */}
        <TabsContent value="setlist">
          <div className="text-center py-12 text-muted-foreground">
            <Music2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No setlist attached</p>
            {isOrganiser && (
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => router.push("/setlists")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Setlist
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No files attached to this event</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => router.push("/files")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Attach File
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Assign Role Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Set the role for {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Input value={selectedMember?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Worship Leader",
                    "Lead Vocals",
                    "Backing Vocals",
                    "Lead Guitar",
                    "Acoustic Guitar",
                    "Bass",
                    "Keys",
                    "Drums",
                    "Sound",
                    "Visuals",
                    "Host / MC",
                  ].map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignRole}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
