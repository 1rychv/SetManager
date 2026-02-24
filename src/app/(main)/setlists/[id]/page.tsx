"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Music2,
  Pencil,
  X,
  Check,
  Users,
  ArrowLeft,
  MicVocal,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  addSong,
  updateSong,
  removeSong,
  reorderSongs,
  deleteSetlist,
  updateSetlist,
  addSongRole,
  removeSongRole,
} from "../actions";
import type { SongWithRoles, SongRoleAssignment, EventMemberWithProfile } from "@/types";

// ─── Key color mapping ───

const KEY_COLORS: Record<string, string> = {
  C: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "C#": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  D: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  Eb: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  E: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  F: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "F#": "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  G: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Ab: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  A: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Bb: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  B: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

function getKeyColor(key: string) {
  const base = key.replace("m", "");
  return KEY_COLORS[base] ?? "bg-muted text-muted-foreground";
}

const MUSIC_KEYS = [
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
  "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "Abm", "Am", "Bbm", "Bm",
];

const COMMON_ROLES = [
  "Lead Vocals",
  "Backing Vocals",
  "Lead Guitar",
  "Acoustic Guitar",
  "Bass",
  "Keys",
  "Drums",
  "Sound",
  "Visuals",
];

// ─── Page Component ───

export default function SetlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { profile } = useUser();
  const [setlistId, setSetlistId] = useState<string>("");
  const [setlistName, setSetlistName] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongWithRoles[]>([]);
  const [teamMembers, setTeamMembers] = useState<EventMemberWithProfile[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [leftTab, setLeftTab] = useState<"songs" | "open-mic">("songs");

  const isOrganiser = profile?.role === "organiser";
  const selectedSong = songs.find((s) => s.id === selectedSongId) ?? null;
  const openMicSongs = songs.filter((s) => s.is_open_mic);
  const regularSongs = songs.filter((s) => !s.is_open_mic);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadSetlist = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { data: setlist } = await supabase
        .from("setlists")
        .select("id, name, event_id")
        .eq("id", id)
        .single();

      if (!setlist) {
        router.push("/setlists");
        return;
      }

      setSetlistName(setlist.name);
      setTitleValue(setlist.name);
      setEventId(setlist.event_id);

      // Load team members if linked to an event
      if (setlist.event_id) {
        const { data: members } = await supabase
          .from("event_members")
          .select("*, profiles(*)")
          .eq("event_id", setlist.event_id);

        setTeamMembers((members as unknown as EventMemberWithProfile[]) ?? []);
      }

      const { data: songsData } = await supabase
        .from("songs")
        .select("*, song_role_assignments(*)")
        .eq("setlist_id", id)
        .order("position", { ascending: true });

      setSongs((songsData as SongWithRoles[]) ?? []);
      setLoading(false);
    },
    [router]
  );

  useEffect(() => {
    params.then(({ id }) => {
      setSetlistId(id);
      loadSetlist(id);
    });
  }, [params, loadSetlist]);

  // ─── Setlist name handlers ───

  async function handleRenameSetlist() {
    if (!titleValue.trim() || titleValue === setlistName) {
      setTitleValue(setlistName);
      setEditingTitle(false);
      return;
    }
    const result = await updateSetlist(setlistId, { name: titleValue.trim() });
    if (result.error) {
      toast.error(result.error);
      setTitleValue(setlistName);
    } else {
      toast.success("Setlist renamed");
      setSetlistName(titleValue.trim());
    }
    setEditingTitle(false);
  }

  // ─── Song CRUD handlers ───

  async function handleAddSong(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await addSong(setlistId, {
      name: formData.get("name") as string,
      key: formData.get("key") as string,
      bpm: parseInt(formData.get("bpm") as string) || 120,
      arrangement_notes: (formData.get("arrangement_notes") as string) || "",
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Song added!");
      setAddDialogOpen(false);
      loadSetlist(setlistId);
    }
  }

  async function handleUpdateSong(
    songId: string,
    updates: { name?: string; key?: string; bpm?: number; arrangement_notes?: string }
  ) {
    const result = await updateSong(songId, updates);
    if (result.error) {
      toast.error(result.error);
    } else {
      const label = updates.name
        ? "Song name updated"
        : updates.key
          ? `Key changed to ${updates.key}`
          : updates.bpm !== undefined
            ? `BPM changed to ${updates.bpm}`
            : "Notes updated";
      toast.success(label);
      loadSetlist(setlistId);
    }
  }

  async function handleRemoveSong(songId: string) {
    const result = await removeSong(songId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Song removed");
      if (selectedSongId === songId) setSelectedSongId(null);
      loadSetlist(setlistId);
    }
  }

  async function handleDeleteSetlist() {
    await deleteSetlist(setlistId);
  }

  // ─── Role handlers ───

  async function handleAddRole(
    songId: string,
    role: string,
    personId: string,
    personName: string
  ) {
    const result = await addSongRole(songId, {
      role,
      person_id: personId,
      person_name: personName,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${personName} assigned as ${role}`);
      loadSetlist(setlistId);
    }
  }

  async function handleRemoveRole(roleId: string) {
    const result = await removeSongRole(roleId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Role removed");
      loadSetlist(setlistId);
    }
  }

  // ─── Drag & drop handler ───

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Work on the currently displayed list (regular songs only — open mic stays separate)
    const currentList = [...regularSongs];
    const oldIndex = currentList.findIndex((s) => s.id === active.id);
    const newIndex = currentList.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic reorder in local state
    const [moved] = currentList.splice(oldIndex, 1);
    currentList.splice(newIndex, 0, moved);

    // Rebuild the full song list with updated positions
    const reordered = currentList.map((s, i) => ({ ...s, position: i + 1 }));
    const newSongs = [...reordered, ...openMicSongs];
    setSongs(newSongs);

    // Persist to database
    const updates = reordered.map((s) => ({ id: s.id, position: s.position }));
    const result = await reorderSongs(updates);
    if (result.error) {
      toast.error(result.error);
      loadSetlist(setlistId); // revert on failure
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/setlists")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            {editingTitle && isOrganiser ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="h-8 text-lg font-semibold w-56"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSetlist();
                    if (e.key === "Escape") {
                      setTitleValue(setlistName);
                      setEditingTitle(false);
                    }
                  }}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRenameSetlist}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    setTitleValue(setlistName);
                    setEditingTitle(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{setlistName}</h1>
                {isOrganiser && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditingTitle(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {songs.length} {songs.length === 1 ? "song" : "songs"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOrganiser && (
            <>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Song
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — Song list with tabs */}
        <div className="w-full md:w-[55%] border-r border-border flex flex-col">
          {/* Tabs */}
          <div className="px-3 pt-3">
            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as "songs" | "open-mic")}>
              <TabsList className="w-full">
                <TabsTrigger value="songs" className="flex-1">
                  <Music2 className="w-3.5 h-3.5 mr-1.5" />
                  Songs
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {regularSongs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="open-mic" className="flex-1">
                  <MicVocal className="w-3.5 h-3.5 mr-1.5" />
                  Open Mic
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                    {openMicSongs.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            {leftTab === "songs" ? (
              regularSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <Music2 className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No songs yet</p>
                  {isOrganiser && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setAddDialogOpen(true)}
                    >
                      Add your first song
                    </Button>
                  )}
                </div>
              ) : isOrganiser ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={regularSongs.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="p-2">
                      {regularSongs.map((song, index) => (
                        <SortableSongCard
                          key={song.id}
                          song={song}
                          index={index + 1}
                          isSelected={selectedSongId === song.id}
                          isOrganiser={isOrganiser}
                          onSelect={() => setSelectedSongId(song.id)}
                          onDelete={() => handleRemoveSong(song.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="p-2">
                  {regularSongs.map((song, index) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      index={index + 1}
                      isSelected={selectedSongId === song.id}
                      isOrganiser={isOrganiser}
                      onSelect={() => setSelectedSongId(song.id)}
                      onDelete={() => handleRemoveSong(song.id)}
                    />
                  ))}
                </div>
              )
            ) : (
              openMicSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <MicVocal className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No open mic songs yet</p>
                  {!eventId && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Attach this setlist to an event with open mic enabled to add performers
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {openMicSongs.map((song, index) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      index={index + 1}
                      isSelected={selectedSongId === song.id}
                      isOrganiser={isOrganiser}
                      onSelect={() => setSelectedSongId(song.id)}
                      onDelete={() => handleRemoveSong(song.id)}
                    />
                  ))}
                </div>
              )
            )}
          </ScrollArea>
        </div>

        {/* Right panel — Detail view */}
        <div className="hidden md:block md:w-[45%]">
          <ScrollArea className="h-full">
            {selectedSong ? (
              <SongDetail
                song={selectedSong}
                isOrganiser={isOrganiser}
                teamMembers={teamMembers}
                onUpdate={(updates) =>
                  handleUpdateSong(selectedSong.id, updates)
                }
                onAddRole={(role, personId, personName) =>
                  handleAddRole(selectedSong.id, role, personId, personName)
                }
                onRemoveRole={handleRemoveRole}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                <Music2 className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Select a song to view details and manage roles
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Mobile: detail shown below when selected */}
      {selectedSong && (
        <div className="md:hidden border-t border-border">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
            <span className="text-sm font-medium">{selectedSong.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedSongId(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="max-h-[50vh]">
            <SongDetail
              song={selectedSong}
              isOrganiser={isOrganiser}
              teamMembers={teamMembers}
              onUpdate={(updates) =>
                handleUpdateSong(selectedSong.id, updates)
              }
              onAddRole={(role, personId, personName) =>
                handleAddRole(selectedSong.id, role, personId, personName)
              }
              onRemoveRole={handleRemoveRole}
            />
          </ScrollArea>
        </div>
      )}

      {/* Add song dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Song</DialogTitle>
            <DialogDescription>
              Add a new song to this setlist
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSong}>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="song-name">Song name</Label>
                <Input
                  id="song-name"
                  name="name"
                  placeholder="e.g. Way Maker"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="song-key">Key</Label>
                  <Select name="key" defaultValue="C">
                    <SelectTrigger id="song-key">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSIC_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="song-bpm">BPM</Label>
                  <Input
                    id="song-bpm"
                    name="bpm"
                    type="number"
                    min={30}
                    max={300}
                    defaultValue={120}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="song-notes">Arrangement notes</Label>
                <Textarea
                  id="song-notes"
                  name="arrangement_notes"
                  placeholder="Optional notes about the arrangement..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Song</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete setlist confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Setlist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{setlistName}&quot;? This
              will also remove all songs in it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSetlist}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Song Card (left panel) ───

interface SongCardProps {
  song: SongWithRoles;
  index: number;
  isSelected: boolean;
  isOrganiser: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SongCardContent({
  song,
  index,
  isSelected,
  isOrganiser,
  onSelect,
  onDelete,
  dragHandle,
}: SongCardProps & { dragHandle?: React.ReactNode }) {
  const roles = song.song_role_assignments ?? [];

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
        isSelected
          ? "border-l-3 border-l-primary bg-primary/5"
          : "hover:bg-muted/50"
      } ${song.is_open_mic ? "border-l-3 border-l-teal-500" : ""}`}
    >
      {dragHandle}

      <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
        {index}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{song.name}</span>
          {song.is_open_mic && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-teal-500 text-teal-600 dark:text-teal-400"
            >
              Open Mic
            </Badge>
          )}
        </div>

        {/* Role avatars */}
        {roles.length > 0 && (
          <div className="flex items-center mt-1">
            <div className="flex -space-x-1.5">
              {roles.slice(0, 3).map((r) => (
                <Avatar key={r.id} className="w-5 h-5 border border-background">
                  <AvatarFallback className="text-[9px]">
                    {r.person_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {roles.length > 3 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                +{roles.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getKeyColor(song.key)}`}>
          {song.key}
        </Badge>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {song.bpm}
        </Badge>
        {isOrganiser && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SongCard(props: SongCardProps) {
  return <SongCardContent {...props} />;
}

// ─── Sortable Song Card (drag & drop) ───

function SortableSongCard(props: SongCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : undefined,
  };

  const dragHandle = (
    <button
      className="touch-none shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <SongCardContent {...props} dragHandle={dragHandle} />
    </div>
  );
}

// ─── Song Detail (right panel) ───

function SongDetail({
  song,
  isOrganiser,
  teamMembers,
  onUpdate,
  onAddRole,
  onRemoveRole,
}: {
  song: SongWithRoles;
  isOrganiser: boolean;
  teamMembers: EventMemberWithProfile[];
  onUpdate: (updates: {
    name?: string;
    key?: string;
    bpm?: number;
    arrangement_notes?: string;
  }) => void;
  onAddRole: (role: string, personId: string, personName: string) => void;
  onRemoveRole: (roleId: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingBpm, setEditingBpm] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [nameValue, setNameValue] = useState(song.name);
  const [bpmValue, setBpmValue] = useState(String(song.bpm));
  const [notesValue, setNotesValue] = useState(song.arrangement_notes);
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newPersonId, setNewPersonId] = useState("");
  const [newPersonName, setNewPersonName] = useState("");

  const roles = song.song_role_assignments ?? [];

  // Reset local state when song changes
  useEffect(() => {
    setNameValue(song.name);
    setBpmValue(String(song.bpm));
    setNotesValue(song.arrangement_notes);
    setEditingName(false);
    setEditingBpm(false);
    setEditingNotes(false);
    setAddingRole(false);
  }, [song.id, song.name, song.bpm, song.arrangement_notes]);

  function handlePersonSelect(value: string) {
    if (value === "custom") {
      setNewPersonId("manual");
      setNewPersonName("");
      return;
    }
    const member = teamMembers.find((m) => m.user_id === value);
    if (member) {
      setNewPersonId(member.user_id);
      setNewPersonName(member.profiles.name);
    }
  }

  return (
    <div className="p-5 space-y-5">
      {/* Song name */}
      <div>
        {editingName && isOrganiser ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="text-lg font-semibold h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdate({ name: nameValue });
                  setEditingName(false);
                }
                if (e.key === "Escape") {
                  setNameValue(song.name);
                  setEditingName(false);
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                onUpdate({ name: nameValue });
                setEditingName(false);
              }}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setNameValue(song.name);
                setEditingName(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{song.name}</h2>
            {isOrganiser && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setEditingName(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Key and BPM */}
      <div className="flex items-center gap-3">
        {isOrganiser ? (
          <Select
            value={song.key}
            onValueChange={(value) => onUpdate({ key: value })}
          >
            <SelectTrigger className={`w-20 h-8 text-xs ${getKeyColor(song.key)}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MUSIC_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge className={getKeyColor(song.key)}>{song.key}</Badge>
        )}

        {editingBpm && isOrganiser ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={bpmValue}
              onChange={(e) => setBpmValue(e.target.value)}
              className="w-20 h-8 text-xs"
              min={30}
              max={300}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdate({ bpm: parseInt(bpmValue) || song.bpm });
                  setEditingBpm(false);
                }
                if (e.key === "Escape") {
                  setBpmValue(String(song.bpm));
                  setEditingBpm(false);
                }
              }}
            />
            <span className="text-xs text-muted-foreground">BPM</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => {
                onUpdate({ bpm: parseInt(bpmValue) || song.bpm });
                setEditingBpm(false);
              }}
            >
              <Check className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Badge
            variant="secondary"
            className={isOrganiser ? "cursor-pointer" : ""}
            onClick={() => isOrganiser && setEditingBpm(true)}
          >
            {song.bpm} BPM
          </Badge>
        )}
      </div>

      <Separator />

      {/* Arrangement notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Arrangement Notes</Label>
          {isOrganiser && !editingNotes && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setEditingNotes(true)}
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
        {editingNotes && isOrganiser ? (
          <div className="space-y-2">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onUpdate({ arrangement_notes: notesValue });
                  setEditingNotes(false);
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNotesValue(song.arrangement_notes);
                  setEditingNotes(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {song.arrangement_notes || "No notes yet."}
          </p>
        )}
      </div>

      <Separator />

      {/* Roles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <Label className="text-sm font-medium">Roles</Label>
            <Badge variant="secondary" className="text-[10px]">
              {roles.length}
            </Badge>
          </div>
          {isOrganiser && !addingRole && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setAddingRole(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          )}
        </div>

        {roles.length === 0 && !addingRole && (
          <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
        )}

        <div className="space-y-2">
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              isOrganiser={isOrganiser}
              onRemove={() => onRemoveRole(role.id)}
            />
          ))}
        </div>

        {/* Add role form */}
        {addingRole && isOrganiser && (
          <Card className="mt-3">
            <CardContent className="p-3 space-y-3">
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Person</Label>
                {teamMembers.length > 0 ? (
                  <>
                    <Select onValueChange={handlePersonSelect}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select a person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Team Members</SelectLabel>
                          {teamMembers.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.profiles.name}
                              {m.event_role ? ` (${m.event_role})` : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Other</SelectLabel>
                          <SelectItem value="custom">Enter name manually</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {newPersonId === "manual" && (
                      <Input
                        className="h-8 text-xs"
                        placeholder="Enter name"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        autoFocus
                      />
                    )}
                  </>
                ) : (
                  <Input
                    className="h-8 text-xs"
                    placeholder="Enter name"
                    value={newPersonName}
                    onChange={(e) => {
                      setNewPersonName(e.target.value);
                      setNewPersonId("manual");
                    }}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!newRole || !newPersonName}
                  onClick={() => {
                    onAddRole(newRole, newPersonId || "manual", newPersonName);
                    setNewRole("");
                    setNewPersonId("");
                    setNewPersonName("");
                    setAddingRole(false);
                  }}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAddingRole(false);
                    setNewRole("");
                    setNewPersonId("");
                    setNewPersonName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Role Row ───

function RoleRow({
  role,
  isOrganiser,
  onRemove,
}: {
  role: SongRoleAssignment;
  isOrganiser: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 py-1.5">
      <Avatar className="w-7 h-7">
        <AvatarFallback
          className={`text-[10px] ${
            role.is_open_mic_performer
              ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
              : ""
          }`}
        >
          {role.person_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{role.person_name}</p>
        <p className="text-xs text-muted-foreground">{role.role}</p>
      </div>
      {isOrganiser && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
