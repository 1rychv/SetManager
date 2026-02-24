"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export async function updateRole(newRole: UserRole) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name) {
    return { error: "Name is required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
