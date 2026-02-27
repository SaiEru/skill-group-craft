import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseCSV, kMeansClustering, type ClusteredStudent } from "@/lib/kmeans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Users, Zap, Save, Check, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function GenerateGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [csvData, setCsvData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [groupSize, setGroupSize] = useState(4);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [results, setResults] = useState<ClusteredStudent[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCsvData(evt.target?.result as string);
      setResults(null);
      setSaved(false);
    };
    reader.readAsText(file);
  }, []);

  const handleGenerate = () => {
    if (!csvData) {
      toast({ title: "No CSV", description: "Please upload a CSV file first.", variant: "destructive" });
      return;
    }
    if (!groupName.trim()) {
      toast({ title: "Missing name", description: "Please enter a group name.", variant: "destructive" });
      return;
    }

    const students = parseCSV(csvData);
    if (students.length === 0) {
      toast({ title: "Empty CSV", description: "No valid students found in CSV.", variant: "destructive" });
      return;
    }

    const clustered = kMeansClustering(students, groupSize);
    setResults(clustered);
    setSaved(false);
    toast({ title: "Groups formed!", description: `${students.length} students → ${Math.ceil(students.length / groupSize)} groups` });
  };

  const handleSave = async () => {
    if (!results || !user) return;
    setSaving(true);

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: groupName,
        description: description || null,
        created_by: user.id,
        group_size: groupSize,
      })
      .select()
      .single();

    if (groupError || !groupData) {
      toast({ title: "Error saving group", description: groupError?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const members = results.map((s) => ({
      group_id: groupData.id,
      student_name: s.name,
      group_number: s.groupNumber,
      skill_vector: s.skills,
      cluster_label: s.cluster,
    }));

    const { error: memberError } = await supabase.from("group_members").insert(members);

    if (memberError) {
      toast({ title: "Error saving members", description: memberError.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Group saved to your dashboard." });
      setSaved(true);
    }
    setSaving(false);
  };

  // Group results by group number
  const groupedResults = results
    ? results.reduce<Record<number, ClusteredStudent[]>>((acc, s) => {
        if (!acc[s.groupNumber]) acc[s.groupNumber] = [];
        acc[s.groupNumber].push(s);
        return acc;
      }, {})
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Generate Groups</h1>
        <p className="text-muted-foreground mt-1">Upload a CSV with student skills, choose group size, and let K-Means do the rest.</p>
      </div>

      {/* Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Configuration</CardTitle>
          <CardDescription>Set up your group generation parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., CS101 Project Teams"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupSize">Group Size</Label>
              <Input
                id="groupSize"
                type="number"
                min={2}
                max={20}
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value) || 4)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this group set"
            />
          </div>
          <div className="space-y-2">
            <Label>Upload CSV</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                {fileName ? (
                  <div className="flex items-center justify-center gap-2 text-foreground">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium">{fileName}</span>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload CSV file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: Name, Skill1, Skill2, Skill3, ...
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
          <Button onClick={handleGenerate} className="w-full" disabled={!csvData || !groupName.trim()}>
            <Zap className="w-4 h-4 mr-2" />
            Run K-Means Clustering
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {groupedResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Formed Groups ({Object.keys(groupedResults).length})
            </h2>
            <Button onClick={handleSave} disabled={saving || saved} variant={saved ? "secondary" : "default"}>
              {saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save to Dashboard"}
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groupedResults)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([groupNum, students]) => (
                <Card key={groupNum} className="shadow-card animate-slide-in">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-display flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md gradient-primary flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">{groupNum}</span>
                        </div>
                        Group {groupNum}
                      </CardTitle>
                      <Badge variant="outline">{students.length} members</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {students.map((student, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-foreground font-medium">{student.name}</span>
                          <span className="text-xs text-muted-foreground">
                            [{student.skills.join(", ")}]
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
