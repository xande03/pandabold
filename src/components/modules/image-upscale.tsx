import { useState, useRef } from "react";
import { Upload, Download, Maximize2, X, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenerationLoading } from "@/components/ui/generation-loading";
import { useAppStore } from "@/lib/store/app-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRESETS = [
  "Restaurar detalhes e nitidez máxima",
  "Aumentar resolução preservando texturas",
  "Melhorar cores e contraste com HDR",
  "Restaurar rosto com detalhes realistas",
];

export function ImageUpscale() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState("2x");
  const [description, setDescription] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addUpscaledImage } = useAppStore();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setResultUrl(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUpscale = async () => {
    if (!imageUrl) {
      toast.error("Faça upload de uma imagem primeiro");
      return;
    }
    const desc = description || customInput;
    if (!desc) {
      toast.error("Escolha ou digite uma descrição de upscale");
      return;
    }

    setLoading(true);
    setResultUrl(null);

    const instruction = `Upscale this image by ${scale}. ${desc}. Maintain the original composition and subject matter. Output a high-resolution enhanced version.`;

    try {
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: { imageUrl, instruction, model: "google/gemini-3-pro-image-preview" },
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error("Nenhuma imagem retornada");

      setResultUrl(data.imageUrl);
      addUpscaledImage({
        id: crypto.randomUUID(),
        originalUrl: imageUrl,
        upscaledUrl: data.imageUrl,
        scale,
        description: desc,
        timestamp: Date.now(),
      });
      toast.success("Upscale concluído!");
    } catch (err: any) {
      console.error("Upscale error:", err);
      toast.error(err.message || "Erro ao processar upscale");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `upscale-${Date.now()}.png`;
    a.click();
  };

  const clearImage = () => {
    setImageUrl(null);
    setResultUrl(null);
    setDescription("");
    setCustomInput("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload */}
      <Card className="border-border/50 card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Maximize2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Upload de Imagem</h3>
          </div>

          {!imageUrl ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Clique ou arraste uma imagem</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          ) : (
            <div className="relative">
              <img src={imageUrl} alt="Original" className="w-full max-h-80 object-contain rounded-lg" />
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-background/80" onClick={clearImage}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config */}
      {imageUrl && (
        <Card className="border-border/50 card-gradient">
          <CardContent className="p-4 space-y-4">
            {/* Scale */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Proporção</label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2x">2x</SelectItem>
                  <SelectItem value="4x">4x</SelectItem>
                  <SelectItem value="8x">8x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Presets */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição do Upscale</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Badge
                    key={p}
                    variant={description === p ? "default" : "outline"}
                    className="cursor-pointer text-xs py-1.5 px-3 transition-all hover:bg-primary/20"
                    onClick={() => { setDescription(p); setCustomInput(""); }}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Ou digite sua descrição</label>
              <Input
                placeholder="Ex: Restaurar foto antiga com cores vibrantes..."
                value={customInput}
                onChange={(e) => { setCustomInput(e.target.value); setDescription(""); }}
                className="text-sm"
              />
            </div>

            <Button
              onClick={handleUpscale}
              disabled={loading || (!description && !customInput)}
              className="btn-gradient w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Aplicar Upscale {scale}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && <GenerationLoading type="image" />}

      {/* Result */}
      {resultUrl && (
        <Card className="border-border/50 card-gradient">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Resultado</h3>
              <Button variant="outline" size="sm" onClick={() => handleDownload(resultUrl)}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Original</p>
                <img src={imageUrl!} alt="Original" className="w-full rounded-lg border border-border" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Upscale {scale}</p>
                <img src={resultUrl} alt="Upscaled" className="w-full rounded-lg border border-primary/30" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
