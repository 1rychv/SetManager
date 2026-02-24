"use client";

import { useState } from "react";
import Link from "next/link";
import { Music2, Crown, Users } from "lucide-react";
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
import { signup } from "../actions";

type Role = "member" | "organiser";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("member");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("role", selectedRole);
    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4">
          <Music2 className="w-7 h-7 text-primary-foreground" />
        </div>
        <h1
          className="text-foreground"
          style={{ fontSize: "1.5rem", fontWeight: 600 }}
        >
          Create Account
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Join your team on SetManager
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign up</CardTitle>
          <CardDescription>Choose your role and create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Role selection */}
            <div className="flex flex-col gap-2">
              <Label>Account type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole("member")}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                    selectedRole === "member"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Users className="w-6 h-6" />
                  <span className="text-sm font-medium">Member</span>
                  <Badge variant="secondary" className="text-xs">
                    Free
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    View events, RSVP, upload files
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("organiser")}
                  className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                    selectedRole === "organiser"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Crown className="w-6 h-6" />
                  <span className="text-sm font-medium">Organiser</span>
                  <Badge className="text-xs">
                    Pro
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Create events, manage team, setlists
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Your full name"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                placeholder="Confirm your password"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-sm text-center">
              <Link href="/login" className="text-primary hover:underline">
                Already have an account? Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
