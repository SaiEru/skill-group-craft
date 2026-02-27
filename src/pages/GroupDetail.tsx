import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Calendar, User } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  group_size: number;
  created_at: string;
}

interface GroupMember {
  id: string;
  student_name: string;
  group_number: number;
  skill_vector: number[] | null;
  cluster_label: number | null;
}

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const fetchData = async () => {
      const [groupRes, membersRes] = await Promise.all([
        supabase.from("groups").select("*").eq("id", groupId).single(),
        supabase.from("group_members").select("*").eq("group_id", groupId).order("group_number"),
      ]);

      if (groupRes.data) setGroup(groupRes.data);
      if (membersRes.data) setMembers(membersRes.data as unknown as GroupMember[]);
      setLoading(false);
    };

    fetchData();
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Group not found.</p>
        <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  // Group members by group_number
  const grouped = members.reduce<Record<number, GroupMember[]>>((acc, m) => {
    if (!acc[m.group_number]) acc[m.group_number] = [];
    acc[m.group_number].push(m);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {members.length} students
        </span>
        <span className="flex items-center gap-1">
          <User className="w-4 h-4" />
          Group size: {group.group_size}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {new Date(group.created_at).toLocaleDateString()}
        </span>
        <Badge variant="outline">{Object.keys(grouped).length} sub-groups</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([groupNum, students]) => (
            <Card key={groupNum} className="shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">{groupNum}</span>
                    </div>
                    Group {groupNum}
                  </CardTitle>
                  <Badge variant="outline">{students.length} members</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {students.map((student) => (
                    <li key={student.id} className="text-foreground font-medium">
                      {student.student_name}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
