import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatArena } from "@/components/modules/chat-arena";
import { ImageLab } from "@/components/modules/image-lab";
import { ImageEditor } from "@/components/modules/image-editor";

import { QRCodeGenerator } from "@/components/modules/qr-code-generator";
import { MusicDNA } from "@/components/modules/music-dna";
import { Gallery } from "@/components/modules/gallery";
import { TextSummarizer } from "@/components/modules/text-summarizer";
import { DigitalSignature } from "@/components/modules/digital-signature";
import { ImageUpscale } from "@/components/modules/image-upscale";
import { BackgroundRemover } from "@/components/modules/background-remover";
import { ImageConverter } from "@/components/modules/image-converter";
import { useAppStore } from "@/lib/store/app-store";
import { motion, AnimatePresence } from "framer-motion";

const moduleComponents = {
  chat: ChatArena,
  image: ImageLab,
  editor: ImageEditor,
  video: VideoStudio,
  qrcode: QRCodeGenerator,
  music: MusicDNA,
  gallery: Gallery,
  summarizer: TextSummarizer,
  signature: DigitalSignature,
  upscale: ImageUpscale,
  bgremover: BackgroundRemover,
  converter: ImageConverter,
};

const moduleTitles = {
  chat: "Chat IA",
  image: "Laboratório de Imagem",
  editor: "Editor de Imagem",
  video: "Geração de Vídeos",
  qrcode: "Gerador de QR Code",
  music: "Music DNA",
  gallery: "Galeria",
  summarizer: "Resumidor de Texto",
  signature: "Assinatura Digital",
  upscale: "Upscale de Imagem",
  bgremover: "Remover Fundo",
  converter: "Conversor de Imagem",
};

const Index = () => {
  const { activeModule, isDark } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const ActiveComponent = moduleComponents[activeModule];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-2 sm:px-4 shrink-0">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-base sm:text-xl font-bold gradient-text truncate">
              {moduleTitles[activeModule]}
            </h1>
          </header>

          <main className="flex-1 px-2 sm:px-4 py-4 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto"
              >
                <ActiveComponent />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
