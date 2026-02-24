"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { updateRSVP } from "../events/actions";
import type {
  Event,
  EventMember,
  Profile,
  RSVPStatus,
  AnnouncementWithAuthor,
} from "@/types";

type EventWithMembers = Event & {
  event_members: (EventMember & { profiles: Pick<Profile, "name"> })[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return format(date, "MMM d, yyyy");
}

function rsvpColor(status: string) {
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
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const [events, setEvents] = useState<EventWithMembers[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const [eventsRes, announcementsRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, event_members(*, profiles(name))")
        .gte("date", today)
        .order("date", { ascending: true }),
      supabase
        .from("announcements")
        .select("*, profiles!announcements_author_id_fkey(name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    setEvents((eventsRes.data as EventWithMembers[]) || []);
    setAnnouncements(
      (announcementsRes.data as AnnouncementWithAuthor[]) || []
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nextEvent = events[0] || null;

  const myMember = (event: EventWithMembers) =>
    event.event_members.find((m) => m.user_id === user?.id);

  const confirmedCount = (event: EventWithMembers) =>
    event.event_members.filter((m) => m.rsvp === "confirmed").length;

  async function handleRSVP(eventId: string, status: RSVPStatus) {
    const result = await updateRSVP(eventId, status);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`RSVP updated to ${status}`);
      fetchData();
    }
  }

  const firstName = profile?.name?.split(" ")[0] || "there";

  if (loading) {
    return (
      <div className="p-4 md:p-8 text-center text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1>Welcome back, {firstName}</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your team
        </p>
      </div>

      {/* Next Up Hero Card */}
      {nextEvent && (
        <div className="p-5 rounded-xl border bg-card shadow-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3" style={{ fontWeight: 600 }}>
            Next Up
          </p>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <h2
                className="cursor-pointer hover:text-primary transition-colors"
                onClick={() => router.push(`/events/${nextEvent.id}`)}
              >
                {nextEvent.name}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {format(parseISO(nextEvent.date), "EEEE, MMMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {nextEvent.start_time?.slice(0, 5)} -{" "}
                  {nextEvent.end_time?.slice(0, 5)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {nextEvent.venue}
                </span>
              </div>

              {/* Role + member count + avatars */}
              <div className="flex items-center gap-4">
                {myMember(nextEvent)?.event_role && (
                  <Badge variant="secondary">
                    {myMember(nextEvent)!.event_role}
                  </Badge>
                )}
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {confirmedCount(nextEvent)}/{nextEvent.event_members.length}{" "}
                  confirmed
                </span>
                <div className="flex -space-x-1.5">
                  {nextEvent.event_members.slice(0, 4).map((m) => (
                    <Avatar
                      key={m.id}
                      className="w-6 h-6 border-2 border-background"
                    >
                      <AvatarFallback className="text-[9px] bg-muted">
                        {getInitials(m.profiles?.name || "?")}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {nextEvent.event_members.length > 4 && (
                    <div
                      className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] text-muted-foreground"
                      style={{ fontWeight: 500 }}
                    >
                      +{nextEvent.event_members.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RSVP Buttons */}
            <div className="flex gap-2 shrink-0">
              {(["confirmed", "maybe", "declined"] as RSVPStatus[]).map(
                (status) => {
                  const labels: Record<string, string> = {
                    confirmed: "Going",
                    maybe: "Maybe",
                    declined: "Can't Make It",
                  };
                  const myRSVP = myMember(nextEvent)?.rsvp || "pending";
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
                      onClick={() => handleRSVP(nextEvent.id, status)}
                    >
                      {labels[status]}
                    </Button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Announcements Card */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Recent Announcements
            </h3>
            <button
              className="text-sm text-primary hover:underline flex items-center gap-1"
              onClick={() => router.push("/announcements")}
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-[9px]">
                        {getInitials(a.profiles?.name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {a.profiles?.name} &middot;{" "}
                      {formatRelativeTime(a.created_at)}
                    </span>
                  </div>
                  {a.title && (
                    <p className="text-sm" style={{ fontWeight: 500 }}>
                      {a.title}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {a.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Upcoming Events Card */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Your Upcoming Events
            </h3>
            <button
              className="text-sm text-primary hover:underline flex items-center gap-1"
              onClick={() => router.push("/events")}
            >
              View all
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 5).map((event) => {
                const member = myMember(event);
                const rsvp = member?.rsvp || "pending";
                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/events/${event.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate" style={{ fontWeight: 500 }}>
                        {event.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(event.date), "EEE, MMM d")} &middot;{" "}
                        {event.venue}
                      </p>
                    </div>
                    <Badge variant="outline" className={rsvpColor(rsvp)}>
                      {rsvp.charAt(0).toUpperCase() + rsvp.slice(1)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
