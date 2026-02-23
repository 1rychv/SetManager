"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, compareAsc, compareDesc } from "date-fns";
import { Plus, CalendarDays, MapPin, Users, MicVocal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import type { Event, EventMember, Profile } from "@/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type EventWithMembers = Event & {
  event_members: (EventMember & { profiles: Pick<Profile, "name"> })[];
};

export default function EventsPage() {
  const router = useRouter();
  const { profile } = useUser();
  const [events, setEvents] = useState<EventWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const isOrganiser = profile?.role === "organiser";

  useEffect(() => {
    async function fetchEvents() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*, event_members(*, profiles(name))")
        .order("date", { ascending: true });

      setEvents((data as EventWithMembers[]) || []);
      setLoading(false);
    }

    fetchEvents();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
  const past = events
    .filter((e) => e.date < today)
    .sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date)));

  const confirmedCount = (event: EventWithMembers) =>
    event.event_members.filter((m) => m.rsvp === "confirmed").length;

  const EventCard = ({ event }: { event: EventWithMembers }) => (
    <div
      className="p-4 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer group"
      onClick={() => router.push(`/events/${event.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {format(parseISO(event.date), "EEE, MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {event.venue}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {confirmedCount(event)}/{event.event_members.length} confirmed
            </span>
            <div className="flex -space-x-1.5">
              {event.event_members.slice(0, 3).map((m) => (
                <Avatar
                  key={m.id}
                  className="w-6 h-6 border-2 border-background"
                >
                  <AvatarFallback className="text-[9px] bg-muted">
                    {getInitials(m.profiles?.name || "?")}
                  </AvatarFallback>
                </Avatar>
              ))}
              {event.event_members.length > 3 && (
                <div
                  className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] text-muted-foreground"
                  style={{ fontWeight: 500 }}
                >
                  +{event.event_members.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {event.start_time?.slice(0, 5)}
            </div>
          </div>
          {event.open_mic_enabled && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">
              <MicVocal className="w-3 h-3 mr-1" />
              Open Mic
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading events...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1>Events</h1>
        {isOrganiser && (
          <Button onClick={() => router.push("/events/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        )}
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No upcoming events</p>
              {isOrganiser && (
                <p className="text-sm mt-1">
                  Create your first event to get started
                </p>
              )}
            </div>
          ) : (
            upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No past events yet</p>
            </div>
          ) : (
            past.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
