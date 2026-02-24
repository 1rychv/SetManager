"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  MicVocal,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { submitApplication } from "../actions";
import type { Event } from "@/types";

export default function ApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("open_mic_enabled", true)
        .single();

      setEvent(data as Event | null);
      setLoading(false);
    }

    fetchEvent();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event) return;

    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("eventId", event.id);

    const result = await submitApplication(formData);

    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setSubmitted(true);
  }

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
          This event doesn&apos;t exist or open mic applications are not enabled.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center py-16">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
        <h2 className="text-lg" style={{ fontWeight: 600 }}>
          Application Submitted!
        </h2>
        <p className="text-muted-foreground mt-2">
          Thanks for applying to perform at <strong>{event.name}</strong>. The
          organisers will review your application and you&apos;ll hear back soon.
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
          Open Mic Application
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

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Your full name"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="song">Song *</Label>
              <Input
                id="song"
                name="song"
                placeholder='e.g. "Hallelujah" by Leonard Cohen'
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrumentNeeds">
                Instrument / Backing Track Needs
              </Label>
              <Textarea
                id="instrumentNeeds"
                name="instrumentNeeds"
                placeholder="e.g. I need an acoustic guitar, or I'll bring my own keyboard and backing track"
                className="min-h-[80px]"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
