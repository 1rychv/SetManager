"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RSVPStatus } from "@/types";

export async function createEvent(formData: FormData) {
  const name = formData.get("name") as string;
  const date = formData.get("date") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = (formData.get("endTime") as string) || startTime;
  const venue = formData.get("venue") as string;
  const description = (formData.get("description") as string) || "";
  const openMicEnabled = formData.get("openMicEnabled") === "true";

  if (!name || !date || !startTime || !venue) {
    return { error: "Please fill in all required fields." };
  }

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    + "-" + date.replace(/-/g, "").slice(4); // append MMDD for uniqueness

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase.from("events").insert({
    name,
    date,
    start_time: startTime,
    end_time: endTime,
    venue,
    description,
    open_mic_enabled: openMicEnabled,
    slug,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "An event with this name and date already exists." };
    }
    return { error: error.message };
  }

  redirect("/events");
}

export async function updateEvent(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const date = formData.get("date") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = (formData.get("endTime") as string) || startTime;
  const venue = formData.get("venue") as string;
  const description = (formData.get("description") as string) || "";
  const openMicEnabled = formData.get("openMicEnabled") === "true";

  if (!id || !name || !date || !startTime || !venue) {
    return { error: "Please fill in all required fields." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      name,
      date,
      start_time: startTime,
      end_time: endTime,
      venue,
      description,
      open_mic_enabled: openMicEnabled,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  redirect(`/events/${id}`);
}

export async function updateRSVP(eventId: string, status: RSVPStatus) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Upsert: insert if not exists, update if exists
  const { error } = await supabase
    .from("event_members")
    .upsert(
      {
        event_id: eventId,
        user_id: user.id,
        rsvp: status,
      },
      { onConflict: "event_id,user_id" }
    );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function assignRole(
  eventId: string,
  userId: string,
  role: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_members")
    .update({ event_role: role })
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
