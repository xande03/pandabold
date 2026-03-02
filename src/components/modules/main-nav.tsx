import {
  MessageSquare,
  ImageIcon,
  Paintbrush,
  Video,
  QrCode,
  Music,
} from "lucide-react";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const modules: { id: ModuleId; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat Arena", shortLabel: "Chat", icon: MessageSquare },
  { id: "image", label: "Image Lab", shortLabel: "Image", icon: ImageIcon },
  { id: "editor", label: "Image Editor", shortLabel: "Editor", icon: Paintbrush },
  { id: "video", label: "Video Studio", shortLabel: "Video", icon: Video },
  { id: "qrcode", label: "QR Code", shortLabel: "QR", icon: QrCode },
  { id: "music", label: "Music DNA", shortLabel: "Music", icon: Music },
];

export function MainNav() {
  const { activeModule, setActiveModule } = useAppStore();

  return (
    <>
      {/* Desktop Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass hidden sm:block">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="pulse-glow flex h-8 w-8 items-center justify-center rounded-lg btn-gradient text-sm font-black">
              O
            </div>
            <span className="text-lg font-bold gradient-text">OmniArena</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {modules.map((m) => {
              const Icon = m.icon;
              const active = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "btn-gradient shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{m.label}</span>
                </button>
              );
            })}
          </nav>

          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass sm:hidden">
        <div className="flex items-center justify-around py-1.5">
          {modules.map((m) => {
            const Icon = m.icon;
            const active = activeModule === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-all",
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]")} />
                {m.shortLabel}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass sm:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="pulse-glow flex h-7 w-7 items-center justify-center rounded-lg btn-gradient text-xs font-black">
              O
            </div>
            <span className="text-base font-bold gradient-text">OmniArena</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}
