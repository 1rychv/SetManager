import { Music2 } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">{children}</main>
      <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <Music2 className="w-3.5 h-3.5" />
          <span>Powered by SetManager</span>
        </div>
      </footer>
    </div>
  );
}
