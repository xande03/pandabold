import { useState, useRef } from "react";
import {
  ImageIcon,
  Wand2,
  Download,
  Copy,
  Maximize2,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const IMAGE_MODELS = [
  { id: "google/gemini-2.5-flash-image", name: "Gemini Flash Image", tier: "Standard" },
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", tier: "Premium" },
];

const SIZES = [
  { id: "1024x1024", label: "1:1 Square", desc: "1024×1024" },
  { id: "1344x768", label: "16:9 Landscape", desc: "1344×768" },
  { id: "768x1344", label: "9:16 Portrait", desc: "768×1344" },
  { id: "1440x720", label: "2:1 Wide", desc: "1440×720" },
  { id: "1152x864", label: "4:3 Classic", desc: "1152×864" },
  { id: "864x1152", label: "3:4 Vertical", desc: "864×1152" },
];

const STYLES = [
  { id: "none", name: "None", prefix: "" },
  { id: "photorealistic", name: "Photorealistic", prefix: "photorealistic, ultra detailed, 8k resolution, " },
  { id: "digital-art", name: "Digital Art", prefix: "digital art, concept art, trending on artstation, " },
  { id: "anime", name: "Anime", prefix: "anime style, vibrant colors, detailed illustration, " },
  { id: "cyberpunk", name: "Cyberpunk", prefix: "cyberpunk style, neon lights, futuristic, " },
  { id: "oil-painting", name: "Oil Painting", prefix: "oil painting style, classical art, museum quality, " },
  { id: "fantasy", name: "Fantasy", prefix: "fantasy art, magical, ethereal, " },
  { id: "cinematic", name: "Cinematic", prefix: "cinematic shot, movie still, dramatic lighting, " },
  { id: "hyperrealistic", name: "Hyperrealistic", prefix: "hyperrealistic, extremely detailed, lifelike, " },
];

export function ImageLab() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0].id);
  const [size, setSize] = useState("1024x1024");
  const [style, setStyle] = useState("none");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { generatedImages, addGeneratedImage } = useAppStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      // TODO: Connect to edge function
      await new Promise((r) => setTimeout(r, 3000));
      setProgress(100);

      toast.info("Connect to Lovable Cloud to enable AI image generation.");
    } catch (error) {
      toast.error("Generation failed");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setProgress(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Settings Panel */}
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Prompt</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
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
                {IMAGE_MODELS.map((m) => (
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

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-[10px] font-medium transition-all border",
                    size === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Style</label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Reference Image (optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileUpload}
            />
            {referenceImage ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={referenceImage} alt="Reference" className="w-full h-24 object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 bg-background/80"
                  onClick={() => setReferenceImage(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full text-xs h-9"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload Reference
              </Button>
            )}
          </div>

          {loading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">Generating...</p>
            </div>
          )}

          <Button
            className="w-full btn-gradient"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Wand2 className="h-4 w-4 mr-1" />
            )}
            Generate
          </Button>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Gallery
            {generatedImages.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{generatedImages.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generatedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No images generated yet</p>
              <p className="text-xs mt-1">Write a prompt and click Generate</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {generatedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-lg overflow-hidden border border-border cursor-pointer"
                  onClick={() => setPreviewImage(img.url)}
                >
                  <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-all flex items-end p-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80">
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
