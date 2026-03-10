import {
  MessageSquare, ImageIcon, Paintbrush, Video, QrCode,
  Music, FileText, PenTool, Maximize2, Scissors, FileOutput,
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

const modules: { id: ModuleId; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { id: "chat", label: "Chat IA", description: "Claude & DeepSeek", icon: MessageSquare, color: "text-violet-500" },
  { id: "upscale", label: "Upscale", description: "Aumentar resolução com IA", icon: Maximize2, color: "text-emerald-500" },
  { id: "image", label: "Gerar Imagem", description: "Criar imagens com IA", icon: ImageIcon, color: "text-blue-500" },
  { id: "editor", label: "Editar Imagem", description: "Modificar e combinar imag…", icon: Paintbrush, color: "text-teal-500" },
  { id: "qrcode", label: "QR Code Magic", description: "Gerar QR Code profissio…", icon: QrCode, color: "text-amber-500" },
  { id: "music", label: "Music DNA", description: "Análise profunda de áudio", icon: Music, color: "text-rose-500" },
  { id: "summarizer", label: "Resumidor IA", description: "Resumos e flashcards", icon: FileText, color: "text-purple-500" },
  { id: "signature", label: "Assinatura", description: "Criar assinatura digital", icon: PenTool, color: "text-green-500" },
  { id: "video", label: "Frames de Vídeo", description: "Sequências de imagens", icon: Video, color: "text-sky-500" },
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="pulse-glow flex h-9 w-9 shrink-0 items-center justify-center rounded-lg btn-gradient text-base font-black">
            🐼
          </div>
          {!collapsed && (
            <span className="text-xl font-bold gradient-text whitespace-nowrap">Panda Bold</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3">
            Ferramentas
          </SidebarGroupLabel>
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
                        "h-auto py-2.5 px-3 transition-all",
                        active && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active ? "bg-primary/15" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          active ? m.color : m.color
                        )} />
                      </div>
                      {!collapsed && (
                        <div className="flex flex-col gap-0 min-w-0">
                          <span className={cn(
                            "text-[15px] leading-tight truncate",
                            active ? "font-semibold text-sidebar-accent-foreground" : "font-medium text-sidebar-foreground"
                          )}>
                            {m.label}
                          </span>
                          <span className="text-xs text-muted-foreground truncate leading-tight">
                            {m.description}
                          </span>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
