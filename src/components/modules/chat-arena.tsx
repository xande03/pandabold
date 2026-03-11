import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, Send, Copy, RotateCcw, Filter, Loader2, Bot, User,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AI_MODELS = [
  { id: "glm-4.7-flash", name: "GLM-4.7 Flash ⚡", provider: "Z.ai (Grátis)", endpoint: "chat-zai" },
  { id: "glm-4.5-flash", name: "GLM-4.5 Flash ⚡", provider: "Z.ai (Grátis)", endpoint: "chat-zai" },
  { id: "glm-5", name: "GLM-5", provider: "Z.ai", endpoint: "chat-zai" },
  { id: "glm-4-plus", name: "GLM-4 Plus", provider: "Z.ai", endpoint: "chat-zai" },
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

async function streamChat(
  messages: Array<{ role: string; content: string }>,
  model: string,
  endpoint: string,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
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
  const [model, setModel] = useState(AI_MODELS[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    chatHistoryA: chatHistory,
    addChatMessageA: addChatMessage,
    updateLastAssistantA: updateLastAssistant,
    clearChatA: clearChat,
  } = useAppStore();

  const filteredModels = providerFilter === "all" ? AI_MODELS : AI_MODELS.filter((m) => m.provider === providerFilter);
  const providers = [...new Set(AI_MODELS.map((m) => m.provider))];
  const modelInfo = AI_MODELS.find((m) => m.id === model);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const info = AI_MODELS.find((m) => m.id === model);
    const endpoint = info?.endpoint || "chat";

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMsg);
    setInput("");
    setLoading(true);

    addChatMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      model: model,
      timestamp: Date.now(),
    });

    let accumulated = "";
    const msgs = [...chatHistory, userMsg].map((m) => ({ role: m.role, content: m.content }));

    await streamChat(
      msgs,
      model,
      endpoint,
      (chunk) => { accumulated += chunk; updateLastAssistant(accumulated); },
      () => setLoading(false),
      (err) => { toast.error(err); setLoading(false); },
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border/50 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-lg btn-gradient flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-9 text-sm font-medium max-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredModels.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-sm">
                  <span>{m.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">• {m.provider}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {providers.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat} title="Limpar conversa">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scroll-smooth" ref={scrollRef}>
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
            <div className="h-16 w-16 rounded-2xl btn-gradient flex items-center justify-center opacity-80">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Olá! Como posso ajudar?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usando <span className="font-medium text-primary">{modelInfo?.name}</span> via {modelInfo?.provider}
              </p>
            </div>
          </div>
        )}

        {chatHistory.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={cn(
              "rounded-2xl px-4 py-3 text-sm max-w-[80%] shadow-sm",
              msg.role === "user"
                ? "btn-gradient text-white rounded-br-md"
                : "bg-muted/80 border border-border/40 rounded-bl-md"
            )}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content || (loading ? "..." : "")}</p>
              {msg.role === "assistant" && msg.content && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/20">
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => copyToClipboard(msg.content)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  {msg.model && (
                    <Badge variant="outline" className="text-[9px] h-5 ml-auto opacity-60">
                      {AI_MODELS.find(m => m.id === msg.model)?.name || msg.model}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm pl-10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs">Gerando resposta...</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2 pt-3 mt-3 border-t border-border/50">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <Button
          size="icon"
          className="btn-gradient h-11 w-11 shrink-0 rounded-xl"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
