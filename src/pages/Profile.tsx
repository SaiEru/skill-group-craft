import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio, skills")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || "");
        setBio((data as any).bio || "");
        setSkills((data as any).skills || []);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio,
        skills,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated!", description: "Your profile has been saved." });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Your Profile</h1>
        <p className="text-muted-foreground mt-1">Add your skills and details so others can find and connect with you.</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell others about yourself..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Skills</CardTitle>
          <CardDescription>Add your skills so others can find you by expertise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g., Python, React, Machine Learning..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            />
            <Button onClick={addSkill} size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-sm py-1 px-3 gap-1">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet. Start typing above!</p>}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
