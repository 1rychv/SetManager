"use server";

import { createClient } from "@/lib/supabase/server";
import type { FileType } from "@/types";

export async function createFileRecord(data: {
  name: string;
  type: FileType;
  size: string;
  storage_path: string;
  event_id?: string | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase.from("files").insert({
    name: data.name,
    type: data.type,
    size: data.size,
    storage_path: data.storage_path,
    uploader_id: user.id,
    event_id: data.event_id || null,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteFile(id: string, storagePath: string) {
  const supabase = await createClient();

  // Remove from storage first
  const { error: storageError } = await supabase.storage
    .from("files")
    .remove([storagePath]);

  if (storageError) {
    return { error: storageError.message };
  }

  // Then delete DB record
  const { error } = await supabase.from("files").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function attachFileToEvent(fileId: string, eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("files")
    .update({ event_id: eventId })
    .eq("id", fileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function detachFileFromEvent(fileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("files")
    .update({ event_id: null })
    .eq("id", fileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function attachFileToSong(fileId: string, songId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("files")
    .update({ song_id: songId })
    .eq("id", fileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function detachFileFromSong(fileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("files")
    .update({ song_id: null })
    .eq("id", fileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function attachFileToSetlist(fileId: string, setlistId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("files")
    .update({ setlist_id: setlistId })
    .eq("id", fileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function detachFileFromSetlist(fileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("files")
    .update({ setlist_id: null })
    .eq("id", fileId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
