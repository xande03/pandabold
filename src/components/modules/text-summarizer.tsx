import { useState, useRef } from "react";
import { FileText, Upload, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const SUMMARIZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-text`;

type OutputType = "resumo" | "pontos-chave" | "flashcards";

export function TextSummarizer() {
  const [inputText, setInputText] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("resumo");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain") {
      const text = await file.text();
      setInputText(text);
      toast.success("Arquivo de texto carregado!");
    } else if (file.type === "application/pdf") {
      toast.info("Lendo PDF... texto será extraído pelo servidor.");
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
    if (!inputText.trim()) {
      toast.error("Cole um texto ou envie um arquivo primeiro.");
      return;
    }
    setLoading(true);
    setResult("");

    try {
      const resp = await fetch(SUMMARIZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: inputText, type: outputType }),
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
            if (content) {
              full += content;
              setResult(full);
            }
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Input */}
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
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
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

          <Button onClick={handleGenerate} disabled={loading || !inputText.trim()} className="w-full btn-gradient">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {loading ? "Gerando..." : "Gerar"}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Resultado
            </CardTitle>
            {result && (
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {result && <Badge variant="secondary" className="w-fit">{outputType}</Badge>}
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {result}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              <FileText className="h-10 w-10 mb-2 opacity-40" />
              Cole um texto e clique em Gerar
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
