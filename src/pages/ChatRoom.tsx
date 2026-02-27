import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Paperclip, Link as LinkIcon, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export default function ChatRoom() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [otherName, setOtherName] = useState("Chat");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !userId) return;

    // Fetch other user's name
    supabase.from("profiles").select("display_name").eq("user_id", userId).single().then(({ data }) => {
      if (data) setOtherName(data.display_name || "Anonymous");
    });

    // Fetch existing messages
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${[user.id, userId].sort().join("-")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (
          (msg.sender_id === user.id && msg.receiver_id === userId) ||
          (msg.sender_id === userId && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });
    if (data) setMessages(data as any);
  };

  const sendMessage = async (content: string, type: string = "text", fileUrl = "", fileName = "") => {
    if (!user || !userId || (!content.trim() && type === "text")) return;
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: userId,
      content,
      message_type: type,
      file_url: fileUrl,
      file_name: fileName,
    } as any);
    setInput("");
  };

  const handleSend = () => sendMessage(input);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("chat-files").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
    await sendMessage(file.name, "file", urlData.publicUrl, file.name);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleShareLink = () => {
    const link = prompt("Paste a link to share:");
    if (link) sendMessage(link, "link");
  };

  const isMine = (msg: Message) => msg.sender_id === user!.id;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          {otherName[0].toUpperCase()}
        </div>
        <span className="font-display font-semibold text-foreground">{otherName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2 text-sm ${
                msg.sender_id === user?.id
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.message_type === "file" ? (
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
                  <FileText className="w-4 h-4" />
                  {msg.file_name || msg.content}
                </a>
              ) : msg.message_type === "link" ? (
                <a href={msg.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
                  <LinkIcon className="w-4 h-4" />
                  {msg.content}
                </a>
              ) : (
                msg.content
              )}
              <div className={`text-[10px] mt-1 ${msg.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Paperclip className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleShareLink}>
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1"
        />
        <Button onClick={handleSend} size="icon" disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
