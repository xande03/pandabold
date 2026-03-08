import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const MESSAGES: Record<string, string[]> = {
  image: [
    "Criando sua obra-prima...",
    "Aplicando estilo...",
    "Processando detalhes...",
    "Quase lá...",
    "Finalizando...",
  ],
  video: [
    "Gerando frames da cena...",
    "Construindo sequência visual...",
    "Aplicando estilo cinematográfico...",
    "Renderizando animação...",
    "Montando vídeo final...",
  ],
  qr: [
    "Gerando QR Code...",
    "Aplicando design...",
    "Finalizando...",
  ],
  music: [
    "Analisando áudio...",
    "Identificando padrões...",
    "Processando resultado...",
  ],
};

interface GenerationLoadingProps {
  className?: string;
  type?: "image" | "qr" | "video" | "music";
}

export function GenerationLoading({ className, type = "image" }: GenerationLoadingProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const msgs = MESSAGES[type] || MESSAGES.image;

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % msgs.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [msgs.length]);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-12", className)}>
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl btn-gradient flex items-center justify-center animate-pulse">
          <Sparkles className="h-8 w-8 text-white animate-spin" style={{ animationDuration: "3s" }} />
        </div>
        <div className="absolute -inset-2 rounded-2xl bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">{msgs[msgIndex]}</p>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
