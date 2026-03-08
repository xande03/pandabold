import {
  MessageSquare, ImageIcon, Paintbrush, Video, QrCode,
  Music, LayoutGrid, FileText, PenTool,
} from "lucide-react";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const modules: { id: ModuleId; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat IA", icon: MessageSquare },
  { id: "image", label: "Lab de Imagem", icon: ImageIcon },
  { id: "editor", label: "Editor de Imagem", icon: Paintbrush },
  { id: "video", label: "Estúdio de Vídeo", icon: Video },
  { id: "qrcode", label: "QR Code", icon: QrCode },
  { id: "music", label: "Music DNA", icon: Music },
  { id: "gallery", label: "Galeria", icon: LayoutGrid },
  { id: "summarizer", label: "Resumidor IA", icon: FileText },
  { id: "signature", label: "Assinatura Digital", icon: PenTool },
];

export function AppSidebar() {
  const { activeModule, setActiveModule } = useAppStore();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSelect = (id: ModuleId) => {
    setActiveModule(id);
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-background">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="pulse-glow flex h-8 w-8 shrink-0 items-center justify-center rounded-lg btn-gradient text-sm font-black">
            🐼
          </div>
          {!collapsed && (
            <span className="text-lg font-bold gradient-text whitespace-nowrap">Panda Bold</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((m) => {
                const Icon = m.icon;
                const active = activeModule === m.id;
                return (
                  <SidebarMenuItem key={m.id}>
                    <SidebarMenuButton
                      onClick={() => handleSelect(m.id)}
                      tooltip={m.label}
                      className={cn(
                        "transition-all",
                        active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      )}
                    >
                      <Icon className={cn(
                        "shrink-0 transition-all",
                        collapsed ? "h-5 w-5" : "h-4 w-4",
                        active ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span>{m.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-9 w-9 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
