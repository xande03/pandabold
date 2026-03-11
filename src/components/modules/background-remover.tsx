import { useState, useRef } from "react";
import { Upload, Download, X, Sparkles, Loader2, ImageIcon, Eraser } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GenerationLoading } from "@/components/ui/generation-loading";
import { useAppStore } from "@/lib/store/app-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BG_OPTIONS = [
  { id: "transparent", label: "Transparente", prompt: "Remove the background completely, making it transparent. Keep the main subject with clean edges and no artifacts." },
  { id: "white", label: "Fundo branco", prompt: "Remove the background and replace it with a pure white background. Keep the main subject with clean edges." },
  { id: "blur", label: "Fundo desfocado", prompt: "Apply a strong gaussian blur effect to the background while keeping the main subject sharp and in focus." },
  { id: "custom", label: "Personalizado", prompt: "" },
];

export function BackgroundRemover() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bgOption, setBgOption] = useState("transparent");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addEditedImage } = useAppStore();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setImageUrl(reader.result as string); setResultUrl(null); };
    reader.readAsDataURL(file);
  };

  const handleRemove = async () => {
    if (!imageUrl) return;
    setLoading(true);
    setResultUrl(null);

    const option = BG_OPTIONS.find((o) => o.id === bgOption);
    const instruction = bgOption === "custom" ? customPrompt : option?.prompt || "";

    if (!instruction.trim()) {
      toast.error("Descreva como deseja o fundo");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("edit-image", {
        body: { imageUrl, instruction, model: "google/gemini-3.1-flash-image-preview" },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (!data?.imageUrl) throw new Error("Nenhuma imagem retornada");

      setResultUrl(data.imageUrl);
      addEditedImage({
        id: crypto.randomUUID(),
        originalUrl: imageUrl,
        editedUrl: data.imageUrl,
        operation: "background",
        prompt: instruction,
        timestamp: Date.now(),
      });
      toast.success("Fundo removido com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover fundo");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `sem-fundo-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload */}
      <Card className="border-border/50 card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Eraser className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Remover Fundo</h3>
          </div>

          {!imageUrl ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground text-center">Clique ou arraste uma imagem</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          ) : (
            <div className="relative">
              <img src={imageUrl} alt="Original" className="w-full max-h-72 object-contain rounded-lg" />
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-background/80" onClick={() => { setImageUrl(null); setResultUrl(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options */}
      {imageUrl && (
        <Card className="border-border/50 card-gradient">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Tipo de remoção</label>
              <div className="flex flex-wrap gap-2">
                {BG_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.id}
                    variant={bgOption === opt.id ? "default" : "outline"}
                    className="cursor-pointer text-xs py-2 px-3 min-h-[36px] transition-all hover:bg-primary/20"
                    onClick={() => setBgOption(opt.id)}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            {bgOption === "custom" && (
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ex: Trocar fundo por uma praia tropical ao pôr do sol..."
                className="min-h-[60px] text-sm resize-none"
              />
            )}

            <Button
              onClick={handleRemove}
              disabled={loading || (bgOption === "custom" && !customPrompt.trim())}
              className="btn-gradient w-full h-11"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Remover Fundo
            </Button>
          </CardContent>
        </Card>
      )}

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
                <p className="text-xs text-muted-foreground mb-1">Sem fundo</p>
                <div className="bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZGRkIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNkZGQiLz48L3N2Zz4=')] rounded-lg border border-primary/30">
                  <img src={resultUrl} alt="Sem fundo" className="w-full rounded-lg" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
