import { useState } from "react";
import {
  Video, Download, Loader2, Film, Play, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DURATIONS = [
  { value: "5", label: "5 segundos" },
  { value: "10", label: "10 segundos" },
];

const RESOLUTIONS = [
  { id: "1920x1080", label: "1080p (16:9)" },
  { id: "1080x1920", label: "1080p (9:16)" },
  { id: "1280x720", label: "720p (16:9)" },
];

const STYLES = [
  "Cinematográfico", "Realista", "Anime", "Pixar 3D", "Cyberpunk",
  "Fantasia", "Câmera Lenta", "Film Noir", "Onírico",
];

export function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState("1920x1080");
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
      model: "cogvideox-3",
      status: "processing",
      progress: 0,
      frames: [],
      timestamp: Date.now(),
    });

    try {
      const fullPrompt = `${prompt.trim()}. Estilo: ${selectedStyle}.`;

      const { data, error } = await supabase.functions.invoke("generate-video-zai", {
        body: {
          prompt: fullPrompt,
          duration: parseInt(duration),
          resolution,
          fps: 30,
        },
      });

      if (error) {
        console.error("Video generation error:", error);
        updateVideoTask(taskId, { status: "fail", progress: 0 });
        toast.error("Erro ao gerar vídeo. Tente novamente.");
        return;
      }

      if (data?.error) {
        updateVideoTask(taskId, { status: "fail", progress: 0 });
        toast.error(data.error);
        return;
      }

      if (data?.videoUrl) {
        updateVideoTask(taskId, {
          status: "success",
          progress: 100,
          videoUrl: data.videoUrl,
          frames: data.coverUrl ? [data.coverUrl] : [],
        });
        toast.success("Vídeo gerado com sucesso!");
      } else if (data?.coverUrl && data?.fallbackUsed) {
        updateVideoTask(taskId, {
          status: "success",
          progress: 100,
          frames: [data.coverUrl],
        });
        toast.info(data.message || "Preview gerado como imagem.");
      } else if (data?.taskId) {
        updateVideoTask(taskId, { status: "processing", progress: 50 });
        toast.info("Vídeo em processamento. Aguarde...");
        // Poll for result
        pollVideoResult(taskId, data.taskId);
      } else {
        updateVideoTask(taskId, { status: "fail", progress: 0 });
        toast.error("Nenhum vídeo retornado.");
      }
    } catch (err: any) {
      updateVideoTask(taskId, { status: "fail", progress: 0 });
      toast.error(err.message || "Falha na geração");
    } finally {
      setLoading(false);
      setPrompt("");
    }
  };

  const pollVideoResult = async (localTaskId: string, remoteTaskId: string) => {
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));

      try {
        const { data } = await supabase.functions.invoke("generate-video-zai", {
          body: { pollTaskId: remoteTaskId },
        });

        if (data?.videoUrl) {
          updateVideoTask(localTaskId, {
            status: "success",
            progress: 100,
            videoUrl: data.videoUrl,
            frames: data.coverUrl ? [data.coverUrl] : [],
          });
          toast.success("Vídeo finalizado!");
          return;
        }
      } catch {
        // Continue polling
      }
    }

    updateVideoTask(localTaskId, { status: "fail" });
    toast.error("Tempo esgotado. O vídeo demorou demais.");
  };

  const handleDownload = (url: string, type: "video" | "image") => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `panda-bold-${type}-${Date.now()}.${type === "video" ? "mp4" : "png"}`;
    a.target = "_blank";
    a.click();
    toast.success("Download iniciado!");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Settings panel */}
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" /> Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Descrição do vídeo</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva a cena do vídeo que deseja gerar..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Duração</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Resolução</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Estilo</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStyle(s)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all border",
                    selectedStyle === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full btn-gradient"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Video className="h-4 w-4 mr-1" />
            )}
            {loading ? "Gerando..." : "Gerar Vídeo"}
          </Button>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              Modelo <span className="font-medium text-primary">CogVideoX-3</span> via Z.ai • Fallback: <span className="font-medium text-primary">Gemini 3.1 Flash Image</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results panel */}
      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" /> Vídeos Gerados
            {videoTasks.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{videoTasks.length}</Badge>
            )}
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
            <div className="grid gap-4 sm:grid-cols-2">
              {videoTasks.map((task) => (
                <Card key={task.id} className="border-border/50 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Video/Preview */}
                    {task.videoUrl ? (
                      <div className="relative aspect-video bg-muted">
                        <video
                          src={task.videoUrl}
                          controls
                          className="w-full h-full object-cover"
                          poster={task.frames[0]}
                        />
                      </div>
                    ) : task.frames[0] ? (
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={task.frames[0]}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Badge variant="secondary" className="text-xs">Preview</Badge>
                        </div>
                      </div>
                    ) : task.status === "processing" ? (
                      <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <Progress value={task.progress} className="w-2/3 h-1.5" />
                        <p className="text-[10px] text-muted-foreground">Gerando vídeo...</p>
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">Falha na geração</p>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <p className="text-sm line-clamp-2 font-medium">{task.prompt}</p>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={task.status === "success" ? "default" : task.status === "fail" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {task.status === "processing" ? "Processando" : task.status === "success" ? "Concluído" : "Falhou"}
                        </Badge>
                        <div className="flex gap-1">
                          {task.videoUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDownload(task.videoUrl!, "video")}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {task.frames[0] && !task.videoUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDownload(task.frames[0], "image")}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
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
