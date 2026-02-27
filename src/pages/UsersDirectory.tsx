import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Check, Clock, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  bio: string;
  skills: string[];
}

export default function UsersDirectory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<Record<string, string>>({});
  const [allSkills, setAllSkills] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchRequestStatuses();
  }, [user]);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) {
      const mapped = data
        .filter((p: any) => p.user_id !== user?.id)
        .map((p: any) => ({
          ...p,
          bio: p.bio || "",
          skills: p.skills || [],
        }));
      setUsers(mapped);
      // Collect all unique skills
      const skills = new Set<string>();
      mapped.forEach((u: UserProfile) => u.skills.forEach((s) => skills.add(s)));
      setAllSkills(Array.from(skills).sort());
    }
    setLoading(false);
  };

  const fetchRequestStatuses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("connection_requests")
      .select("sender_id, receiver_id, status")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    if (data) {
      const statuses: Record<string, string> = {};
      data.forEach((r: any) => {
        const otherId = r.sender_id === user.id ? r.receiver_id : r.sender_id;
        statuses[otherId] = r.status;
      });
      setRequestStatus(statuses);
    }
  };

  const sendRequest = async (receiverId: string) => {
    if (!user) return;
    const { error } = await supabase.from("connection_requests").insert({
      sender_id: user.id,
      receiver_id: receiverId,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Request sent!" });
      setRequestStatus({ ...requestStatus, [receiverId]: "pending" });
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.bio.toLowerCase().includes(search.toLowerCase());
    const matchesSkill = !skillFilter || u.skills.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase()));
    return matchesSearch && matchesSkill;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Browse Users</h1>
        <p className="text-muted-foreground mt-1">Find people by skill and send connection requests.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or bio..." className="pl-9" />
        </div>
        <div className="relative sm:w-64">
          <Input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} placeholder="Filter by skill..." />
        </div>
      </div>

      {allSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allSkills.slice(0, 20).map((skill) => (
            <Badge
              key={skill}
              variant={skillFilter === skill ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSkillFilter(skillFilter === skill ? "" : skill)}
            >
              {skill}
            </Badge>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No users found.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((u) => {
            const status = requestStatus[u.user_id];
            return (
              <Card key={u.id} className="shadow-card">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                        {(u.display_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.display_name || "Anonymous"}</p>
                        {u.bio && <p className="text-xs text-muted-foreground line-clamp-1">{u.bio}</p>}
                      </div>
                    </div>
                    {u.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {u.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {status === "accepted" ? (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/chat/${u.user_id}`)}>
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Chat
                      </Button>
                    ) : status === "pending" ? (
                      <Button size="sm" variant="ghost" disabled>
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Pending
                      </Button>
                    ) : status === "rejected" ? (
                      <Button size="sm" variant="ghost" disabled>
                        Declined
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => sendRequest(u.user_id)}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
