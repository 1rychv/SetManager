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
  FileText,
  Image as ImageIcon,
  Music,
  Download,
  Upload,
  Link2,
  Unlink,
  ExternalLink,
  X,
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
import { attachFileToEvent, detachFileFromEvent } from "../../files/actions";
import { updateSetlist } from "../../setlists/actions";
import type { Event, EventMember, Profile, RSVPStatus, FileWithUploader, FileType, Setlist, SongWithRoles } from "@/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function fileTypeIcon(type: FileType) {
  switch (type) {
    case "document":
      return <FileText className="w-5 h-5" />;
    case "image":
      return <ImageIcon className="w-5 h-5" />;
    case "audio":
      return <Music className="w-5 h-5" />;
  }
}

function fileTypeBg(type: FileType) {
  switch (type) {
    case "document":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "image":
      return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "audio":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
  }
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

  // Setlist tab state
  const [eventSetlist, setEventSetlist] = useState<(Setlist & { songs: SongWithRoles[] }) | null>(null);
  const [unattachedSetlists, setUnattachedSetlists] = useState<(Setlist & { songs: { count: number }[] })[]>([]);
  const [attachSetlistDialogOpen, setAttachSetlistDialogOpen] = useState(false);
  const [attachSetlistId, setAttachSetlistId] = useState("");

  // Files tab state
  const [eventFiles, setEventFiles] = useState<FileWithUploader[]>([]);
  const [unattachedFiles, setUnattachedFiles] = useState<FileWithUploader[]>([]);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachFileId, setAttachFileId] = useState("");

  const isOrganiser = profile?.role === "organiser";

  useEffect(() => {
    let ignore = false;
    async function fetchEvent() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*, event_members(*, profiles(name, avatar_url))")
        .eq("id", id)
        .single();

      if (!ignore) {
        setEvent(data as EventFull | null);
        setLoading(false);
      }
    }

    fetchEvent();
    return () => { ignore = true; };
  }, [id]);

  // Fetch setlist attached to this event
  async function fetchEventSetlist() {
    const supabase = createClient();
    const { data } = await supabase
      .from("setlists")
      .select("*, songs(*, song_role_assignments(*))")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setEventSetlist(data as (Setlist & { songs: SongWithRoles[] }) | null);
  }

  // Fetch unattached setlists for the attach dialog
  async function fetchUnattachedSetlists() {
    const supabase = createClient();
    const { data } = await supabase
      .from("setlists")
      .select("*, songs(count)")
      .is("event_id", null)
      .order("created_at", { ascending: false });
    setUnattachedSetlists((data as (Setlist & { songs: { count: number }[] })[]) || []);
  }

  // Fetch files attached to this event
  async function fetchEventFiles() {
    const supabase = createClient();
    const { data } = await supabase
      .from("files")
      .select("*, profiles!files_uploader_id_fkey(name)")
      .eq("event_id", id)
      .order("created_at", { ascending: false });
    setEventFiles((data as FileWithUploader[]) || []);
  }

  // Fetch unattached files for the attach dialog
  async function fetchUnattachedFiles() {
    const supabase = createClient();
    const { data } = await supabase
      .from("files")
      .select("*, profiles!files_uploader_id_fkey(name)")
      .is("event_id", null)
      .order("created_at", { ascending: false });
    setUnattachedFiles((data as FileWithUploader[]) || []);
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      const supabase = createClient();
      const [setlistRes, filesRes] = await Promise.all([
        supabase
          .from("setlists")
          .select("*, songs(*, song_role_assignments(*))")
          .eq("event_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("files")
          .select("*, profiles!files_uploader_id_fkey(name)")
          .eq("event_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (!ignore) {
        setEventSetlist(setlistRes.data as (Setlist & { songs: SongWithRoles[] }) | null);
        setEventFiles((filesRes.data as FileWithUploader[]) || []);
      }
    }
    if (id) {
      load();
    }
    return () => { ignore = true; };
  }, [id]);

  async function handleAttachSetlist() {
    if (!attachSetlistId) return;
    const result = await updateSetlist(attachSetlistId, { event_id: id });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Setlist attached!");
      fetchEventSetlist();
    }
    setAttachSetlistDialogOpen(false);
    setAttachSetlistId("");
  }

  async function handleDetachSetlist() {
    if (!eventSetlist) return;
    const result = await updateSetlist(eventSetlist.id, { event_id: null });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Setlist detached.");
      fetchEventSetlist();
    }
  }

  async function handleDownloadFile(file: FileWithUploader) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("files")
      .createSignedUrl(file.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleAttachFile() {
    if (!attachFileId) return;
    const result = await attachFileToEvent(attachFileId, id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("File attached!");
      fetchEventFiles();
    }
    setAttachDialogOpen(false);
    setAttachFileId("");
  }

  async function handleDetachFile(fileId: string) {
    const result = await detachFileFromEvent(fileId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("File detached.");
      fetchEventFiles();
    }
  }

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
            <div className="p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 space-y-3">
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                Open Mic Enabled
              </Badge>
              <div className="grid grid-cols-2 gap-2">
                {isOrganiser && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/open-mic")}
                  >
                    View Applications
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(`/lineup/${event.slug}`, "_blank")
                  }
                >
                  View Lineup
                </Button>
                <Button size="sm" variant="outline" className="col-span-2" onClick={copyPublicLink}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Link
                </Button>
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
                    <div className="flex items-center gap-2 shrink-0">
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
          {eventSetlist ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 style={{ fontWeight: 600 }}>{eventSetlist.name}</h3>
                  <Badge variant="secondary">
                    {eventSetlist.songs.length}{" "}
                    {eventSetlist.songs.length === 1 ? "song" : "songs"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/setlists/${eventSetlist.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open
                  </Button>
                  {isOrganiser && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDetachSetlist}
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1.5" />
                      Detach
                    </Button>
                  )}
                </div>
              </div>

              {eventSetlist.songs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No songs in this setlist yet.{" "}
                  <button
                    className="underline hover:text-foreground"
                    onClick={() => router.push(`/setlists/${eventSetlist.id}`)}
                  >
                    Add some
                  </button>
                </p>
              ) : (
                <div className="space-y-1">
                  {[...eventSetlist.songs]
                    .sort((a, b) => a.position - b.position)
                    .map((song, idx) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-xs text-muted-foreground w-6 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate" style={{ fontWeight: 500 }}>
                            {song.name}
                          </p>
                        </div>
                        {song.key && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {song.key}
                          </Badge>
                        )}
                        {song.bpm > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {song.bpm} BPM
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Music2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No setlist attached</p>
              {isOrganiser && (
                <div className="flex justify-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      fetchUnattachedSetlists();
                      setAttachSetlistDialogOpen(true);
                    }}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Attach Setlist
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/setlists")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Setlist
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          {isOrganiser && (
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchUnattachedFiles();
                  setAttachDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Attach Existing File
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/files")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New
              </Button>
            </div>
          )}

          {eventFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No files attached to this event</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fileTypeBg(file.type)}`}
                  >
                    {fileTypeIcon(file.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate" style={{ fontWeight: 500 }}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.size} &middot; {file.profiles?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownloadFile(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {isOrganiser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDetachFile(file.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Attach Setlist Dialog */}
      <Dialog open={attachSetlistDialogOpen} onOpenChange={setAttachSetlistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Setlist</DialogTitle>
            <DialogDescription>
              Choose an unattached setlist from your library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {unattachedSetlists.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No unattached setlists available. Create one first.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Setlist</Label>
                <Select value={attachSetlistId} onValueChange={setAttachSetlistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a setlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {unattachedSetlists.map((s) => {
                      const count = s.songs?.[0]?.count ?? 0;
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({count} {count === 1 ? "song" : "songs"})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttachSetlistDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAttachSetlist}
              disabled={!attachSetlistId || unattachedSetlists.length === 0}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attach File Dialog */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach File</DialogTitle>
            <DialogDescription>
              Choose an unattached file from the library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {unattachedFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No unattached files available. Upload one first.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>File</Label>
                <Select value={attachFileId} onValueChange={setAttachFileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a file" />
                  </SelectTrigger>
                  <SelectContent>
                    {unattachedFiles.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.size})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttachDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAttachFile}
              disabled={!attachFileId || unattachedFiles.length === 0}
            >
              Attach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
