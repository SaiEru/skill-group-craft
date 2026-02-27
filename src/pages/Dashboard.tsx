import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Group {
  id: string;
  name: string;
  description: string | null;
  group_size: number;
  created_by: string;
  created_at: string;
  is_public: boolean;
  member_count?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    if (!user) return;

    // Fetch user's groups
    const { data: mine } = await supabase
      .from("groups")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    // Fetch all public groups for search
    const { data: all } = await supabase
      .from("groups")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (mine) setMyGroups(mine);
    if (all) setAllGroups(all);
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();

    // Realtime subscription
    const channel = supabase
      .channel("groups-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => {
        fetchGroups();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filteredGroups = allGroups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your groups and all available groups</p>
      </div>

      {/* My Groups */}
      <section>
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">My Groups</h2>
        {myGroups.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">You haven't created any groups yet.</p>
              <button
                onClick={() => navigate("/generate")}
                className="mt-4 text-primary font-medium hover:underline"
              >
                Generate your first group →
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map((group) => (
              <GroupCard key={group.id} group={group} isOwner />
            ))}
          </div>
        )}
      </section>

      {/* Search All Groups */}
      <section>
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">Browse All Groups</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredGroups.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No groups found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <GroupCard key={group.id} group={group} isOwner={group.created_by === user?.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GroupCard({ group, isOwner }: { group: Group; isOwner?: boolean }) {
  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .then(({ count }) => {
        if (count !== null) setMemberCount(count);
      });
  }, [group.id]);

  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-display">{group.name}</CardTitle>
          {isOwner && <Badge variant="secondary" className="text-xs">Owner</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {group.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{group.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {memberCount} students
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            Size: {group.group_size}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(group.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
