import { useState, useRef, useEffect } from "react";
import {
  QrCode,
  Link,
  Type,
  ImageIcon,
  Music,
  FileText,
  File,
  Download,
  Copy,
  Upload,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GenerationLoading } from "@/components/ui/generation-loading";
import QRCodeLib from "qrcode";
import { supabase } from "@/integrations/supabase/client";

const QR_TYPES = [
  { id: "link", label: "Link", icon: Link },
  { id: "text", label: "Texto", icon: Type },
  { id: "image", label: "Imagem", icon: ImageIcon },
  { id: "music", label: "Música", icon: Music },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "file", label: "Arquivo", icon: File },
];

const ACCEPTED_FILES: Record<string, string> = {
  image: "image/*",
  music: "audio/*",
  pdf: ".pdf,application/pdf",
  file: "*",
};

export function QRCodeGenerator() {
  const [qrType, setQrType] = useState("link");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { qrCodes, setQRCodes, addQRCode } = useAppStore();

  // Load QR codes from DB and subscribe to realtime
  useEffect(() => {
    const loadQRCodes = async () => {
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setQRCodes(
          data.map((row: any) => ({
            id: row.id,
            type: row.type,
            content: row.content,
            qrUrl: row.qr_url,
            timestamp: new Date(row.created_at).getTime(),
          }))
        );
      }
    };

    loadQRCodes();

    const channel = supabase
      .channel("qr_codes_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "qr_codes" },
        (payload) => {
          const row = payload.new as any;
          addQRCode({
            id: row.id,
            type: row.type,
            content: row.content,
            qrUrl: row.qr_url,
            timestamp: new Date(row.created_at).getTime(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("Tamanho máximo: 10MB"); return; }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  };

  const handleGenerate = async () => {
    let qrContent = "";

    if (qrType === "link" || qrType === "text") {
      if (!content.trim()) { toast.error("Insira o conteúdo"); return; }
      qrContent = content.trim();
    } else {
      if (!file) { toast.error("Envie um arquivo"); return; }

      // Upload file to storage
      setLoading(true);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from("qr-files")
        .upload(filePath, file);

      if (uploadError) {
        toast.error("Falha no upload do arquivo");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("qr-files")
        .getPublicUrl(filePath);

      qrContent = urlData.publicUrl;
    }

    if (!loading) setLoading(true);

    try {
      const qrDataUrl = await QRCodeLib.toDataURL(qrContent, {
        width: 512,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });

      setGeneratedQR(qrDataUrl);

      // Persist to DB (realtime will update the store)
      const { error } = await supabase.from("qr_codes").insert({
        type: qrType,
        content: qrContent,
        qr_url: qrDataUrl,
      });

      if (error) {
        console.error("DB insert error:", error);
        // Fallback to local store if DB fails
        addQRCode({
          id: crypto.randomUUID(),
          type: qrType,
          content: qrContent,
          qrUrl: qrDataUrl,
          timestamp: Date.now(),
        });
      }

      toast.success("QR Code gerado!");
    } catch (error) {
      toast.error("Falha na geração");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (!generatedQR) return;
    const a = document.createElement("a");
    a.href = generatedQR;
    a.download = `panda-bold-qr-${Date.now()}.png`;
    a.click();
  };

  const handleCopyQR = async () => {
    if (!generatedQR) return;
    try {
      const blob = await (await fetch(generatedQR)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("QR Code copiado!");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const needsFile = ["image", "music", "pdf", "file"].includes(qrType);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      <Card className="lg:w-96 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            Gerador de QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex rounded-lg bg-muted p-1">
            {QR_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { setQrType(t.id); setContent(""); setFile(null); setFilePreview(null); setGeneratedQR(null); }}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium transition-all",
                    qrType === t.id ? "btn-gradient shadow" : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {qrType === "link" && (
            <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="https://exemplo.com" className="text-sm" />
          )}
          {qrType === "text" && (
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Digite seu texto..." className="min-h-[80px] text-sm resize-none" />
          )}
          {needsFile && (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept={ACCEPTED_FILES[qrType]} onChange={handleFileUpload} />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-all"
              >
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="h-24 rounded-lg object-cover mb-2" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                )}
                <p className="text-sm text-muted-foreground">{file ? file.name : `Enviar arquivo ${qrType}`}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Máx 10MB</p>
              </div>
            </>
          )}

          {loading && <GenerationLoading type="qr" />}

          <Button className="w-full btn-gradient" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <QrCode className="h-4 w-4 mr-1" />}
            Gerar QR Code
          </Button>

          {generatedQR && (
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white">
              <img src={generatedQR} alt="QR Code" className="w-48 h-48" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={handleDownloadQR}>
                  <Download className="h-3 w-3 mr-1" />PNG
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={handleCopyQR}>
                  <Copy className="h-3 w-3 mr-1" />Copiar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            Histórico
            {qrCodes.length > 0 && <Badge variant="secondary" className="text-[10px]">{qrCodes.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {qrCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <QrCode className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum QR code ainda</p>
              <p className="text-xs mt-1">Gere seu primeiro QR code</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {qrCodes.map((qr) => (
                <Card key={qr.id} className="border-border/50 cursor-pointer hover:border-primary/50 transition-all">
                  <CardContent className="p-3 flex flex-col items-center">
                    <div className="bg-white p-2 rounded-md mb-2">
                      <img src={qr.qrUrl} alt="QR" className="w-20 h-20" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{QR_TYPES.find((t) => t.id === qr.type)?.label || qr.type}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">{qr.content}</p>
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
