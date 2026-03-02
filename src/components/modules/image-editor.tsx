import { useState, useRef, useCallback } from "react";
import {
  Paintbrush,
  Upload,
  Plus,
  Minus,
  Pencil,
  Palette,
  Sparkles,
  ImageIcon,
  Loader2,
  ArrowLeftRight,
  Download,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EDIT_OPERATIONS = [
  { id: "add", name: "Add", icon: Plus, placeholder: "E.g. Add a red hat, add a bird in the sky...", color: "text-green-500" },
  { id: "remove", name: "Remove", icon: Minus, placeholder: "E.g. Remove background, remove people...", color: "text-red-500" },
  { id: "modify", name: "Modify", icon: Pencil, placeholder: "E.g. Change hair color to blonde...", color: "text-blue-500" },
  { id: "style", name: "Style", icon: Palette, placeholder: "E.g. Transform to anime style, oil painting...", color: "text-purple-500" },
  { id: "enhance", name: "Enhance", icon: Sparkles, placeholder: "E.g. Improve sharpness, fix colors...", color: "text-yellow-500" },
  { id: "background", name: "Background", icon: ImageIcon, placeholder: "E.g. Change background to beach, blur background...", color: "text-cyan-500" },
];

const OUTPUT_SIZES = [
  { id: "original", label: "Original" },
  { id: "1024x1024", label: "1:1 Square" },
  { id: "1344x768", label: "16:9 Landscape" },
  { id: "768x1344", label: "9:16 Portrait" },
];

export function ImageEditor() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [operation, setOperation] = useState("add");
  const [prompt, setPrompt] = useState("");
  const [outputSize, setOutputSize] = useState("original");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compareDialog, setCompareDialog] = useState<{ original: string; edited: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { editedImages, addEditedImage } = useAppStore();

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleEdit = async () => {
    if (!uploadedImage || !prompt.trim()) return;
    setLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      // TODO: Connect to edge function
      await new Promise((r) => setTimeout(r, 3000));
      setProgress(100);
      toast.info("Connect to Lovable Cloud to enable AI image editing.");
    } catch (error) {
      toast.error("Edit failed");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setProgress(0);
    }
  };

  const currentOp = EDIT_OPERATIONS.find((o) => o.id === operation)!;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Upload & Settings */}
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Paintbrush className="h-4 w-4 text-primary" />
            Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {uploadedImage ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={uploadedImage} alt="Uploaded" className="w-full h-40 object-contain bg-muted" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 bg-background/80"
                onClick={() => setUploadedImage(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Drop image or click to upload</p>
              <p className="text-[10px] text-muted-foreground mt-1">Max 10MB</p>
            </div>
          )}

          {/* Operations */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Operation</label>
            <div className="grid grid-cols-3 gap-1.5">
              {EDIT_OPERATIONS.map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.id}
                    onClick={() => setOperation(op.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[10px] font-medium transition-all border",
                      operation === op.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", operation === op.id ? "text-primary" : op.color)} />
                    {op.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Instructions</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={currentOp.placeholder}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Output Size</label>
            <Select value={outputSize} onValueChange={setOutputSize}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_SIZES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">Processing...</p>
            </div>
          )}

          <Button
            className="w-full btn-gradient"
            onClick={handleEdit}
            disabled={loading || !uploadedImage || !prompt.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Paintbrush className="h-4 w-4 mr-1" />
            )}
            Apply Edit
          </Button>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Edits
            {editedImages.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{editedImages.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Paintbrush className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No edits yet</p>
              <p className="text-xs mt-1">Upload an image and apply an edit</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {editedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-lg overflow-hidden border border-border cursor-pointer"
                  onClick={() => setCompareDialog({ original: img.originalUrl, edited: img.editedUrl })}
                >
                  <img src={img.editedUrl} alt={img.prompt} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 p-2">
                    <Badge variant="outline" className="text-[10px]">{img.operation}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compare Dialog */}
      <Dialog open={!!compareDialog} onOpenChange={() => setCompareDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Compare
            </DialogTitle>
          </DialogHeader>
          {compareDialog && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Original</p>
                <img src={compareDialog.original} alt="Original" className="w-full rounded-lg" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Edited</p>
                <img src={compareDialog.edited} alt="Edited" className="w-full rounded-lg" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
