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
  Type,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { GenerationLoading } from "@/components/ui/generation-loading";
import { supabase } from "@/integrations/supabase/client";

const EDIT_OPERATIONS = [
  { id: "add", name: "Adicionar", icon: Plus, placeholder: "Ex: Adicionar um chapéu vermelho...", color: "text-green-500" },
  { id: "remove", name: "Remover", icon: Minus, placeholder: "Ex: Remover fundo, remover pessoas...", color: "text-red-500" },
  { id: "modify", name: "Modificar", icon: Pencil, placeholder: "Ex: Mudar cor do cabelo para loiro...", color: "text-blue-500" },
  { id: "style", name: "Estilo", icon: Palette, placeholder: "Ex: Transformar em estilo anime...", color: "text-purple-500" },
  { id: "enhance", name: "Melhorar", icon: Sparkles, placeholder: "Ex: Melhorar nitidez, corrigir cores...", color: "text-yellow-500" },
  { id: "background", name: "Fundo", icon: ImageIcon, placeholder: "Ex: Trocar fundo para praia...", color: "text-cyan-500" },
  { id: "text", name: "Texto", icon: Type, placeholder: "Ex: Adicionar texto 'Olá Mundo'...", color: "text-orange-500" },
];

const FONTS = [
  "Arial", "Roboto", "Montserrat", "Playfair Display", "Comic Sans MS",
  "Georgia", "Impact", "Courier New", "Bebas Neue", "Pacifico",
];

const OUTPUT_SIZES = [
  { id: "original", label: "Original" },
  { id: "1024x1024", label: "1:1 Quadrado" },
  { id: "1344x768", label: "16:9 Paisagem" },
  { id: "768x1344", label: "9:16 Retrato" },
];

export function ImageEditor() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [operation, setOperation] = useState("add");
  const [prompt, setPrompt] = useState("");
  const [outputSize, setOutputSize] = useState("original");
  const [loading, setLoading] = useState(false);
  const [compareDialog, setCompareDialog] = useState<{ original: string; edited: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text overlay state
  const [textOverlay, setTextOverlay] = useState("");
  const [textFont, setTextFont] = useState("Arial");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [isDraggingText, setIsDraggingText] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const { editedImages, addEditedImage } = useAppStore();

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("Tamanho máximo: 10MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Envie um arquivo de imagem"); return; }
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

  const handleTextDrag = (e: React.MouseEvent) => {
    if (!isDraggingText || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTextPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleEdit = async () => {
    if (!uploadedImage || !prompt.trim()) return;
    setLoading(true);

    try {
      let instruction = prompt;
      if (operation === "text" && textOverlay) {
        instruction = `${prompt}. Adicione o texto "${textOverlay}" na posição aproximada (${Math.round(textPosition.x)}%, ${Math.round(textPosition.y)}%) da imagem, usando fonte ${textFont}, tamanho ${textSize}px, cor ${textColor}.`;
      }

      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: {
          imageUrl: uploadedImage,
          instruction,
          model: "google/gemini-3.1-flash-image-preview",
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      if (data?.imageUrl) {
        addEditedImage({
          id: crypto.randomUUID(),
          originalUrl: uploadedImage,
          editedUrl: data.imageUrl,
          operation,
          prompt,
          timestamp: Date.now(),
        });
        toast.success("Edição aplicada!");
      }
    } catch (error: any) {
      toast.error(error.message || "Falha na edição");
    } finally {
      setLoading(false);
    }
  };

  const currentOp = EDIT_OPERATIONS.find((o) => o.id === operation)!;
  const isTextMode = operation === "text";

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Paintbrush className="h-4 w-4 text-primary" />
            Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          
          {uploadedImage ? (
            <div
              ref={imageContainerRef}
              className="relative rounded-lg overflow-hidden border border-border cursor-crosshair"
              onMouseMove={handleTextDrag}
              onMouseUp={() => setIsDraggingText(false)}
              onMouseLeave={() => setIsDraggingText(false)}
            >
              <img src={uploadedImage} alt="Enviada" className="w-full h-40 object-contain bg-muted" />
              
              {/* Text overlay preview */}
              {isTextMode && textOverlay && (
                <div
                  className="absolute pointer-events-auto cursor-move select-none"
                  style={{
                    left: `${textPosition.x}%`,
                    top: `${textPosition.y}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${Math.max(8, textSize * 0.3)}px`,
                    fontFamily: textFont,
                    color: textColor,
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    fontWeight: "bold",
                  }}
                  onMouseDown={(e) => { e.preventDefault(); setIsDraggingText(true); }}
                >
                  {textOverlay}
                </div>
              )}
              
              <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-background/80" onClick={() => setUploadedImage(null)}>
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
              <p className="text-sm text-muted-foreground">Arraste ou clique para enviar</p>
              <p className="text-[10px] text-muted-foreground mt-1">Máx 10MB</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Operação</label>
            <div className="grid grid-cols-4 gap-1.5">
              {EDIT_OPERATIONS.map((op) => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.id}
                    onClick={() => setOperation(op.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium transition-all border",
                      operation === op.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", operation === op.id ? "text-primary" : op.color)} />
                    {op.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text overlay controls */}
          {isTextMode && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Texto</label>
                <Input
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder="Digite o texto..."
                  className="text-sm h-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Fonte</label>
                  <Select value={textFont} onValueChange={setTextFont}>
                    <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map((f) => (<SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Tamanho</label>
                  <Input type="number" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="h-7 text-[10px]" min={8} max={200} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">Cor</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-7 w-10 rounded cursor-pointer" />
                  <span className="text-[10px] text-muted-foreground">{textColor}</span>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground">💡 Arraste o texto sobre a imagem para posicionar</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Instruções</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={currentOp.placeholder} className="min-h-[60px] text-sm resize-none" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tamanho de saída</label>
            <Select value={outputSize} onValueChange={setOutputSize}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTPUT_SIZES.map((s) => (<SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {loading && <GenerationLoading />}

          <Button className="w-full btn-gradient" onClick={handleEdit} disabled={loading || !uploadedImage || !prompt.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Paintbrush className="h-4 w-4 mr-1" />}
            Aplicar Edição
          </Button>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Edições
            {editedImages.length > 0 && <Badge variant="secondary" className="text-[10px]">{editedImages.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <GenerationLoading type="image" />
          ) : editedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Paintbrush className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma edição ainda</p>
              <p className="text-xs mt-1">Envie uma imagem e aplique uma edição</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {editedImages.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border cursor-pointer" onClick={() => setCompareDialog({ original: img.originalUrl, edited: img.editedUrl })}>
                  <img src={img.editedUrl} alt={img.prompt} className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 p-2">
                    <Badge variant="outline" className="text-[10px]">{EDIT_OPERATIONS.find((o) => o.id === img.operation)?.name || img.operation}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!compareDialog} onOpenChange={() => setCompareDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" />Comparar</DialogTitle>
          </DialogHeader>
          {compareDialog && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Original</p>
                <img src={compareDialog.original} alt="Original" className="w-full rounded-lg" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Editada</p>
                <img src={compareDialog.edited} alt="Editada" className="w-full rounded-lg" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
