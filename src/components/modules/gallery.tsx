import { useState } from "react";
import {
  LayoutGrid,
  ImageIcon,
  Video,
  QrCode,
  Download,
  Eye,
  Calendar,
  Filter,
  Maximize2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type GalleryFilter = "all" | "image" | "video" | "qrcode" | "upscale";

export function Gallery() {
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { generatedImages, editedImages, videoTasks, qrCodes } = useAppStore();

  const allItems = [
    ...generatedImages.map((img) => ({
      id: img.id,
      type: "image" as const,
      url: img.url,
      label: img.prompt,
      model: img.model,
      timestamp: img.timestamp,
    })),
    ...editedImages.map((img) => ({
      id: img.id,
      type: "image" as const,
      url: img.editedUrl,
      label: img.prompt,
      model: img.operation,
      timestamp: img.timestamp,
    })),
    ...videoTasks
      .filter((v) => v.status === "success" && v.videoUrl)
      .map((v) => ({
        id: v.id,
        type: "video" as const,
        url: v.videoUrl!,
        label: v.prompt,
        model: v.model,
        timestamp: v.timestamp,
      })),
    ...qrCodes.map((qr) => ({
      id: qr.id,
      type: "qrcode" as const,
      url: qr.qrUrl,
      label: qr.content,
      model: qr.type,
      timestamp: qr.timestamp,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const filtered = filter === "all" ? allItems : allItems.filter((i) => i.type === filter);

  const typeIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="h-3 w-3" />;
      case "video": return <Video className="h-3 w-3" />;
      case "qrcode": return <QrCode className="h-3 w-3" />;
      default: return null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "image": return "Imagem";
      case "video": return "Vídeo";
      case "qrcode": return "QR Code";
      default: return type;
    }
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as GalleryFilter)}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({allItems.length})</SelectItem>
            <SelectItem value="image">Imagens ({allItems.filter((i) => i.type === "image").length})</SelectItem>
            <SelectItem value="video">Vídeos ({allItems.filter((i) => i.type === "video").length})</SelectItem>
            <SelectItem value="qrcode">QR Codes ({allItems.filter((i) => i.type === "qrcode").length})</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">
          {filtered.length} {filtered.length === 1 ? "item" : "itens"}
        </Badge>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-border/50 card-gradient">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum item na galeria</p>
            <p className="text-xs mt-1">Gere imagens, vídeos ou QR codes para vê-los aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="border-border/50 card-gradient group cursor-pointer overflow-hidden hover:border-primary/50 transition-all"
            >
              <div className="relative aspect-square">
                {item.type === "qrcode" ? (
                  <div className="w-full h-full flex items-center justify-center bg-white p-4">
                    <img src={item.url} alt="QR" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80" onClick={() => setPreviewUrl(item.url)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80" onClick={() => handleDownload(item.url, `panda-bold-${item.id}`)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Badge variant="outline" className="text-[9px] gap-0.5">
                    {typeIcon(item.type)}
                    {typeLabel(item.type)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>
                <p className="text-[9px] text-muted-foreground/60">
                  {new Date(item.timestamp).toLocaleDateString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visualização</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
