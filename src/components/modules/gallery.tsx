import { useState, useMemo } from "react";
import {
  LayoutGrid, ImageIcon, Video, QrCode, Download, Eye,
  Filter, Maximize2, ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store/app-store";

type GalleryFilter = "all" | "generated" | "edited" | "qrcode" | "upscale" | "video";
type SortOrder = "newest" | "oldest";

export function Gallery() {
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { generatedImages, editedImages, videoTasks, qrCodes, upscaledImages } = useAppStore();

  const allItems = useMemo(() => [
    ...generatedImages.map((img) => ({
      id: img.id, type: "generated" as const, url: img.url,
      label: img.prompt, model: img.model, timestamp: img.timestamp,
    })),
    ...editedImages.map((img) => ({
      id: img.id, type: "edited" as const, url: img.editedUrl,
      label: img.prompt, model: img.operation, timestamp: img.timestamp,
    })),
    ...videoTasks.filter((v) => v.status === "success" && v.videoUrl).map((v) => ({
      id: v.id, type: "video" as const, url: v.videoUrl!,
      label: v.prompt, model: v.model, timestamp: v.timestamp,
    })),
    ...qrCodes.map((qr) => ({
      id: qr.id, type: "qrcode" as const, url: qr.qrUrl,
      label: qr.content, model: qr.type, timestamp: qr.timestamp,
    })),
    ...upscaledImages.map((img) => ({
      id: img.id, type: "upscale" as const, url: img.upscaledUrl,
      label: img.description, model: img.scale, timestamp: img.timestamp,
    })),
  ], [generatedImages, editedImages, videoTasks, qrCodes, upscaledImages]);

  const filtered = useMemo(() => {
    const items = filter === "all" ? allItems : allItems.filter((i) => i.type === filter);
    return items.sort((a, b) => sort === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
  }, [allItems, filter, sort]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "generated": case "edited": return <ImageIcon className="h-3 w-3" />;
      case "video": return <Video className="h-3 w-3" />;
      case "qrcode": return <QrCode className="h-3 w-3" />;
      case "upscale": return <Maximize2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "generated": return "Gerada";
      case "edited": return "Editada";
      case "video": return "Vídeo";
      case "qrcode": return "QR Code";
      case "upscale": return "Upscale";
      default: return type;
    }
  };

  const countByType = (t: string) => allItems.filter((i) => i.type === t).length;

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as GalleryFilter)}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({allItems.length})</SelectItem>
            <SelectItem value="generated">Imagens geradas ({countByType("generated")})</SelectItem>
            <SelectItem value="edited">Imagens editadas ({countByType("edited")})</SelectItem>
            <SelectItem value="qrcode">QR Codes ({countByType("qrcode")})</SelectItem>
            <SelectItem value="upscale">Upscale ({countByType("upscale")})</SelectItem>
            <SelectItem value="video">Vídeos ({countByType("video")})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOrder)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mais recentes</SelectItem>
            <SelectItem value="oldest">Mais antigos</SelectItem>
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
