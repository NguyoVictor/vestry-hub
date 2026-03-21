import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpenText, Heart, Megaphone, BookOpen, MessageCircle, CalendarDays, Mail, HelpCircle, PenLine, Copy, RefreshCw, Sparkles } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const AI_TOOLS = [
  { id: "sermon_outline", name: "Sermon Outline Generator", desc: "Generate a structured sermon outline from a scripture or topic", icon: BookOpenText },
  { id: "prayer_points", name: "Prayer Points Generator", desc: "Generate targeted prayer points for any theme or need", icon: Heart },
  { id: "announcement", name: "Announcement Writer", desc: "Write compelling church announcements in seconds", icon: Megaphone },
  { id: "devotional", name: "Devotional Writer", desc: "Create daily devotional content from a scripture passage", icon: BookOpen },
  { id: "social_caption", name: "Social Media Caption", desc: "Generate engaging captions for church social media", icon: MessageCircle },
  { id: "event_description", name: "Event Description Writer", desc: "Write compelling descriptions for your church events", icon: CalendarDays },
  { id: "newsletter", name: "Newsletter Writer", desc: "Draft a church newsletter from bullet points", icon: Mail },
  { id: "bible_study_questions", name: "Bible Study Questions", desc: "Generate discussion questions for any Bible passage", icon: HelpCircle },
  { id: "pastoral_letter", name: "Pastoral Letter Writer", desc: "Draft formal pastoral letters and communications", icon: PenLine },
];

const AITools = () => {
  const church = useChurch();
  const [selectedTool, setSelectedTool] = useState<typeof AI_TOOLS[0] | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: usageCounts = {} } = useQuery({
    queryKey: ["ai_tool_usage", church.tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("ai_tool_usage").select("tool_name");
      const counts: Record<string, number> = {};
      data?.forEach((r: any) => { counts[r.tool_name] = (counts[r.tool_name] || 0) + 1; });
      return counts;
    },
  });

  const handleGenerate = async () => {
    if (!selectedTool) return;
    setGenerating(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { tool: selectedTool.id, inputs, churchName: church.name },
      });
      if (error) throw error;
      setOutput(data?.content || "Generation complete. Content will appear here.");
      await supabase.from("ai_tool_usage").insert({
        tenant_id: church.tenantId,
        tool_name: selectedTool.id,
        input_summary: JSON.stringify(inputs).substring(0, 500),
        output_length: data?.content?.length || 0,
        created_by: church.userId,
      });
    } catch {
      toast.error("Generation failed. Please ensure the AI integration is configured.");
      setOutput("AI content generation is not yet configured. Please add the ANTHROPIC_API_KEY secret in your Supabase Edge Function settings to enable this feature.");
    } finally {
      setGenerating(false);
    }
  };

  const renderToolInputs = () => {
    if (!selectedTool) return null;
    switch (selectedTool.id) {
      case "sermon_outline":
        return (
          <div className="space-y-4">
            <div><Label>Scripture Reference</Label><Input placeholder='e.g. John 3:16' value={inputs.scripture || ""} onChange={e => setInputs(p => ({ ...p, scripture: e.target.value }))} /></div>
            <div><Label>Sermon Topic / Title</Label><Input placeholder="Enter sermon topic" value={inputs.topic || ""} onChange={e => setInputs(p => ({ ...p, topic: e.target.value }))} /></div>
            <div><Label>Target Audience</Label><Select value={inputs.audience || "general"} onValueChange={v => setInputs(p => ({ ...p, audience: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="youth">Youth</SelectItem><SelectItem value="children">Children</SelectItem><SelectItem value="new_believers">New Believers</SelectItem></SelectContent></Select></div>
            <div><Label>Number of Points</Label><Select value={inputs.points || "3"} onValueChange={v => setInputs(p => ({ ...p, points: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 Points</SelectItem><SelectItem value="4">4 Points</SelectItem><SelectItem value="5">5 Points</SelectItem></SelectContent></Select></div>
          </div>
        );
      case "prayer_points":
        return (
          <div className="space-y-4">
            <div><Label>Theme / Topic</Label><Input placeholder='e.g. healing, peace, finances' value={inputs.theme || ""} onChange={e => setInputs(p => ({ ...p, theme: e.target.value }))} /></div>
            <div><Label>Context (optional)</Label><Textarea placeholder="Additional context..." value={inputs.context || ""} onChange={e => setInputs(p => ({ ...p, context: e.target.value }))} /></div>
            <div><Label>Number of Points</Label><Select value={inputs.count || "7"} onValueChange={v => setInputs(p => ({ ...p, count: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="7">7</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="12">12</SelectItem></SelectContent></Select></div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <div><Label>Topic / Subject</Label><Input placeholder="Enter topic" value={inputs.topic || ""} onChange={e => setInputs(p => ({ ...p, topic: e.target.value }))} /></div>
            <div><Label>Key Details</Label><Textarea placeholder="Provide key details, dates, context..." value={inputs.details || ""} onChange={e => setInputs(p => ({ ...p, details: e.target.value }))} /></div>
            <div><Label>Tone</Label><Select value={inputs.tone || "friendly"} onValueChange={v => setInputs(p => ({ ...p, tone: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="formal">Formal</SelectItem><SelectItem value="friendly">Friendly</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="celebratory">Celebratory</SelectItem></SelectContent></Select></div>
          </div>
        );
    }
  };

  return (
    <>
      <Helmet><title>AI Tools — Vestry</title></Helmet>
      <PageHeader title="AI Tools" subtitle="Generate content for your church using artificial intelligence" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_TOOLS.map(tool => {
          const Icon = tool.icon;
          return (
            <Card key={tool.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedTool(tool); setInputs({}); setOutput(""); }}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{tool.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tool.desc}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {usageCounts[tool.id] && <Badge variant="secondary" className="text-xs">Used {usageCounts[tool.id]} times</Badge>}
                      <Button variant="outline" size="sm" className="ml-auto">Open Tool</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selectedTool} onOpenChange={open => { if (!open) setSelectedTool(null); }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedTool && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <selectedTool.icon className="h-5 w-5 text-primary" />
                  {selectedTool.name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {renderToolInputs()}
                <Button onClick={handleGenerate} disabled={generating} className="w-full">
                  {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating with AI...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate</>}
                </Button>
                {output && (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <pre className="whitespace-pre-wrap text-sm">{output}</pre>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied!"); }}><Copy className="mr-2 h-3.5 w-3.5" />Copy</Button>
                      <Button variant="outline" size="sm" onClick={handleGenerate}><RefreshCw className="mr-2 h-3.5 w-3.5" />Regenerate</Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AITools;
