"use server";

import { createClient } from "@/lib/supabase/server";

export async function createAnnouncement(formData: FormData) {
  const title = (formData.get("title") as string)?.trim() || null;
  const body = (formData.get("body") as string)?.trim();

  if (!body) {
    return { error: "Please enter a message." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    author_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateAnnouncement(formData: FormData) {
  const id = formData.get("id") as string;
  const title = (formData.get("title") as string)?.trim() || null;
  const body = (formData.get("body") as string)?.trim();

  if (!id || !body) {
    return { error: "Please enter a message." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .update({ title, body })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
