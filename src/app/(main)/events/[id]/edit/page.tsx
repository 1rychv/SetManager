"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { createClient } from "@/lib/supabase/client";
import { updateEvent } from "../../actions";
import type { Event } from "@/types";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [openMicEnabled, setOpenMicEnabled] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function fetchEvent() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single<Event>();

      if (data) {
        setEvent(data);
        setName(data.name);
        setDate(data.date);
        setStartTime(data.start_time);
        setEndTime(data.end_time);
        setVenue(data.venue);
        setDescription(data.description);
        setOpenMicEnabled(data.open_mic_enabled);
      }
      setFetching(false);
    }

    fetchEvent();
  }, [id]);

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("id", id);
    formData.set("openMicEnabled", String(openMicEnabled));

    const result = await updateEvent(formData);

    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
      setLoading(false);
    }
  }

  const copyPublicLink = () => {
    const link = `${window.location.origin}/apply/${event?.slug || slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Public link copied!");
  };

  if (fetching) {
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

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <BackButton href={`/events/${id}`} label="Event" />

      <h1 className="mb-6">Edit Event</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Event name *</Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunday Worship Service"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue *</Label>
              <Input
                id="venue"
                name="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Grace Community Church"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add event details, instructions, etc."
                className="min-h-[120px]"
              />
            </div>

            <div className="p-4 rounded-xl border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Open Mic Applications</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allow the public to submit applications via a shareable link
                  </p>
                </div>
                <Switch
                  checked={openMicEnabled}
                  onCheckedChange={setOpenMicEnabled}
                />
              </div>

              {openMicEnabled && name && (
                <div className="p-3 rounded-lg bg-muted flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <code className="text-xs text-muted-foreground flex-1 truncate">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : ""}
                    /apply/{event.slug}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyPublicLink}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/events/${id}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
