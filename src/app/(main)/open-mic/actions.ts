"use server";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/types";

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  organiserNotes?: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const updates: { status: ApplicationStatus; organiser_notes?: string } = {
    status,
  };
  if (organiserNotes !== undefined) {
    updates.organiser_notes = organiserNotes;
  }

  const { error } = await supabase
    .from("open_mic_applications")
    .update(updates)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
