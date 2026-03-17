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
  User,
  Palette,
  Sticker,
  Monitor,
  Presentation,
  BookOpen,
  Brush,
  Star,
  Frame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { GenerationLoading } from "@/components/ui/generation-loading";
import { supabase } from "@/integrations/supabase/client";

const IMAGE_MODELS = [
  { id: "glm-image", name: "GLM-Image (Z.ai)", tier: "Econômico", provider: "zai" },
  { id: "google/gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image", tier: "Rápido", provider: "gemini" },
  { id: "google/gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", tier: "Pro", provider: "gemini" },
  { id: "black-forest-labs/flux.2-pro", name: "FLUX.2 Pro", tier: "Premium", provider: "openrouter" },
  { id: "bytedance-seed/seedream-4.5", name: "Seedream 4.5", tier: "Premium", provider: "openrouter" },
];

const SIZES = [
  { id: "1024x1024", label: "1:1 Quadrado", desc: "1024×1024" },
  { id: "1344x768", label: "16:9 Paisagem", desc: "1344×768" },
  { id: "768x1344", label: "9:16 Retrato", desc: "768×1344" },
  { id: "1440x720", label: "2:1 Amplo", desc: "1440×720" },
  { id: "1152x864", label: "4:3 Clássico", desc: "1152×864" },
  { id: "864x1152", label: "3:4 Vertical", desc: "864×1152" },
];

const CREATION_MODELS = [
  { id: "cartoon", name: "Cartoon", icon: Palette, prompt: "Transforme esta imagem em um estilo cartoon colorido e vibrante, com traços suaves, cores vivas e aspecto divertido." },
  { id: "caricature", name: "Caricatura", icon: Star, prompt: "Crie uma caricatura exagerada e cômica a partir desta imagem, com proporções distorcidas de forma humorística e expressões exageradas." },
  { id: "webui", name: "Web UI", icon: Monitor, prompt: "Transforme esta imagem em um design de interface web (UI/UX) moderno, com layout limpo, elementos de interface e estilo profissional de aplicativo." },
  { id: "slide", name: "Slide", icon: Presentation, prompt: "Transforme esta imagem em um slide de apresentação profissional, com layout elegante, tipografia limpa e design corporativo." },
  { id: "logo", name: "Logomarca", icon: Frame, prompt: "Crie uma logomarca minimalista e profissional inspirada nesta imagem, com formas geométricas limpas e design vetorial." },
  { id: "anime", name: "Anime", icon: BookOpen, prompt: "Transforme esta imagem no estilo anime japonês, com olhos grandes expressivos, cores vibrantes e traços detalhados de mangá." },
  { id: "hq", name: "HQ", icon: BookOpen, prompt: "Transforme esta imagem em estilo de história em quadrinhos (HQ/comic book), com traços fortes, sombreamento dramático e cores intensas." },
  { id: "poster", name: "Poster", icon: Frame, prompt: "Crie um poster artístico e impactante a partir desta imagem, com composição cinematográfica, tipografia integrada e design profissional." },
  { id: "sticker", name: "Adesivo", icon: Sticker, prompt: "Transforme esta imagem em um adesivo/sticker fofo e estilizado, com contorno branco, fundo transparente e design simplificado." },
  { id: "lego", name: "LEGO", icon: Frame, prompt: "Transforme esta imagem em uma cena feita inteiramente de peças LEGO, com personagens e cenário construídos em blocos LEGO coloridos, mantendo o estilo icônico dos brinquedos LEGO com texturas plásticas e encaixes visíveis." },
  { id: "free", name: "Modo Livre", icon: Brush, prompt: "" },
  { id: "avatar", name: "Avatar", icon: User, prompt: "Crie um avatar estilizado do rosto da pessoa nesta imagem, com estilo artístico digital, cores vibrantes e detalhes profissionais. Foque apenas no rosto." },
];

export function ImageLab() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0].id);
  const [size, setSize] = useState("1024x1024");
  const [selectedCreationModel, setSelectedCreationModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<"image" | "image+text" | "text">("image+text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { generatedImages, addGeneratedImage } = useAppStore();

  const handleCreationModelSelect = (modelId: string) => {
    setSelectedCreationModel(modelId);
    const cm = CREATION_MODELS.find((m) => m.id === modelId);
    if (cm && cm.prompt) {
      if (referenceImage) {
        setPrompt(`Transforme a imagem enviada: ${cm.prompt}`);
        toast.info(`Prompt preenchido para "${cm.name}" com imagem de referência`);
      } else {
        setPrompt(cm.prompt);
        toast.info(`Prompt preenchido para "${cm.name}"`);
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !(selectedCreationModel === "avatar" && avatarMode === "image" && referenceImage)) return;
    setLoading(true);

    try {
      let finalPrompt = prompt;
      if (selectedCreationModel === "avatar" && avatarMode === "image" && !prompt.trim()) {
        finalPrompt = "Crie um avatar estilizado do rosto da pessoa nesta imagem, com estilo artístico digital, cores vibrantes e detalhes profissionais. Foque apenas no rosto.";
      }

      const selectedModel = IMAGE_MODELS.find((m) => m.id === model);
      const isZai = selectedModel?.provider === "zai";
      const isOpenRouter = selectedModel?.provider === "openrouter";

      const creationModelData = selectedCreationModel
        ? CREATION_MODELS.find((m) => m.id === selectedCreationModel)
        : null;

      // Z.ai image API doesn't support reference images natively.
      // When a reference image is provided, use Gemini which supports image input.
      const useZai = isZai && !referenceImage;

      let functionName: string;
      let body: any;

      if (isOpenRouter) {
        functionName = "generate-image-openrouter";
        body = {
          prompt: finalPrompt,
          model: model,
          referenceImage: referenceImage || undefined,
        };
      } else if (useZai) {
        functionName = "generate-image-zai";
        body = {
          prompt: finalPrompt,
          size,
          creationMode: creationModelData?.name || undefined,
        };
      } else {
        functionName = "generate-image";
        body = {
          prompt: finalPrompt,
          referenceImage: referenceImage || undefined,
          model: isZai ? "google/gemini-3.1-flash-image-preview" : model,
        };
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.imageUrl) {
        addGeneratedImage({
          id: crypto.randomUUID(),
          prompt: finalPrompt,
          url: data.imageUrl,
          model,
          size,
          creationModel: selectedCreationModel || undefined,
          timestamp: Date.now(),
        });
        toast.success("Imagem gerada com sucesso!");
      } else {
        toast.error("Nenhuma imagem retornada");
      }
    } catch (error: any) {
      toast.error(error.message || "Falha na geração");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Tamanho máximo: 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `panda-bold-${Date.now()}.png`;
    a.click();
  };

  const isAvatarMode = selectedCreationModel === "avatar";

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Settings Panel */}
      <Card className="lg:w-80 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Creation Models */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Modelos de Criação</label>
            <ScrollArea className="h-32">
              <div className="grid grid-cols-3 gap-1.5">
                {CREATION_MODELS.map((cm) => {
                  const Icon = cm.icon;
                  return (
                    <button
                      key={cm.id}
                      onClick={() => handleCreationModelSelect(cm.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium transition-all border",
                        selectedCreationModel === cm.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {cm.name}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Avatar mode selector */}
          {isAvatarMode && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Modo Avatar</label>
              <div className="flex rounded-lg bg-muted p-1">
                {([
                  { id: "image", label: "Imagem" },
                  { id: "image+text", label: "Imagem+Texto" },
                  { id: "text", label: "Texto" },
                ] as const).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setAvatarMode(m.id)}
                    className={cn(
                      "flex-1 rounded-md px-1 py-1 text-[10px] font-medium transition-all",
                      avatarMode === m.id ? "btn-gradient shadow" : "text-muted-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt */}
          {(!isAvatarMode || avatarMode !== "image") && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva a imagem que deseja criar..."
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Modelo de IA</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
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
            <label className="text-xs font-medium text-muted-foreground">Proporção</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-[10px] font-medium transition-all border",
                    size === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Image */}
          {(!isAvatarMode || avatarMode !== "text") && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                {isAvatarMode ? "Foto do rosto" : "Imagem de referência (opcional)"}
              </label>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              {referenceImage ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={referenceImage} alt="Referência" className="w-full h-24 object-cover" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-background/80" onClick={() => setReferenceImage(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-xs h-9" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3 w-3 mr-1" />
                  Enviar imagem
                </Button>
              )}
            </div>
          )}

          {loading && <GenerationLoading />}

          <Button
            className="w-full btn-gradient"
            onClick={handleGenerate}
            disabled={loading || (!prompt.trim() && !(isAvatarMode && avatarMode === "image" && referenceImage))}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
            Gerar
          </Button>
        </CardContent>
      </Card>

      {/* Gallery */}
      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Galeria
            {generatedImages.length > 0 && <Badge variant="secondary" className="text-[10px]">{generatedImages.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <GenerationLoading type="image" />
          ) : generatedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma imagem gerada</p>
              <p className="text-xs mt-1">Escreva um prompt e clique em Gerar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {generatedImages.map((img) => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border cursor-pointer" onClick={() => setPreviewImage(img.url)}>
                  <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-all flex items-end p-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80" onClick={(e) => { e.stopPropagation(); handleDownload(img.url); }}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(img.prompt); toast.success("Prompt copiado!"); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80">
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {img.creationModel && (
                    <div className="absolute top-1 left-1">
                      <Badge variant="secondary" className="text-[9px]">{CREATION_MODELS.find((m) => m.id === img.creationModel)?.name}</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Visualização</DialogTitle></DialogHeader>
          {previewImage && <img src={previewImage} alt="Preview" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
