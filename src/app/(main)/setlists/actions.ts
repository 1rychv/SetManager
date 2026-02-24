"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Setlist CRUD ───

export async function createSetlist(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name) {
    return { error: "Setlist name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("setlists")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: { id: data.id } };
}

export async function updateSetlist(
  id: string,
  updates: { name?: string; event_id?: string | null }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("setlists")
    .update(updates)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteSetlist(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("setlists").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ─── Song CRUD ───

export async function addSong(
  setlistId: string,
  songData: {
    name: string;
    key: string;
    bpm: number;
    arrangement_notes: string;
  }
) {
  const supabase = await createClient();

  // Get the next position
  const { count } = await supabase
    .from("songs")
    .select("*", { count: "exact", head: true })
    .eq("setlist_id", setlistId);

  const position = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("songs")
    .insert({
      setlist_id: setlistId,
      name: songData.name,
      key: songData.key,
      bpm: songData.bpm,
      arrangement_notes: songData.arrangement_notes,
      position,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function updateSong(
  songId: string,
  updates: {
    name?: string;
    key?: string;
    bpm?: number;
    arrangement_notes?: string;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("songs")
    .update(updates)
    .eq("id", songId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function removeSong(songId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("songs").delete().eq("id", songId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function reorderSongs(
  songs: { id: string; position: number }[]
) {
  const supabase = await createClient();

  // Update each song's position
  for (const song of songs) {
    const { error } = await supabase
      .from("songs")
      .update({ position: song.position })
      .eq("id", song.id);

    if (error) {
      return { error: error.message };
    }
  }

  return { success: true };
}

// ─── Open Mic Song ───

export async function addOpenMicSong(
  setlistId: string,
  applicationId: string,
  songName: string
) {
  const supabase = await createClient();

  // Check if this application is already added
  const { count: existing } = await supabase
    .from("songs")
    .select("*", { count: "exact", head: true })
    .eq("setlist_id", setlistId)
    .eq("open_mic_application_id", applicationId);

  if (existing && existing > 0) {
    return { error: "This performer is already in the setlist." };
  }

  // Get the next position
  const { count } = await supabase
    .from("songs")
    .select("*", { count: "exact", head: true })
    .eq("setlist_id", setlistId);

  const position = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("songs")
    .insert({
      setlist_id: setlistId,
      name: songName,
      is_open_mic: true,
      open_mic_application_id: applicationId,
      position,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

// ─── Song Role Assignments ───

export async function addSongRole(
  songId: string,
  roleData: {
    role: string;
    person_id: string;
    person_name: string;
    is_open_mic_performer?: boolean;
  }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("song_role_assignments")
    .insert({
      song_id: songId,
      role: roleData.role,
      person_id: roleData.person_id,
      person_name: roleData.person_name,
      is_open_mic_performer: roleData.is_open_mic_performer ?? false,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function removeSongRole(roleId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("song_role_assignments")
    .delete()
    .eq("id", roleId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
