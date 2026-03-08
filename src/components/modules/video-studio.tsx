import { useState, useEffect, useRef } from "react";
import {
  Video,
  Play,
  Pause,
  Download,
  Clock,
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GenerationLoading } from "@/components/ui/generation-loading";
import { supabase } from "@/integrations/supabase/client";

const STYLES = [
  "Realista", "Cinematográfico", "Anime", "Pixar 3D", "Cyberpunk", "Fantasia",
  "Câmera Lenta", "Timelapse", "Film Noir", "Vintage", "Onírico", "Épico",
];

const FRAME_COUNTS = [
  { value: "4", label: "4 frames" },
  { value: "6", label: "6 frames" },
  { value: "8", label: "8 frames" },
];

const RESOLUTIONS = [
  { id: "1024x1024", label: "1:1" },
  { id: "1344x768", label: "16:9" },
  { id: "768x1344", label: "9:16" },
];

function FramePlayer({ frames }: { frames: string[] }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((f) => (f + 1) % frames.length);
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, frames.length]);

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
        <img
          src={frames[currentFrame]}
          alt={`Frame ${currentFrame + 1}`}
          className="w-full h-full object-cover transition-opacity duration-200"
        />
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="text-[10px]">
            {currentFrame + 1}/{frames.length}
          </Badge>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => setCurrentFrame((f) => (f - 1 + frames.length) % frames.length)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-8 w-8 btn-gradient rounded-full"
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => setCurrentFrame((f) => (f + 1) % frames.length)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [frameCount, setFrameCount] = useState("6");
  const [resolution, setResolution] = useState("1344x768");
  const [selectedStyle, setSelectedStyle] = useState("Cinematográfico");
  const [loading, setLoading] = useState(false);

  const { videoTasks, addVideoTask, updateVideoTask } = useAppStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    const taskId = crypto.randomUUID();
    addVideoTask({
      id: taskId,
      prompt: prompt.trim(),
      model: "gemini-3-pro-image",
      status: "processing",
      progress: 0,
      frames: [],
      timestamp: Date.now(),
    });

    try {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: {
          prompt: prompt.trim(),
          style: selectedStyle,
          frameCount: parseInt(frameCount),
          resolution,
        },
      });

      if (error) throw error;
      if (data?.error) {
        // Even if error, we might have partial frames
        if (data.frames?.length > 0) {
          updateVideoTask(taskId, { status: "success", progress: 100, frames: data.frames });
          toast.warning(`Geração parcial: ${data.frames.length} frames. ${data.error}`);
        } else {
          updateVideoTask(taskId, { status: "fail", progress: 0 });
          toast.error(data.error);
        }
        return;
      }

      if (data?.frames?.length > 0) {
        updateVideoTask(taskId, { status: "success", progress: 100, frames: data.frames });
        toast.success(`Vídeo gerado com ${data.frames.length} frames!`);
      } else {
        updateVideoTask(taskId, { status: "fail", progress: 0 });
        toast.error("Nenhum frame gerado");
      }
    } catch (error: any) {
      updateVideoTask(taskId, { status: "fail", progress: 0 });
      toast.error(error.message || "Falha na geração");
    } finally {
      setLoading(false);
      setPrompt("");
    }
  };

  const handleDownloadFrames = (frames: string[]) => {
    frames.forEach((frame, i) => {
      const a = document.createElement("a");
      a.href = frame;
      a.download = `video-frame-${i + 1}.png`;
      a.click();
    });
    toast.success("Frames baixados!");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-primary" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Prompt</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Descreva a cena do vídeo..." className="min-h-[80px] text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Frames</label>
              <Select value={frameCount} onValueChange={setFrameCount}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FRAME_COUNTS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Resolução</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (<SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Estilo</label>
            <div className="flex flex-wrap gap-1">
              {STYLES.map((s) => (
                <button key={s} onClick={() => setSelectedStyle(s)} className={cn("rounded-full px-2.5 py-1 text-[10px] font-medium transition-all border", selectedStyle === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full btn-gradient" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Video className="h-4 w-4 mr-1" />}
            Gerar Vídeo
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            Gera uma sequência de frames animados via IA
          </p>
        </CardContent>
      </Card>

      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Vídeos
            {videoTasks.length > 0 && <Badge variant="secondary" className="text-[10px]">{videoTasks.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && videoTasks.some((t) => t.status === "processing") ? (
            <GenerationLoading type="video" />
          ) : videoTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Video className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum vídeo gerado</p>
              <p className="text-xs mt-1">Descreva uma cena e clique em Gerar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videoTasks.map((task) => (
                <Card key={task.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm line-clamp-2">{task.prompt}</p>
                      <Badge variant={task.status === "success" ? "default" : task.status === "fail" ? "destructive" : "secondary"} className="text-[10px] shrink-0">
                        {task.status === "processing" ? "Processando" : task.status === "success" ? "Concluído" : "Falhou"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      {task.frames.length > 0 ? `${task.frames.length} frames` : task.model}
                    </div>
                    {task.status === "processing" && <Progress value={task.progress} className="h-1.5" />}
                    {task.status === "success" && task.frames.length > 0 && (
                      <div className="mt-2">
                        <FramePlayer frames={task.frames} />
                        <Button
                          variant="outline" size="sm" className="w-full mt-2 text-xs"
                          onClick={() => handleDownloadFrames(task.frames)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Baixar Frames
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
