import { useState } from "react";
import {
  MessageSquare,
  Swords,
  User,
  Send,
  Copy,
  RotateCcw,
  Filter,
  Loader2,
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
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AI_MODELS = [
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", endpoint: "chat" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", endpoint: "chat" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "Google", endpoint: "chat" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", provider: "Google", endpoint: "chat" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro", provider: "Google", endpoint: "chat" },
  { id: "openai/gpt-5", name: "GPT-5", provider: "OpenAI", endpoint: "chat" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", endpoint: "chat" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", provider: "OpenAI", endpoint: "chat" },
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "OpenAI", endpoint: "chat" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq", endpoint: "chat-groq" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq", endpoint: "chat-groq" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", provider: "Groq", endpoint: "chat-groq" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", provider: "Groq", endpoint: "chat-groq" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "OpenRouter", endpoint: "chat-openrouter" },
  { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout", provider: "OpenRouter", endpoint: "chat-openrouter" },
  { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", provider: "OpenRouter", endpoint: "chat-openrouter" },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", provider: "OpenRouter", endpoint: "chat-openrouter" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type ChatMode = "battle" | "individual";

async function streamChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ messages, model }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Erro ao conectar com a IA");
    return;
  }

  if (!resp.body) { onError("Sem resposta"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

export function ChatArena() {
  const [mode, setMode] = useState<ChatMode>("battle");
  const [modelA, setModelA] = useState(AI_MODELS[0].id);
  const [modelB, setModelB] = useState(AI_MODELS[5].id);
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const {
    chatHistoryA, chatHistoryB,
    addChatMessageA, addChatMessageB,
    updateLastAssistantA, updateLastAssistantB,
    clearChatA, clearChatB,
  } = useAppStore();

  const filteredModels = providerFilter === "all" ? AI_MODELS : AI_MODELS.filter((m) => m.provider === providerFilter);
  const providers = [...new Set(AI_MODELS.map((m) => m.provider))];

  const handleSend = async (side: "A" | "B") => {
    const input = side === "A" ? inputA : inputB;
    if (!input.trim()) return;

    const model = side === "A" ? modelA : modelB;
    const addMsg = side === "A" ? addChatMessageA : addChatMessageB;
    const setLoading = side === "A" ? setLoadingA : setLoadingB;
    const setInput = side === "A" ? setInputA : setInputB;
    const updateFn = side === "A" ? updateLastAssistantA : updateLastAssistantB;
    const history = side === "A" ? chatHistoryA : chatHistoryB;

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    addMsg(userMsg);
    setInput("");
    setLoading(true);

    addMsg({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      model,
      timestamp: Date.now(),
    });

    let accumulated = "";
    const msgs = [...history, userMsg].map((m) => ({ role: m.role, content: m.content }));

    await streamChat(
      msgs,
      model,
      (chunk) => { accumulated += chunk; updateFn(accumulated); },
      () => setLoading(false),
      (err) => { toast.error(err); setLoading(false); },
    );
  };

  const handleBattleSend = () => {
    if (!inputA.trim()) return;
    setInputB(inputA);
    handleSend("A");
    setTimeout(() => handleSend("B"), 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const renderChat = (
    history: typeof chatHistoryA,
    side: "A" | "B",
    model: string,
    input: string,
    setInput: (v: string) => void,
    loading: boolean
  ) => {
    const modelInfo = AI_MODELS.find((m) => m.id === model);

    return (
      <Card className="flex flex-col h-full border-border/50 card-gradient">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full btn-gradient flex items-center justify-center text-xs font-bold text-white">
                {side}
              </div>
              <div>
                <CardTitle className="text-sm">{modelInfo?.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{modelInfo?.provider}</p>
              </div>
            </div>
            <Select value={model} onValueChange={side === "A" ? setModelA : setModelB}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredModels.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-3">
              {history.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-12">
                  Inicie uma conversa...
                </div>
              )}
              {history.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "rounded-xl px-3 py-2 text-sm max-w-[85%]",
                    msg.role === "user" ? "btn-gradient text-white" : "bg-muted"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content || (loading ? "..." : "")}</p>
                    {msg.role === "assistant" && msg.content && (
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/30">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(msg.content)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </div>
              )}
            </div>
          </ScrollArea>
          {mode === "individual" && (
            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="min-h-[40px] max-h-[100px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(side); }
                }}
              />
              <Button size="icon" className="btn-gradient h-10 w-10 shrink-0" onClick={() => handleSend(side)} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setMode("battle")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all", mode === "battle" ? "btn-gradient shadow" : "text-muted-foreground")}
          >
            <Swords className="h-4 w-4" />
            Batalha
          </button>
          <button
            onClick={() => setMode("individual")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all", mode === "individual" ? "btn-gradient shadow" : "text-muted-foreground")}
          >
            <User className="h-4 w-4" />
            Individual
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {providers.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="sm" onClick={() => { clearChatA(); clearChatB(); }}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      <div className={cn("flex-1 min-h-0 grid gap-4", mode === "battle" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl mx-auto w-full")}>
        {renderChat(chatHistoryA, "A", modelA, inputA, setInputA, loadingA)}
        {mode === "battle" && renderChat(chatHistoryB, "B", modelB, inputB, setInputB, loadingB)}
      </div>

      {mode === "battle" && (
        <div className="flex gap-2 max-w-2xl mx-auto w-full flex-shrink-0">
          <Textarea
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            placeholder="Envie o mesmo prompt para ambos os modelos..."
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleBattleSend(); } }}
          />
          <Button className="btn-gradient h-10 px-4 shrink-0" onClick={handleBattleSend} disabled={loadingA || loadingB || !inputA.trim()}>
            <Send className="h-4 w-4 mr-1" />
            Enviar
          </Button>
        </div>
      )}
    </div>
  );
}
