import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eraser, Play, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const WHITEBOARD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whiteboard`;

type LengthOption = "short" | "medium" | "long";

const lengthLabels: Record<LengthOption, { label: string; desc: string }> = {
  short: { label: "Short", desc: "Quick overview" },
  medium: { label: "Medium", desc: "Balanced detail" },
  long: { label: "Long", desc: "In-depth explanation" },
};

export default function Whiteboard() {
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<LengthOption>("medium");
  const [content, setContent] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const startWriting = useCallback(async () => {
    if (!topic.trim() || isWriting) return;

    setContent("");
    setIsWriting(true);
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(WHITEBOARD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic: topic.trim(), length }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to start");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              accumulated += c;
              setContent(accumulated);
              // Auto-scroll the board
              if (boardRef.current) {
                boardRef.current.scrollTop = boardRef.current.scrollHeight;
              }
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error(e);
        setContent(`⚠️ Error: ${e.message}`);
      }
    } finally {
      setIsWriting(false);
    }
  }, [topic, length, isWriting]);

  const clearBoard = () => {
    if (abortRef.current) abortRef.current.abort();
    setContent("");
    setIsWriting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Whiteboard</h1>
        <p className="text-muted-foreground mt-1">
          Enter a topic and let AI explain it — written live on the board.
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
              disabled={isWriting}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Length</label>
            <div className="flex rounded-md border border-input overflow-hidden">
              {(Object.keys(lengthLabels) as LengthOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setLength(key)}
                  disabled={isWriting}
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
            <Button onClick={startWriting} disabled={!topic.trim() || isWriting}>
              {isWriting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Writing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start
                </>
              )}
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
        {/* Top bar like a real whiteboard */}
        <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-muted-foreground font-medium">
            {topic ? `Topic: ${topic}` : "AI Whiteboard"}
          </span>
          {isWriting && (
            <span className="ml-auto flex items-center gap-1 text-xs text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Writing...
            </span>
          )}
        </div>

        <div className="p-6 md:p-8">
          {content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whiteboard-content">
              <ReactMarkdown>{content}</ReactMarkdown>
              {isWriting && (
                <span className="inline-block w-0.5 h-5 bg-primary animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-30 mb-4"
              >
                <path d="M12 20h9" />
                <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
              <p className="text-lg font-medium">Enter a topic and press Start</p>
              <p className="text-sm">The AI will explain it live on the board</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
