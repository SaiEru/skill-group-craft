import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RequestWithProfile {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_name: string;
  sender_skills: string[];
}

export default function Requests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRequests();

    const channel = supabase
      .channel("requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "connection_requests" }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    // Only show pending requests where I'm the receiver
    const { data } = await supabase
      .from("connection_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const senderIds = data.map((r: any) => r.sender_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, skills")
        .in("user_id", senderIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      const enriched = data.map((r: any) => ({
        ...r,
        sender_name: profileMap[r.sender_id]?.display_name || "Unknown",
        sender_skills: profileMap[r.sender_id]?.skills || [],
      }));
      setRequests(enriched);
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  const handleAction = async (requestId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("connection_requests")
      .update({ status } as any)
      .eq("id", requestId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "accepted" ? "Request accepted!" : "Request declined" });
      setRequests(requests.filter((r) => r.id !== requestId));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading requests...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Your Requests</h1>
        <p className="text-muted-foreground mt-1">Pending connection requests from other users.</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No pending requests</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map((req) => (
            <Card key={req.id} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    {req.sender_name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{req.sender_name}</p>
                    {req.sender_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {req.sender_skills.slice(0, 5).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleAction(req.id, "accepted")}>
                    <Check className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "rejected")}>
                    <X className="w-4 h-4 mr-1" /> Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
