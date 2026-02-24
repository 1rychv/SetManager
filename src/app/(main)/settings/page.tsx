"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/hooks/use-user";
import { updateRole, updateProfile } from "./actions";
import type { UserRole } from "@/types";

export default function SettingsPage() {
  const { profile, loading } = useUser();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isOrganiser = profile.role === "organiser";

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Profile updated.");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleRoleSwitch(newRole: UserRole) {
    setRoleChanging(true);
    setMessage("");
    setError("");

    const result = await updateRole(newRole);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage(
        newRole === "organiser"
          ? "Upgraded to Organiser."
          : "Switched to Member."
      );
      router.refresh();
    }
    setRoleChanging(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your profile and account settings
        </p>
      </div>

      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile.name}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here
              </p>
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Role / Plan section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Plan</CardTitle>
          <CardDescription>
            Your current role determines what you can do in SetManager
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current plan */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {isOrganiser ? (
              <Crown className="w-5 h-5 text-primary" />
            ) : (
              <Users className="w-5 h-5 text-muted-foreground" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isOrganiser ? "Organiser" : "Member"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOrganiser
                  ? "Full access — create events, manage team, setlists, announcements"
                  : "View events, RSVP, upload files"}
              </p>
            </div>
            <Badge variant={isOrganiser ? "default" : "secondary"}>
              {isOrganiser ? "Pro" : "Free"}
            </Badge>
          </div>

          {/* Switch option */}
          {isOrganiser ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Switch to Member</p>
                  <p className="text-xs text-muted-foreground">
                    Downgrade to view-only access
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRoleSwitch("member")}
                disabled={roleChanging}
              >
                {roleChanging ? "Switching..." : "Downgrade"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Upgrade to Organiser</p>
                  <p className="text-xs text-muted-foreground">
                    Create events, manage team, build setlists, post
                    announcements
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleRoleSwitch("organiser")}
                disabled={roleChanging}
              >
                {roleChanging ? "Upgrading..." : "Upgrade"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback messages */}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
