import { useState, useRef } from "react";
import {
  Video,
  Play,
  Upload,
  X,
  Loader2,
  Download,
  Clock,
  Clapperboard,
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

const VIDEO_MODELS = [
  { id: "runway-gen3-turbo", name: "Runway Gen3 Turbo", tier: "Premium" },
  { id: "luma-dream-machine", name: "Luma Dream Machine", tier: "Premium" },
  { id: "kling-v1-5", name: "Kling v1.5", tier: "Premium" },
  { id: "stable-video-diffusion", name: "SVD", tier: "Free" },
  { id: "cogvideox-5b", name: "CogVideoX 5B", tier: "Free" },
];

const DURATIONS = [
  { value: "4", label: "4s Quick" },
  { value: "5", label: "5s Standard" },
  { value: "6", label: "6s Extended" },
  { value: "10", label: "10s Long" },
];

const RESOLUTIONS = [
  { id: "1024x1024", label: "1:1" },
  { id: "1344x768", label: "16:9" },
  { id: "768x1344", label: "9:16" },
  { id: "1920x1080", label: "1080p" },
  { id: "1280x720", label: "720p" },
];

const STYLES = [
  "Realistic", "Cinematic", "Anime", "Pixar 3D", "Cyberpunk", "Fantasy",
  "Slow Motion", "Timelapse", "Film Noir", "Vintage", "Dreamy", "Epic",
];

export function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(VIDEO_MODELS[0].id);
  const [duration, setDuration] = useState("5");
  const [resolution, setResolution] = useState("1344x768");
  const [quality, setQuality] = useState<"speed" | "quality">("quality");
  const [selectedStyle, setSelectedStyle] = useState("Cinematic");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { videoTasks, addVideoTask, updateVideoTask } = useAppStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    const taskId = crypto.randomUUID();
    addVideoTask({
      id: taskId,
      prompt: prompt.trim(),
      model,
      status: "processing",
      progress: 0,
      timestamp: Date.now(),
    });

    // Simulate progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 10;
      if (prog >= 100) {
        clearInterval(interval);
        updateVideoTask(taskId, { status: "success", progress: 100 });
        toast.success("Video generation simulated! Connect Cloud for real generation.");
      } else {
        updateVideoTask(taskId, { progress: Math.min(prog, 95) });
      }
    }, 1000);

    setLoading(false);
    setPrompt("");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Settings */}
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-primary" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Model</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      {m.name}
                      <Badge variant="outline" className="text-[10px] h-4">{m.tier}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Resolution</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Quality</label>
            <div className="flex rounded-lg bg-muted p-1">
              {(["speed", "quality"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
                    quality === q ? "btn-gradient shadow" : "text-muted-foreground"
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Style</label>
            <div className="flex flex-wrap gap-1">
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
            <Video className="h-4 w-4 mr-1" />
            Generate Video
          </Button>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Tasks
            {videoTasks.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{videoTasks.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videoTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Video className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No video tasks yet</p>
              <p className="text-xs mt-1">Describe a scene and click Generate</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videoTasks.map((task) => (
                <Card key={task.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm line-clamp-2">{task.prompt}</p>
                      <Badge
                        variant={task.status === "success" ? "default" : task.status === "fail" ? "destructive" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      {task.model}
                    </div>
                    {task.status === "processing" && (
                      <Progress value={task.progress} className="h-1.5" />
                    )}
                    {task.status === "success" && (
                      <div className="mt-2 rounded-lg bg-muted aspect-video flex items-center justify-center">
                        <Play className="h-8 w-8 text-muted-foreground" />
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
