"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  CalendarDays,
  Music2,
  Megaphone,
  FolderOpen,
  MicVocal,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/setlists", label: "Setlists", icon: Music2 },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/files", label: "Files", icon: FolderOpen },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // TODO: Replace with real user data from Supabase auth
  const currentUser: { name: string; role: string } = { name: "User", role: "member" };
  const isOrganiser = currentUser.role === "organiser";

  const navLinkClass = (href: string) => {
    const isActive =
      pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Music2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span
              className="text-foreground tracking-tight"
              style={{ fontSize: "1.1rem", fontWeight: 600 }}
            >
              SetManager
            </span>
          </div>
          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Separator />

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={navLinkClass(item.href)}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            ))}
            {isOrganiser && (
              <Link
                href="/open-mic"
                onClick={() => setSidebarOpen(false)}
                className={navLinkClass("/open-mic")}
              >
                <MicVocal className="w-[18px] h-[18px]" />
                Open Mic
              </Link>
            )}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(currentUser.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm truncate text-foreground"
                style={{ fontWeight: 500 }}
              >
                {currentUser.name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {currentUser.role}
              </p>
            </div>
          </div>
          <div className="flex gap-1 mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-muted-foreground"
              onClick={() => {
                router.push("/settings");
                setSidebarOpen(false);
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                // TODO: Implement Supabase signout
                router.push("/login");
              }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar - Mobile */}
        <header className="md:hidden flex items-center h-14 px-4 border-b bg-background shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Music2 className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span style={{ fontSize: "1rem", fontWeight: 600 }}>
              SetManager
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>

        {/* Bottom tab bar - Mobile */}
        <nav className="md:hidden flex items-center justify-around border-t bg-background h-16 shrink-0 px-1">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[56px] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">
                  {item.label.length > 8
                    ? item.label.slice(0, 8) + "."
                    : item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
