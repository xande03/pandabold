import { useState, useRef } from "react";
import {
  QrCode,
  Link,
  Type,
  ImageIcon,
  Music,
  FileText,
  Download,
  Copy,
  Upload,
  ExternalLink,
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

const QR_TYPES = [
  { id: "link", label: "Link", icon: Link },
  { id: "text", label: "Text", icon: Type },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "music", label: "Music", icon: Music },
  { id: "pdf", label: "PDF", icon: FileText },
];

const ACCEPTED_FILES: Record<string, string> = {
  image: "image/*",
  music: "audio/*",
  pdf: ".pdf,application/pdf",
};

export function QRCodeGenerator() {
  const [qrType, setQrType] = useState("link");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { qrCodes, addQRCode } = useAppStore();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB");
      return;
    }
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
    if (qrType === "link" || qrType === "text") {
      if (!content.trim()) {
        toast.error("Please enter content");
        return;
      }
    } else {
      if (!file) {
        toast.error("Please upload a file");
        return;
      }
    }

    setLoading(true);

    try {
      // TODO: Connect to edge function or use client-side QR lib
      await new Promise((r) => setTimeout(r, 1500));
      toast.info("Connect to Lovable Cloud to enable QR code generation.");
    } catch (error) {
      toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const needsFile = ["image", "music", "pdf"].includes(qrType);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Input */}
      <Card className="lg:w-96 shrink-0 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            QR Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Type Tabs */}
          <div className="flex rounded-lg bg-muted p-1">
            {QR_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { setQrType(t.id); setContent(""); setFile(null); setFilePreview(null); }}
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

          {/* Content Input */}
          {qrType === "link" && (
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="https://example.com"
              className="text-sm"
            />
          )}
          {qrType === "text" && (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your text..."
              className="min-h-[80px] text-sm resize-none"
            />
          )}
          {needsFile && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={ACCEPTED_FILES[qrType]}
                onChange={handleFileUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-all"
              >
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="h-24 rounded-lg object-cover mb-2" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                )}
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : `Upload ${qrType} file`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Max 10MB</p>
              </div>
            </>
          )}

          <Button
            className="w-full btn-gradient"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <QrCode className="h-4 w-4 mr-1" />
            )}
            Generate QR Code
          </Button>

          {/* Generated QR Preview */}
          {generatedQR && (
            <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-muted">
              <div className="bg-white p-3 rounded-lg">
                <img src={generatedQR} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  PNG
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card className="flex-1 border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            History
            {qrCodes.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{qrCodes.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {qrCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <QrCode className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No QR codes yet</p>
              <p className="text-xs mt-1">Generate your first QR code</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {qrCodes.map((qr) => (
                <Card key={qr.id} className="border-border/50 cursor-pointer hover:border-primary/50 transition-all">
                  <CardContent className="p-3 flex flex-col items-center">
                    <div className="bg-white p-2 rounded-md mb-2">
                      <img src={qr.qrUrl} alt="QR" className="w-20 h-20" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">{qr.type}</Badge>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                      {qr.content}
                    </p>
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
