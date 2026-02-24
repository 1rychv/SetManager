"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Music2, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { createSetlist } from "./actions";

interface SetlistRow {
  id: string;
  name: string;
  event_id: string | null;
  created_at: string;
  songs: { count: number }[];
  events: { name: string } | null;
}

export default function SetlistsPage() {
  const { profile } = useUser();
  const router = useRouter();
  const [setlists, setSetlists] = useState<SetlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const isOrganiser = profile?.role === "organiser";

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("setlists")
        .select("id, name, event_id, created_at, songs(count), events(name)")
        .order("created_at", { ascending: false });

      setSetlists((data as unknown as SetlistRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    await createSetlist(formData);
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 bg-muted rounded" />
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Setlists</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage setlists for your events
          </p>
        </div>
        {isOrganiser && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Setlist
          </Button>
        )}
      </div>

      {setlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Music2 className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No setlists yet</p>
            {isOrganiser && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                Create your first setlist
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {setlists.map((setlist) => {
            const songCount = setlist.songs?.[0]?.count ?? 0;
            return (
              <Card
                key={setlist.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/setlists/${setlist.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{setlist.name}</CardTitle>
                    <Badge variant="secondary">
                      {songCount} {songCount === 1 ? "song" : "songs"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {setlist.events && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {setlist.events.name}
                      </span>
                    )}
                    <span>
                      Created{" "}
                      {new Date(setlist.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create setlist dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Setlist</DialogTitle>
            <DialogDescription>
              Give your setlist a name to get started
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="setlist-name">Name</Label>
                <Input
                  id="setlist-name"
                  name="name"
                  placeholder="e.g. Sunday Worship"
                  required
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
