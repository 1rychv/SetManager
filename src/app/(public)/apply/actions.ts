"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitApplication(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const song = (formData.get("song") as string)?.trim();
  const instrumentNeeds =
    (formData.get("instrumentNeeds") as string)?.trim() || "";

  if (!eventId || !fullName || !email || !song) {
    return { error: "Please fill in all required fields." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("open_mic_applications").insert({
    event_id: eventId,
    full_name: fullName,
    email,
    phone,
    song,
    instrument_needs: instrumentNeeds,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
