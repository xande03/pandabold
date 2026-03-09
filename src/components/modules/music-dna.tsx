import { useState, useRef } from "react";
import {
  Music,
  Upload,
  Play,
  Pause,
  Link as LinkIcon,
  Hash,
  Loader2,
  BarChart3,
  Guitar,
  Mic2,
  Clock,
  Users,
  Disc3,
  Heart,
  Download,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MusicAnalysis } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GenerationLoading } from "@/components/ui/generation-loading";
import { supabase } from "@/integrations/supabase/client";

type InputMode = "upload" | "youtube";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getYoutComUrl(youtubeUrl: string): string | null {
  const id = extractYouTubeId(youtubeUrl);
  if (!id) return null;
  return `https://yout.com/playlist/?list=RD${id}&v=${id}`;
}

export function MusicDNA() {
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MusicAnalysis | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("Tamanho máximo: 50MB"); return; }
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setAnalysis(null);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleAnalyze = async () => {
    if (inputMode === "upload" && !audioFile) { toast.error("Envie um arquivo de áudio"); return; }
    if (inputMode === "youtube" && !youtubeUrl.trim()) { toast.error("Insira uma URL do YouTube"); return; }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-music", {
        body: {
          songInfo: audioFile ? `Arquivo: ${audioFile.name}, tipo: ${audioFile.type}` : undefined,
          youtubeUrl: inputMode === "youtube" ? youtubeUrl : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      setAnalysis(data as MusicAnalysis);
      toast.success("Análise concluída!");
    } catch (error: any) {
      toast.error(error.message || "Falha na análise");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMp3 = () => {
    if (!youtubeUrl.trim()) { toast.error("Insira uma URL do YouTube primeiro"); return; }
    const url = getYoutComUrl(youtubeUrl);
    if (!url) { toast.error("URL do YouTube inválida"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Input Section */}
      <Card className="border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Disc3 className="h-4 w-4 text-primary" />
            Analisador Music DNA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => { setInputMode("upload"); setAnalysis(null); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                inputMode === "upload" ? "btn-gradient shadow" : "text-muted-foreground"
              )}
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              onClick={() => { setInputMode("youtube"); setAnalysis(null); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                inputMode === "youtube" ? "btn-gradient shadow" : "text-muted-foreground"
              )}
            >
              <LinkIcon className="h-4 w-4" />
              YouTube
            </button>
          </div>

          {inputMode === "upload" ? (
            <>
              <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-all"
              >
                <Music className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {audioFile ? audioFile.name : "Arraste ou clique para enviar"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">MP3, WAV, OGG, FLAC, AAC, M4A • Máx 50MB</p>
              </div>
              {audioUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={togglePlay}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <p className="text-xs truncate flex-1">{audioFile?.name}</p>
                  <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="text-sm"
              />
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={handleDownloadMp3}
                disabled={!youtubeUrl.trim()}
              >
                <Download className="h-3 w-3 mr-1" />
                Baixar MP3 via yout.com
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}

          {loading && <GenerationLoading type="music" />}

          <Button className="w-full btn-gradient" onClick={handleAnalyze} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <BarChart3 className="h-4 w-4 mr-1" />}
            Analisar
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Genres */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Disc3 className="h-4 w-4 text-primary" />Gêneros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.genres?.map((g) => (
                <div key={g.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">{Math.round(g.confidence * 100)}%</span>
                  </div>
                  <Progress value={g.confidence * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Mood */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4 text-primary" />Humor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {analysis.moods?.map((m) => (
                  <Badge key={m.name} variant="outline" className="text-xs bg-primary/5 border-primary/20">
                    {m.name} {Math.round(m.confidence * 100)}%
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tempo */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold gradient-text">{analysis.tempo?.bpm}</p>
                <p className="text-xs text-muted-foreground">BPM</p>
              </div>
            </CardContent>
          </Card>

          {/* Instruments */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Guitar className="h-4 w-4 text-primary" />Instrumentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.instruments?.map((i) => (
                <div key={i.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{i.name}</span>
                    <span className="text-muted-foreground">{Math.round(i.presence * 100)}%</span>
                  </div>
                  <Progress value={i.presence * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vocals */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Mic2 className="h-4 w-4 text-primary" />Vocais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <p><span className="text-muted-foreground">Tipo:</span> {analysis.vocals?.type}</p>
                <p><span className="text-muted-foreground">Gênero:</span> {analysis.vocals?.gender}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {analysis.vocals?.characteristics?.map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Similar Artists */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Artistas Similares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.similarArtists?.map((a) => (
                <div key={a.name} className="flex items-center justify-between text-xs">
                  <span>{a.name}</span>
                  <Badge variant="outline" className="text-[10px]">{Math.round(a.similarity * 100)}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Lyrics */}
          {analysis.lyrics && analysis.lyrics !== "Letra não disponível" && (
            <Card className="border-border/50 card-gradient md:col-span-2 lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Letra</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{analysis.lyrics}</p>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
