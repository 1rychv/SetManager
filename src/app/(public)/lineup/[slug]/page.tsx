"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  MicVocal,
  CalendarDays,
  Clock,
  MapPin,
  Music2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Event, OpenMicApplication } from "@/types";

export default function LineupPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [performers, setPerformers] = useState<OpenMicApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch event by slug
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("open_mic_enabled", true)
        .single();

      if (!eventData) {
        setLoading(false);
        return;
      }

      setEvent(eventData as Event);

      // Fetch approved applications (anon can see approved via RLS)
      const { data: apps } = await supabase
        .from("open_mic_applications")
        .select("*")
        .eq("event_id", eventData.id)
        .eq("status", "approved")
        .order("submitted_at", { ascending: true });

      setPerformers((apps as OpenMicApplication[]) || []);
      setLoading(false);
    }

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center text-muted-foreground py-16">
        Loading...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center py-16">
        <MicVocal className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-lg" style={{ fontWeight: 600 }}>
          Event Not Found
        </h2>
        <p className="text-muted-foreground mt-2">
          This event doesn&apos;t exist or open mic is not enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      {/* Event Header */}
      <div className="text-center mb-8">
        <MicVocal className="w-10 h-10 mx-auto mb-3 text-purple-600" />
        <h1 className="text-xl" style={{ fontWeight: 600 }}>
          Open Mic Lineup
        </h1>
        <h2 className="text-lg text-muted-foreground mt-1">{event.name}</h2>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-3">
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

      {performers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Music2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No performers announced yet</p>
          <p className="text-sm mt-1">Check back closer to the event!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {performers.map((performer, idx) => (
            <div
              key={performer.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm shrink-0" style={{ fontWeight: 600 }}>
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm" style={{ fontWeight: 500 }}>
                  {performer.full_name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Music2 className="w-3 h-3" />
                  {performer.song}
                </p>
              </div>
            </div>
          ))}
          <p className="text-xs text-center text-muted-foreground pt-2">
            {performers.length} performer{performers.length !== 1 ? "s" : ""} confirmed
          </p>
        </div>
      )}
    </div>
  );
}
