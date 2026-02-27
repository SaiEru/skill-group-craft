import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Connection {
  user_id: string;
  display_name: string;
  skills: string[];
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("connection_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (data && data.length > 0) {
      const otherIds = data.map((r: any) =>
        r.sender_id === user.id ? r.receiver_id : r.sender_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, skills")
        .in("user_id", otherIds);

      if (profiles) {
        setConnections(
          profiles.map((p: any) => ({
            user_id: p.user_id,
            display_name: p.display_name || "Anonymous",
            skills: p.skills || [],
          }))
        );
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Chats</h1>
        <p className="text-muted-foreground mt-1">Message your accepted connections.</p>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No connections yet. Browse users and send requests!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {connections.map((c) => (
            <Card
              key={c.user_id}
              className="shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
              onClick={() => navigate(`/chat/${c.user_id}`)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                  {c.display_name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{c.display_name}</p>
                  {c.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.skills.slice(0, 4).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <MessageSquare className="w-5 h-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
