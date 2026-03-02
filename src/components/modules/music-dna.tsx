import { useState, useRef } from "react";
import {
  Music,
  Upload,
  Play,
  Pause,
  Link as LinkIcon,
  Loader2,
  BarChart3,
  Guitar,
  Mic2,
  Clock,
  Users,
  Disc3,
  Heart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { MusicAnalysis } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InputMode = "upload" | "youtube";

export function MusicDNA() {
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<MusicAnalysis | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Max file size is 50MB");
      return;
    }
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setAnalysis(null);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAnalyze = async () => {
    if (inputMode === "upload" && !audioFile) {
      toast.error("Please upload an audio file");
      return;
    }
    if (inputMode === "youtube" && !youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 90));
    }, 500);

    try {
      // TODO: Connect to edge function
      await new Promise((r) => setTimeout(r, 3000));
      setProgress(100);
      
      // Mock analysis for UI preview
      setAnalysis({
        genres: [
          { name: "Electronic", confidence: 0.92 },
          { name: "Synthwave", confidence: 0.78 },
          { name: "Pop", confidence: 0.45 },
        ],
        moods: [
          { name: "Energetic", confidence: 0.88 },
          { name: "Nostalgic", confidence: 0.72 },
          { name: "Uplifting", confidence: 0.65 },
        ],
        tempo: { bpm: 128, confidence: 0.95 },
        instruments: [
          { name: "Synthesizer", presence: 0.95 },
          { name: "Drums (Electronic)", presence: 0.90 },
          { name: "Bass", presence: 0.85 },
          { name: "Guitar", presence: 0.30 },
          { name: "Piano", presence: 0.20 },
          { name: "Strings", presence: 0.15 },
        ],
        vocals: {
          type: "Lead + Harmonies",
          gender: "Mixed",
          characteristics: ["Processed", "Ethereal", "Auto-tuned"],
          confidence: 0.82,
        },
        structure: {
          sections: [
            { name: "Intro", duration: "0:16", timestamp: "0:00" },
            { name: "Verse 1", duration: "0:32", timestamp: "0:16" },
            { name: "Chorus", duration: "0:24", timestamp: "0:48" },
            { name: "Verse 2", duration: "0:32", timestamp: "1:12" },
            { name: "Chorus", duration: "0:24", timestamp: "1:44" },
            { name: "Bridge", duration: "0:16", timestamp: "2:08" },
            { name: "Chorus", duration: "0:24", timestamp: "2:24" },
            { name: "Outro", duration: "0:16", timestamp: "2:48" },
          ],
        },
        similarArtists: [
          { name: "The Midnight", similarity: 0.89 },
          { name: "FM-84", similarity: 0.84 },
          { name: "Gunship", similarity: 0.78 },
        ],
        similarSongs: [
          { title: "Days of Thunder", artist: "The Midnight", similarity: 0.85 },
          { title: "Running in the Night", artist: "FM-84", similarity: 0.80 },
        ],
        overallConfidence: 0.87,
      });
    } catch (error) {
      toast.error("Analysis failed");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Input Section */}
      <Card className="border-border/50 card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Disc3 className="h-4 w-4 text-primary" />
            Music DNA Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
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
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*"
                onChange={handleFileUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-all"
              >
                <Music className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {audioFile ? audioFile.name : "Drop audio file or click to upload"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">MP3, WAV, OGG, FLAC, AAC, M4A • Max 50MB</p>
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
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="text-sm"
            />
          )}

          {loading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">Analyzing...</p>
            </div>
          )}

          <Button
            className="w-full btn-gradient"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-1" />
            )}
            Analyze
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Genres */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Disc3 className="h-4 w-4 text-primary" />
                Genres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.genres.map((g) => (
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Mood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {analysis.moods.map((m) => (
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold gradient-text">{analysis.tempo.bpm}</p>
                <p className="text-xs text-muted-foreground">BPM</p>
              </div>
            </CardContent>
          </Card>

          {/* Instruments */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Guitar className="h-4 w-4 text-primary" />
                Instruments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.instruments.map((i) => (
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
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic2 className="h-4 w-4 text-primary" />
                Vocals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <p><span className="text-muted-foreground">Type:</span> {analysis.vocals.type}</p>
                <p><span className="text-muted-foreground">Gender:</span> {analysis.vocals.gender}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {analysis.vocals.characteristics.map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Similar Artists */}
          <Card className="border-border/50 card-gradient">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Similar Artists
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.similarArtists.map((a) => (
                <div key={a.name} className="flex items-center justify-between text-xs">
                  <span>{a.name}</span>
                  <Badge variant="outline" className="text-[10px]">{Math.round(a.similarity * 100)}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
