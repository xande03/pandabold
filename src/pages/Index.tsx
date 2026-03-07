import { useEffect } from "react";
import { MainNav } from "@/components/modules/main-nav";
import { ChatArena } from "@/components/modules/chat-arena";
import { ImageLab } from "@/components/modules/image-lab";
import { ImageEditor } from "@/components/modules/image-editor";
import { VideoStudio } from "@/components/modules/video-studio";
import { QRCodeGenerator } from "@/components/modules/qr-code-generator";
import { MusicDNA } from "@/components/modules/music-dna";
import { Gallery } from "@/components/modules/gallery";
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
};

const moduleTitles = {
  chat: "Chat IA",
  image: "Laboratório de Imagem",
  editor: "Editor de Imagem",
  video: "Estúdio de Vídeo",
  qrcode: "Gerador de QR Code",
  music: "Music DNA",
  gallery: "Galeria",
};

const Index = () => {
  const { activeModule, isDark } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const ActiveComponent = moduleComponents[activeModule];

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="pt-14 pb-16 sm:pb-4 px-4 max-w-7xl mx-auto">
        <div className="py-4">
          <h1 className="text-xl font-bold gradient-text mb-4">
            {moduleTitles[activeModule]}
          </h1>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="min-h-[calc(100vh-10rem)]"
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Index;
