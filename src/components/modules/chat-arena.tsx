import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, Send, Copy, RotateCcw, Loader2, Bot, User,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODEL = { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Groq)", endpoint: "chat-groq" };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function streamChat(
  messages: Array<{ role: string; content: string }>,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${MODEL.endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ messages, model: MODEL.id }),
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    chatHistoryA: chatHistory,
    addChatMessageA: addChatMessage,
    updateLastAssistantA: updateLastAssistant,
    clearChatA: clearChat,
  } = useAppStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

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
      model: MODEL.id,
      timestamp: Date.now(),
    });

    let accumulated = "";
    const msgs = [...chatHistory, userMsg].map((m) => ({ role: m.role, content: m.content }));

    await streamChat(
      msgs,
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
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border/50 mb-3">
        <div className="h-8 w-8 rounded-lg btn-gradient flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{MODEL.name}</p>
          <p className="text-[10px] text-muted-foreground">Rápido • Econômico • Eficiente</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat} title="Limpar conversa">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scroll-smooth" ref={scrollRef}>
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
            <div className="h-16 w-16 rounded-2xl btn-gradient flex items-center justify-center opacity-80">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Olá! Como posso ajudar?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usando <span className="font-medium text-primary">{MODEL.name}</span>
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
                  <Badge variant="outline" className="text-[9px] h-5 ml-auto opacity-60">
                    {MODEL.name}
                  </Badge>
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

      {/* Input */}
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
