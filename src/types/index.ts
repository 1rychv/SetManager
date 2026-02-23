// =================== Auto-generated Database Types ===================
// Generated via Supabase MCP `generate_typescript_types`
// Re-generate after schema changes with: supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          event_role: string | null
          id: string
          rsvp: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_role?: string | null
          id?: string
          rsvp?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_role?: string | null
          id?: string
          rsvp?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          date: string
          description: string
          end_time: string
          id: string
          name: string
          open_mic_enabled: boolean
          setlist_id: string | null
          slug: string
          start_time: string
          updated_at: string
          venue: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          description?: string
          end_time: string
          id?: string
          name: string
          open_mic_enabled?: boolean
          setlist_id?: string | null
          slug: string
          start_time: string
          updated_at?: string
          venue: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          description?: string
          end_time?: string
          id?: string
          name?: string
          open_mic_enabled?: boolean
          setlist_id?: string | null
          slug?: string
          start_time?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_events_setlist"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          name: string
          size: string
          storage_path: string
          type: Database["public"]["Enums"]["file_type"]
          uploader_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          name: string
          size: string
          storage_path: string
          type: Database["public"]["Enums"]["file_type"]
          uploader_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          name?: string
          size?: string
          storage_path?: string
          type?: Database["public"]["Enums"]["file_type"]
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      open_mic_applications: {
        Row: {
          email: string
          event_id: string
          full_name: string
          id: string
          instrument_needs: string
          organiser_notes: string | null
          phone: string | null
          song: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          email: string
          event_id: string
          full_name: string
          id?: string
          instrument_needs?: string
          organiser_notes?: string | null
          phone?: string | null
          song: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          instrument_needs?: string
          organiser_notes?: string | null
          phone?: string | null
          song?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_mic_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      setlists: {
        Row: {
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setlists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      song_role_assignments: {
        Row: {
          created_at: string
          id: string
          is_open_mic_performer: boolean
          person_id: string
          person_name: string
          role: string
          song_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_open_mic_performer?: boolean
          person_id: string
          person_name: string
          role: string
          song_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_open_mic_performer?: boolean
          person_id?: string
          person_name?: string
          role?: string
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_role_assignments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          arrangement_notes: string
          bpm: number
          created_at: string
          id: string
          is_open_mic: boolean
          key: string
          name: string
          open_mic_application_id: string | null
          position: number
          setlist_id: string
          updated_at: string
        }
        Insert: {
          arrangement_notes?: string
          bpm?: number
          created_at?: string
          id?: string
          is_open_mic?: boolean
          key?: string
          name: string
          open_mic_application_id?: string | null
          position?: number
          setlist_id: string
          updated_at?: string
        }
        Update: {
          arrangement_notes?: string
          bpm?: number
          created_at?: string
          id?: string
          is_open_mic?: boolean
          key?: string
          name?: string
          open_mic_application_id?: string | null
          position?: number
          setlist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_songs_open_mic_application"
            columns: ["open_mic_application_id"]
            isOneToOne: false
            referencedRelation: "open_mic_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "songs_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      file_type: "document" | "image" | "audio"
      rsvp_status: "confirmed" | "declined" | "pending" | "maybe"
      user_role: "organiser" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

// =================== Convenience Type Aliases ===================
// Derived from the auto-generated Database type for easier usage

export type UserRole = Database["public"]["Enums"]["user_role"];
export type RSVPStatus = Database["public"]["Enums"]["rsvp_status"];
export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type FileType = Database["public"]["Enums"]["file_type"];

export type Profile = Tables<"profiles">;
export type Event = Tables<"events">;
export type EventMember = Tables<"event_members">;
export type Setlist = Tables<"setlists">;
export type Song = Tables<"songs">;
export type SongRoleAssignment = Tables<"song_role_assignments">;
export type Announcement = Tables<"announcements">;
export type FileRecord = Tables<"files">;
export type OpenMicApplication = Tables<"open_mic_applications">;

// =================== Composite Types (for JOINs) ===================

export type EventMemberWithProfile = EventMember & {
  profiles: Profile;
};

export type EventWithMembers = Event & {
  event_members: EventMemberWithProfile[];
};

export type SongWithRoles = Song & {
  song_role_assignments: SongRoleAssignment[];
};

export type SetlistWithSongs = Setlist & {
  songs: SongWithRoles[];
};

export type AnnouncementWithAuthor = Announcement & {
  profiles: Pick<Profile, "name" | "avatar_url">;
};

export type FileWithUploader = FileRecord & {
  profiles: Pick<Profile, "name">;
};
