import { useState, useEffect, useRef, useCallback } from "react";
import {
  Video, Play, Pause, Download, Clock, Clapperboard,
  ChevronLeft, ChevronRight, Loader2, Film,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
const SPEED_LABELS: Record<number, string> = {
  200: "Rápido", 500: "Normal", 1000: "Lento",
};

// --- FramePlayer ---
function FramePlayer({ frames, onCompileVideo }: { frames: string[]; onCompileVideo: (fps: number) => void }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frameDelay, setFrameDelay] = useState(500);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((f) => (f + 1) % frames.length);
      }, frameDelay);
    } else if (intervalRef.current) clearInterval(intervalRef.current);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, frames.length, frameDelay]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
        <img src={frames[currentFrame]} alt={`Frame ${currentFrame + 1}`} className="w-full h-full object-cover transition-opacity duration-200" />
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="text-[10px]">{currentFrame + 1}/{frames.length}</Badge>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentFrame((f) => (f - 1 + frames.length) % frames.length)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 btn-gradient rounded-full" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentFrame((f) => (f + 1) % frames.length)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">Velocidade</span>
          <span className="text-[10px] font-medium text-primary">{SPEED_LABELS[frameDelay] || `${frameDelay}ms`}</span>
        </div>
        <Slider min={200} max={1000} step={100} value={[frameDelay]} onValueChange={([v]) => setFrameDelay(v)} className="w-full" />
      </div>
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onCompileVideo(Math.round(1000 / frameDelay))}>
        <Film className="h-3 w-3 mr-1" /> Baixar Vídeo (.webm)
      </Button>
    </div>
  );
}

// --- Video compilation ---
async function compileFramesToVideo(frameUrls: string[], fps: number): Promise<Blob> {
  const frameDuration = 1000 / fps;
  const images = await Promise.all(
    frameUrls.map((url) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    }))
  );
  const width = images[0].naturalWidth;
  const height = images[0].naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(0);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.onerror = (e) => reject(e);
    recorder.start();
    let frameIndex = 0;
    const track = stream.getVideoTracks()[0] as any;
    const drawNextFrame = () => {
      if (frameIndex >= images.length) { recorder.stop(); return; }
      ctx.drawImage(images[frameIndex], 0, 0, width, height);
      if (track.requestFrame) track.requestFrame();
      frameIndex++;
      setTimeout(drawNextFrame, frameDuration);
    };
    drawNextFrame();
  });
}

export function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [frameCount, setFrameCount] = useState("6");
  const [resolution, setResolution] = useState("1344x768");
  const [selectedStyle, setSelectedStyle] = useState("Cinematográfico");
  const [loading, setLoading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingStatus, setGeneratingStatus] = useState("");

  const { videoTasks, addVideoTask, updateVideoTask } = useAppStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setGeneratingProgress(0);

    const taskId = crypto.randomUUID();
    const total = parseInt(frameCount);
    addVideoTask({
      id: taskId, prompt: prompt.trim(), model: "gemini-3-pro-image",
      status: "processing", progress: 0, frames: [], timestamp: Date.now(),
    });

    const frames: string[] = [];

    try {
      for (let i = 0; i < total; i++) {
        setGeneratingStatus(`Gerando frame ${i + 1} de ${total}...`);
        setGeneratingProgress(Math.round((i / total) * 100));

        const { data, error } = await supabase.functions.invoke("generate-video", {
          body: { prompt: prompt.trim(), style: selectedStyle, frameIndex: i, totalFrames: total, resolution },
        });

        if (error) {
          console.error(`Frame ${i + 1} invoke error:`, error);
          continue;
        }
        if (data?.error) {
          toast.warning(`Frame ${i + 1}: ${data.error}`);
          if (data.error.includes("Rate limit")) {
            await new Promise(r => setTimeout(r, 5000));
          }
          continue;
        }
        if (data?.frame) {
          frames.push(data.frame);
          updateVideoTask(taskId, { frames: [...frames], progress: Math.round(((i + 1) / total) * 100) });
        }

        // Delay between frames to avoid rate limiting
        if (i < total - 1) await new Promise(r => setTimeout(r, 2000));
      }

      if (frames.length > 0) {
        updateVideoTask(taskId, { status: "success", progress: 100, frames });
        toast.success(`Vídeo gerado com ${frames.length} frames!`);
      } else {
        updateVideoTask(taskId, { status: "fail", progress: 0 });
        toast.error("Nenhum frame gerado. Tente novamente.");
      }
    } catch (err: any) {
      updateVideoTask(taskId, { status: "fail", progress: 0, frames });
      toast.error(err.message || "Falha na geração");
    } finally {
      setLoading(false);
      setGeneratingProgress(0);
      setGeneratingStatus("");
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

  const handleCompileVideo = useCallback(async (frames: string[], fps: number) => {
    setCompiling(true);
    toast.info("Compilando vídeo...");
    try {
      const blob = await compileFramesToVideo(frames, fps);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Vídeo .webm baixado!");
    } catch (err: any) {
      console.error("Compile error:", err);
      toast.error("Erro ao compilar vídeo.");
    } finally {
      setCompiling(false);
    }
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-primary" /> Configurações
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
            {loading ? "Gerando..." : "Gerar Vídeo"}
          </Button>

          {loading && (
            <div className="space-y-2">
              <Progress value={generatingProgress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">{generatingStatus}</p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Gera frames via IA e compila em vídeo .webm
          </p>
        </CardContent>
      </Card>

      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" /> Vídeos
            {videoTasks.length > 0 && <Badge variant="secondary" className="text-[10px]">{videoTasks.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videoTasks.length === 0 ? (
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
                    {task.status === "processing" && (
                      <div className="space-y-2 mb-2">
                        <Progress value={task.progress} className="h-2" />
                        <p className="text-[10px] text-muted-foreground">{task.frames.length} frames gerados...</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      {task.frames.length > 0 ? `${task.frames.length} frames` : task.model}
                    </div>
                    {task.frames.length > 0 && (
                      <div className="mt-2">
                        <FramePlayer frames={task.frames} onCompileVideo={(fps) => handleCompileVideo(task.frames, fps)} />
                        <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => handleDownloadFrames(task.frames)}>
                          <Download className="h-3 w-3 mr-1" /> Baixar Frames
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {compiling && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Compilando vídeo...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
