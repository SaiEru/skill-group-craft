import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eraser, Play, Loader2, Volume2, VolumeX, Pause } from "lucide-react";

const WHITEBOARD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whiteboard`;

type LengthOption = "short" | "medium" | "long";
type Section = { heading: string; body: string };

const lengthLabels: Record<LengthOption, { label: string; desc: string }> = {
  short: { label: "Short", desc: "Quick overview" },
  medium: { label: "Medium", desc: "Balanced detail" },
  long: { label: "Long", desc: "In-depth explanation" },
};

function speakText(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === "canceled" || e.error === "interrupted") resolve();
      else reject(e);
    };
    window.speechSynthesis.speak(utterance);
  });
}

export default function Whiteboard() {
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<LengthOption>("medium");
  const [sections, setSections] = useState<Section[]>([]);
  const [visibleIndex, setVisibleIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const cancelledRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new section appears
  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.scrollTo({ top: boardRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleIndex]);

  const playSequence = useCallback(async (allSections: Section[], muted: boolean) => {
    setIsPlaying(true);
    cancelledRef.current = false;

    for (let i = 0; i < allSections.length; i++) {
      if (cancelledRef.current) break;
      setVisibleIndex(i);

      if (!muted) {
        try {
          // Speak heading then body
          await speakText(allSections[i].heading);
          if (cancelledRef.current) break;
          await speakText(allSections[i].body);
        } catch {
          // Speech error, continue showing
        }
      } else {
        // If muted, show each section for a calculated reading time
        const wordCount = allSections[i].body.split(" ").length;
        const readTimeMs = Math.max(2000, wordCount * 200);
        await new Promise<void>((r) => {
          const t = setTimeout(r, readTimeMs);
          const check = setInterval(() => {
            if (cancelledRef.current) { clearTimeout(t); clearInterval(check); r(); }
          }, 100);
        });
      }

      if (cancelledRef.current) break;
      // Small pause between sections
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsPlaying(false);
  }, []);

  const startWriting = useCallback(async () => {
    if (!topic.trim() || isLoading) return;

    setSections([]);
    setVisibleIndex(-1);
    setIsLoading(true);
    cancelledRef.current = false;

    try {
      const resp = await fetch(WHITEBOARD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic: topic.trim(), length }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to generate");
      }

      const data = await resp.json();
      const fetchedSections: Section[] = data.sections || [];

      if (fetchedSections.length === 0) throw new Error("No content generated");

      setSections(fetchedSections);
      setIsLoading(false);

      // Start sequential display + speech
      await playSequence(fetchedSections, isMuted);
    } catch (e: any) {
      console.error(e);
      setSections([{ heading: "Error", body: e.message }]);
      setVisibleIndex(0);
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [topic, length, isLoading, isMuted, playSequence]);

  const stopPlaying = () => {
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    // Show all sections when stopped
    setVisibleIndex(sections.length - 1);
  };

  const clearBoard = () => {
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setSections([]);
    setVisibleIndex(-1);
    setIsPlaying(false);
    setIsLoading(false);
  };

  const toggleMute = () => {
    if (!isMuted) window.speechSynthesis.cancel();
    setIsMuted((m) => !m);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Whiteboard</h1>
        <p className="text-muted-foreground mt-1">
          Enter a topic and AI will explain it step by step — speaking each section aloud.
        </p>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-1.5 block">Topic</label>
            <Input
              placeholder="e.g. Quantum Computing, Binary Search, Photosynthesis..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startWriting()}
              disabled={isLoading || isPlaying}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Length</label>
            <div className="flex rounded-md border border-input overflow-hidden">
              {(Object.keys(lengthLabels) as LengthOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setLength(key)}
                  disabled={isLoading || isPlaying}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    length === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-accent"
                  } disabled:opacity-50`}
                  title={lengthLabels[key].desc}
                >
                  {lengthLabels[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {isPlaying ? (
              <Button variant="destructive" onClick={stopPlaying}>
                <Pause className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button onClick={startWriting} disabled={!topic.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={clearBoard}>
              <Eraser className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Whiteboard */}
      <div
        ref={boardRef}
        className="relative min-h-[500px] max-h-[70vh] overflow-y-auto rounded-xl border-2 border-border bg-card shadow-lg"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 31px, hsl(var(--border) / 0.3) 31px, hsl(var(--border) / 0.3) 32px)",
          backgroundSize: "100% 32px",
        }}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <div className="w-3 h-3 rounded-full bg-accent" />
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="ml-2 text-xs text-muted-foreground font-medium">
            {topic ? `Topic: ${topic}` : "AI Whiteboard"}
          </span>
          {(isLoading || isPlaying) && (
            <span className="ml-auto flex items-center gap-1 text-xs text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {isLoading ? "Generating..." : "Speaking..."}
            </span>
          )}
        </div>

        <div className="p-6 md:p-8">
          {isLoading && sections.length === 0 && (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
              <p className="text-lg font-medium">Preparing the whiteboard...</p>
              <p className="text-sm">AI is organizing the explanation</p>
            </div>
          )}

          {sections.length > 0 && (
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  className={`transition-all duration-500 ${
                    idx <= visibleIndex
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden"
                  }`}
                >
                  <div
                    className={`rounded-lg p-4 border transition-colors duration-300 ${
                      idx === visibleIndex && isPlaying
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-background/50"
                    }`}
                  >
                    <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {idx + 1}
                      </span>
                      {section.heading}
                      {idx === visibleIndex && isPlaying && (
                        <Volume2 className="h-4 w-4 text-primary animate-pulse ml-auto" />
                      )}
                    </h2>
                    <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap pl-9">
                      {section.body}
                    </p>
                  </div>
                </div>
              ))}

              {/* Progress indicator */}
              {isPlaying && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${((visibleIndex + 1) / sections.length) * 100}%` }}
                    />
                  </div>
                  <span>{visibleIndex + 1} / {sections.length}</span>
                </div>
              )}
            </div>
          )}

          {sections.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg" width="64" height="64"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
                className="opacity-30 mb-4"
              >
                <path d="M12 20h9" />
                <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
              <p className="text-lg font-medium">Enter a topic and press Start</p>
              <p className="text-sm">AI will explain it section by section, speaking aloud</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
