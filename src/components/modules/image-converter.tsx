import { useState, useRef } from "react";
import { Upload, Download, X, RefreshCw, ImageIcon, FileType, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const FORMATS = [
  { id: "png", label: "PNG", mime: "image/png", desc: "Sem perdas, suporta transparência" },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", desc: "Compressão com perdas, menor tamanho" },
  { id: "webp", label: "WebP", mime: "image/webp", desc: "Formato moderno, ótima compressão" },
  { id: "bmp", label: "BMP", mime: "image/bmp", desc: "Bitmap sem compressão" },
];

const RESIZE_PRESETS = [
  { label: "Original", w: 0, h: 0 },
  { label: "Instagram (1080×1080)", w: 1080, h: 1080 },
  { label: "Full HD (1920×1080)", w: 1920, h: 1080 },
  { label: "Stories (1080×1920)", w: 1080, h: 1920 },
  { label: "Thumbnail (300×300)", w: 300, h: 300 },
  { label: "Banner (1200×628)", w: 1200, h: 628 },
];

export function ImageConverter() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageInfo, setImageInfo] = useState<{ w: number; h: number; size: string } | null>(null);
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(90);
  const [resizePreset, setResizePreset] = useState(0);
  const [customW, setCustomW] = useState(0);
  const [customH, setCustomH] = useState(0);
  const [converting, setConverting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Máximo 50MB"); return; }

    setImageName(file.name);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImageUrl(url);
      setResultUrl(null);

      const img = new Image();
      img.onload = () => {
        setImageInfo({ w: img.width, h: img.height, size: `${sizeMB} MB` });
        setCustomW(img.width);
        setCustomH(img.height);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleConvert = () => {
    if (!imageUrl) return;
    setConverting(true);
    setResultUrl(null);

    const img = new Image();
    img.onload = () => {
      const preset = RESIZE_PRESETS[resizePreset];
      const targetW = preset.w || customW || img.width;
      const targetH = preset.h || customH || img.height;

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;

      // Fill white background for JPEG (no alpha)
      if (format === "jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetW, targetH);
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      const fmt = FORMATS.find((f) => f.id === format)!;
      const qualityVal = format === "png" || format === "bmp" ? undefined : quality / 100;

      canvas.toBlob(
        (blob) => {
          if (!blob) { toast.error("Erro na conversão"); setConverting(false); return; }
          const url = URL.createObjectURL(blob);
          const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
          setResultUrl(url);
          setResultSize(`${sizeMB} MB`);
          setConverting(false);
          toast.success("Conversão concluída!");
        },
        fmt.mime,
        qualityVal,
      );
    };
    img.src = imageUrl;
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const nameBase = imageName.replace(/\.[^.]+$/, "");
    a.download = `${nameBase || "convertido"}.${format}`;
    a.click();
  };

  const clearAll = () => {
    setImageUrl(null);
    setResultUrl(null);
    setImageInfo(null);
    setImageName("");
    setResizePreset(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload */}
      <Card className="border-border/50 card-gradient">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileType className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Conversor de Imagem</h3>
          </div>

          {!imageUrl ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground text-center">Clique ou arraste uma imagem</span>
              <span className="text-xs text-muted-foreground mt-1">Suporta PNG, JPEG, WebP, BMP e mais</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          ) : (
            <div className="relative">
              <img src={imageUrl} alt="Original" className="w-full max-h-64 object-contain rounded-lg" />
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-background/80" onClick={clearAll}>
                <X className="h-4 w-4" />
              </Button>
              {imageInfo && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{imageInfo.w}×{imageInfo.h}</Badge>
                  <Badge variant="outline" className="text-xs">{imageInfo.size}</Badge>
                  <Badge variant="outline" className="text-xs">{imageName.split(".").pop()?.toUpperCase()}</Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      {imageUrl && (
        <Card className="border-border/50 card-gradient">
          <CardContent className="p-4 space-y-4">
            {/* Format */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Formato de Saída</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`rounded-lg border p-3 text-center transition-all ${
                      format === f.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="text-sm font-bold block">{f.label}</span>
                    <span className="text-[10px]">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality (only for lossy formats) */}
            {(format === "jpeg" || format === "webp") && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Qualidade: {quality}%
                </label>
                <Slider
                  value={[quality]}
                  onValueChange={(v) => setQuality(v[0])}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Menor arquivo</span>
                  <span>Melhor qualidade</span>
                </div>
              </div>
            )}

            {/* Resize */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Redimensionar</label>
              <Select value={String(resizePreset)} onValueChange={(v) => setResizePreset(Number(v))}>
                <SelectTrigger className="w-full h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESIZE_PRESETS.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {resizePreset === 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Largura</label>
                    <Input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Altura</label>
                    <Input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))} className="h-9 text-sm" />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleConvert}
              disabled={converting}
              className="btn-gradient w-full h-11"
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Converter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {resultUrl && (
        <Card className="border-border/50 card-gradient">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Resultado</h3>
                <Badge variant="secondary" className="text-xs">{format.toUpperCase()}</Badge>
                <Badge variant="outline" className="text-xs">{resultSize}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
            <img src={resultUrl} alt="Convertido" className="w-full max-h-80 object-contain rounded-lg border border-primary/30" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
