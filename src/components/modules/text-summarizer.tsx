import { useState, useRef } from "react";
import { FileText, Upload, Loader2, Copy, Check, Sparkles, RotateCcw, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SUMMARIZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-text`;

const SUMMARIZER_MODELS = [
  { id: "gemini-flash-lite", name: "Gemini 2.5 Flash Lite ⚡", provider: "lovable", model: "google/gemini-2.5-flash-lite" },
  { id: "gemini-flash", name: "Gemini 2.5 Flash", provider: "lovable", model: "google/gemini-2.5-flash" },
  { id: "gemini-pro", name: "Gemini 2.5 Pro", provider: "lovable", model: "google/gemini-2.5-pro" },
  { id: "gpt-5-nano", name: "GPT-5 Nano ⚡", provider: "lovable", model: "openai/gpt-5-nano" },
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324" },
];

type OutputType = "resumo" | "pontos-chave" | "flashcards";

/* ── Flashcard Grid ── */
function FlashcardGrid({ text }: { text: string }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const cards = text.split(/\n\n+/).filter(block => {
    return /PERGUNTA:/i.test(block) && /RESPOSTA:/i.test(block);
  }).map(block => {
    const qMatch = block.match(/(?:\*\*)?PERGUNTA:?\*?\*?\s*(.+?)(?=\n(?:\*\*)?RESPOSTA:)/si);
    const aMatch = block.match(/(?:\*\*)?RESPOSTA:?\*?\*?\s*(.+)/si);
    const levelMatch = block.match(/\[(Básico|Intermediário|Avançado)\]/i);
    return {
      question: qMatch?.[1]?.trim() || "",
      answer: aMatch?.[1]?.trim() || "",
      level: levelMatch?.[1] || null,
    };
  }).filter(c => c.question && c.answer);

  if (cards.length === 0) {
    return <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">{text}</div>;
  }

  const levelColor = (level: string | null) => {
    if (!level) return "secondary";
    const l = level.toLowerCase();
    if (l === "básico") return "secondary" as const;
    if (l === "intermediário") return "default" as const;
    return "destructive" as const;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map((card, i) => (
        <div
          key={i}
          onClick={() => setFlipped(prev => ({ ...prev, [i]: !prev[i] }))}
          className={cn(
            "cursor-pointer rounded-xl border border-border p-4 min-h-[140px] flex flex-col justify-between transition-all duration-300 hover:shadow-md",
            flipped[i] ? "bg-primary/10 border-primary/30" : "bg-card"
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Badge variant={flipped[i] ? "default" : "secondary"} className="text-[10px] shrink-0">
                {flipped[i] ? "Resposta" : "Pergunta"} {i + 1}
              </Badge>
              {card.level && (
                <Badge variant={levelColor(card.level)} className="text-[10px] shrink-0">
                  {card.level}
                </Badge>
              )}
            </div>
            <RotateCcw className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
          <p className="text-sm leading-relaxed flex-1">
            {flipped[i] ? card.answer : card.question}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">Clique para virar</p>
        </div>
      ))}
    </div>
  );
}

/* ── Key Points Renderer ── */
function KeyPointsRenderer({ text }: { text: string }) {
  const lines = text.split("\n").filter(l => l.trim());

  // Detect if first line(s) are context paragraph (no bullet, no bold header)
  let contextLines: string[] = [];
  let contentLines: string[] = [];
  let foundFirstStructured = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!foundFirstStructured) {
      const isHeader = /^\*\*[^*]+\*\*\s*$/.test(trimmed);
      const isBullet = /^[•\-]\s/.test(trimmed);
      if (!isHeader && !isBullet) {
        contextLines.push(trimmed);
        continue;
      }
      foundFirstStructured = true;
    }
    contentLines.push(trimmed);
  }

  return (
    <div className="space-y-3">
      {contextLines.length > 0 && (
        <div className="border-l-2 border-primary/30 pl-3 mb-4">
          <p className="text-sm italic text-muted-foreground leading-relaxed">
            {contextLines.join(" ")}
          </p>
        </div>
      )}
      {contentLines.map((trimmed, i) => {
        // Category header
        if (/^\*\*[^*]+\*\*\s*$/.test(trimmed)) {
          const title = trimmed.replace(/\*\*/g, "").trim();
          return (
            <div key={i} className="mt-4 first:mt-0">
              <Badge variant="secondary" className="text-xs font-semibold">{title}</Badge>
            </div>
          );
        }
        // Bullet with bold title
        const bulletMatch = trimmed.match(/^[•\-]\s*\*\*(.+?)\*\*\s*[—\-–:]\s*(.+)/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-primary mt-1 shrink-0">•</span>
              <p className="text-sm leading-relaxed">
                <span className="font-semibold text-foreground">{bulletMatch[1]}</span>
                <span className="text-muted-foreground"> — {bulletMatch[2]}</span>
              </p>
            </div>
          );
        }
        return <p key={i} className="text-sm leading-relaxed pl-2">{trimmed}</p>;
      })}
    </div>
  );
}

/* ── Summary Renderer ── */
function SummaryRenderer({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Standalone bold line = heading
        if (/^\*\*[^*]+\*\*\s*$/.test(trimmed)) {
          const title = trimmed.replace(/\*\*/g, "").trim();
          return (
            <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-1 first:mt-0">
              {title}
            </h3>
          );
        }

        // Inline bold within paragraph
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-sm leading-relaxed">
            {parts.map((part, j) => {
              if (/^\*\*[^*]+\*\*$/.test(part)) {
                return <strong key={j} className="font-semibold text-foreground">{part.replace(/\*\*/g, "")}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

/* ── Main Component ── */
export function TextSummarizer() {
  const [inputText, setInputText] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("resumo");
  const [summarizerModel, setSummarizerModel] = useState(SUMMARIZER_MODELS[0].id);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "text/plain") {
      setInputText(await file.text());
      toast.success("Arquivo de texto carregado!");
    } else if (file.type === "application/pdf") {
      toast.info("Lendo PDF...");
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setInputText(`__PDF_BASE64__${base64}`);
        toast.success("PDF carregado! Clique em Gerar para processar.");
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Formato não suportado. Use .txt ou .pdf");
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) { toast.error("Cole um texto ou envie um arquivo primeiro."); return; }
    setLoading(true);
    setResult("");
    const selectedModel = SUMMARIZER_MODELS.find((m) => m.id === summarizerModel) || SUMMARIZER_MODELS[0];
    try {
      const resp = await fetch(SUMMARIZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: inputText, type: outputType, provider: selectedModel.provider, model: selectedModel.model }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }
      if (!resp.body) throw new Error("Sem corpo na resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { full += content; setResult(full); }
          } catch {}
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar resumo");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumo-pandabold.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("TXT exportado!");
  };

  const handleExportPdf = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumo - PandaBold</title><style>body{font-family:system-ui,sans-serif;max-width:700px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a}h1,h2,h3{margin-top:1.5rem}ul{padding-left:1.5rem}</style></head><body><h1>Resumo — PandaBold</h1><div style="white-space:pre-wrap">${result.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("afterprint", () => URL.revokeObjectURL(url));
      win.addEventListener("load", () => { win.print(); });
    } else {
      URL.revokeObjectURL(url);
      toast.error("Permita pop-ups para exportar como PDF.");
    }
  };

  const renderResult = () => {
    if (!result) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
          <FileText className="h-10 w-10 mb-2 opacity-40" />
          Cole um texto e clique em Gerar
        </div>
      );
    }
    if (outputType === "flashcards") return <FlashcardGrid text={result} />;
    if (outputType === "pontos-chave") return <KeyPointsRenderer text={result} />;
    return <SummaryRenderer text={result} />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            Texto de Entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Cole seu texto aqui ou envie um arquivo..."
            className="min-h-[200px] sm:min-h-[300px] resize-none"
            value={inputText.startsWith("__PDF_BASE64__") ? "(PDF carregado — pronto para processar)" : inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={loading} className="flex-1">
              <Upload className="h-4 w-4 mr-1" /> Upload PDF / TXT
            </Button>
          </div>
          <Tabs value={outputType} onValueChange={(v) => setOutputType(v as OutputType)}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="pontos-chave">Pontos-chave</TabsTrigger>
              <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Modelo de IA</label>
            <Select value={summarizerModel} onValueChange={setSummarizerModel}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUMMARIZER_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      {m.name}
                      <Badge variant="outline" className="text-[10px] h-4">{m.provider === "openrouter" ? "OpenRouter" : "Lovable"}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !inputText.trim()} className="w-full btn-gradient">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Gerando..." : "Gerar"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Resultado
            </CardTitle>
            {result && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportTxt}>
                      <FileText className="h-4 w-4 mr-2" /> Exportar como TXT
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPdf}>
                      <Download className="h-4 w-4 mr-2" /> Exportar como PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          {result && <Badge variant="secondary" className="w-fit">{outputType}</Badge>}
        </CardHeader>
        <CardContent>{renderResult()}</CardContent>
      </Card>
    </div>
  );
}
