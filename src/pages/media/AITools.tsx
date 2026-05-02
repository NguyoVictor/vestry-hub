import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Zap, Sparkles, Calendar, Clock, Copy, Download,
  CheckCircle2, Newspaper, Languages, BookHeart, PenLine, Music2, Mic,
  BookOpen, GraduationCap, FileAudio, Loader2, MicOff, StopCircle,
  AudioWaveform, Globe, MapPin, GitMerge, ChevronDown, Check, Star,
  Wand2, Brain, Lightbulb, Rocket, Crown, Diamond, Gem, Award, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES, COLS } from "@/lib/schema";
import { BlurFadeIn } from "@/components/ui/BlurFadeIn";
import GradientText from "@/components/ui/GradientText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Premium AI Tool definitions with exact col-span values per specification
const TOOLS = [
  {
    id: 'weekly-bulletin',
    icon: Newspaper,
    accent: '#7c3aed', // violet
    category: "Communications",
    name: "Weekly Bulletin Generator",
    description: "Automatically pulls your upcoming events, announcements, sermon series, and giving goals to create your entire weekly bulletin in seconds.",
    colSpan: 7
  },
  {
    id: 'translation',
    icon: Languages,
    accent: '#0ea5e9', // sky blue
    category: "Communications", 
    name: "Translation Tool",
    description: "Translate sermons, announcements, and bulletins into 14+ African and international languages with theological accuracy.",
    colSpan: 5
  },
  {
    id: 'childrens-lesson',
    icon: BookHeart,
    accent: '#f59e0b', // amber
    category: "Ministry",
    name: "Children's Lesson Planner",
    description: "Generate complete, age-appropriate lesson plans for any Bible story with activities, crafts, and interactive materials.",
    colSpan: 4
  },
  {
    id: 'pastoral-letter',
    icon: PenLine,
    accent: '#10b981', // emerald
    category: "Communications",
    name: "Pastoral Letter Writer", 
    description: "Create formal pastoral letters for any occasion — condolence, welcome, congratulations, membership certificates, and more.",
    colSpan: 4
  },
  {
    id: 'worship-suggester',
    icon: Music2,
    accent: '#ec4899', // pink
    category: "Worship",
    name: "Worship Song Suggester",
    description: "Enter your sermon topic and get intelligent worship song suggestions that perfectly match your message from your Song Library.",
    colSpan: 4
  },
  {
    id: 'voice-notes',
    icon: Mic,
    accent: '#ef4444', // red
    category: "Preaching",
    name: "Voice to Sermon Notes",
    description: "Speak naturally into your microphone and watch your words transform into structured, organized sermon notes automatically.",
    colSpan: 5
  }
];

// Tailwind col-span lookup map
const colSpanMap: Record<number, string> = {
  4: 'md:col-span-6 lg:col-span-4',
  5: 'md:col-span-6 lg:col-span-5',
  7: 'md:col-span-6 lg:col-span-7'
};

const EXISTING_TOOLS = [
  { icon: BookOpen, name: "Sermon Assistant", route: "/sermon-preparation", color: "#8b5cf6", description: "AI-powered sermon research and outline generation" },
  { icon: GraduationCap, name: "Bible Study Generator", route: "/sermon-preparation", color: "#06b6d4", description: "Create engaging Bible study materials instantly" },
  { icon: FileAudio, name: "Sermon Transcription", route: "/sermons", color: "#f59e0b", description: "Automatic transcription and searchable sermon library" }
];

// Premium animated components
function FloatingOrb({ delay = 0, size = 100, color = "#8b5cf6" }) {
  return (
    <motion.div
      className="absolute rounded-full opacity-20 blur-xl"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}40, ${color}10, transparent)`,
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -20, 30, 0],
        scale: [1, 1.1, 0.9, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
    />
  );
}

function PremiumBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "pro" | "premium" }) {
  const variants = {
    default: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border-slate-300",
    pro: "bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border-violet-300",
    premium: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border-amber-300"
  };

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${variants[variant]} backdrop-blur-sm`}
    >
      {variant === "premium" && <Crown className="h-3 w-3" />}
      {variant === "pro" && <Diamond className="h-3 w-3" />}
      {children}
    </motion.span>
  );
}

function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const springCount = useSpring(count, { duration: duration * 1000 });

  useEffect(() => {
    count.set(value);
  }, [count, value]);

  return <motion.span>{rounded}</motion.span>;
}

function ToolCard({ tool, index, onClick }: { tool: any; index: number; onClick: () => void }) {
  return (
    <BlurFadeIn delay={index * 0.08}>
      <motion.div
        layoutId={`tool-card-${tool.id}`}
        onClick={onClick}
        whileHover={{
          y: -4,
          scale: 1.01,
          transition: { type: 'spring', stiffness: 400, damping: 25 }
        }}
        className={`rounded-2xl border border-border/50 bg-card overflow-hidden cursor-pointer p-6 relative h-full flex flex-col col-span-12 ${colSpanMap[tool.colSpan]}`}
      >
        {/* Radial gradient decoration */}
        <div 
          className="absolute top-0 right-0 w-[200px] h-[200px] pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${tool.accent}14, transparent)`
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Icon */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${tool.accent}26` }}
          >
            <tool.icon className="h-6 w-6" style={{ color: tool.accent }} />
          </div>
          
          {/* Middle section */}
          <div className="flex-1">
            <h3 className={`font-semibold text-foreground mb-1.5 ${tool.colSpan === 7 ? 'text-lg' : 'text-base'}`}>
              {tool.name}
            </h3>
            <p className={`text-sm text-muted-foreground leading-relaxed ${tool.colSpan === 7 ? 'line-clamp-3' : 'line-clamp-2'}`}>
              {tool.description}
            </p>
          </div>
          
          {/* Bottom section */}
          <div className="mt-auto pt-4 flex items-center justify-between">
            <span className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground">
              {tool.category}
            </span>
            <motion.div whileHover={{ x: 4 }}>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </BlurFadeIn>
  );
}
function AILabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
      {children}
    </label>
  );
}

function AITextarea({ 
  value, 
  onChange, 
  placeholder, 
  minHeight = "100px",
  accent = "#7c3aed"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  accent?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:border-current resize-none w-full transition-all duration-200 placeholder:text-muted-foreground/60"
      style={{ 
        minHeight,
        '--tw-ring-color': `${accent}30`,
        borderColor: 'var(--border)'
      } as any}
      onFocus={(e) => {
        e.target.style.borderColor = accent;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--border)';
      }}
    />
  );
}

function AISelect({
  value,
  onChange,
  children,
  accent = "#7c3aed"
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger 
        className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm w-full transition-all duration-200"
        style={{
          '--tw-ring-color': `${accent}30`
        } as any}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
  accent = "#7c3aed"
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  accent?: string;
}) {
  return (
    <div className="bg-muted rounded-xl p-1 flex gap-1">
      {options.map((option) => (
        <motion.button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`rounded-lg px-4 py-2 text-sm cursor-pointer transition-all duration-200 relative ${
            value === option.key
              ? 'font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {value === option.key && (
            <motion.div
              layoutId="segmented-indicator"
              className="absolute inset-0 bg-background shadow-sm rounded-lg"
              style={{ backgroundColor: 'var(--background)' }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

function GenerateButton({
  onClick,
  loading,
  accent = "#7c3aed",
  children,
  disabled = false
}: {
  onClick: () => void;
  loading: boolean;
  accent?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const accentDarker = accent === "#7c3aed" ? "#6d28d9" : 
                      accent === "#0ea5e9" ? "#0284c7" :
                      accent === "#f59e0b" ? "#d97706" :
                      accent === "#10b981" ? "#059669" :
                      accent === "#ec4899" ? "#db2777" :
                      accent === "#ef4444" ? "#dc2626" : "#6d28d9";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      animate={disabled && !loading ? { x: [0, 10, -10, 10, -10, 0] } : {}}
      transition={disabled && !loading ? { duration: 0.4 } : {}}
      className="w-full rounded-xl h-12 mt-6 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: `linear-gradient(135deg, ${accent}, ${accentDarker})`
      }}
    >
      <motion.div
        animate={loading ? { rotate: 360 } : { rotate: 0 }}
        transition={loading ? { repeat: Infinity, duration: 1.5, ease: "linear" } : {}}
      >
        <Sparkles className="h-4 w-4" />
      </motion.div>
      {loading ? "Generating..." : children}
    </motion.button>
  );
}

// AI Output Display Component
function AIOutput({ 
  content, 
  loading, 
  accent,
  onCopy,
  onDownload,
  onUseInApp,
  onGenerateAgain
}: {
  content: string;
  loading: boolean;
  accent: string;
  onCopy: () => void;
  onDownload: () => void;
  onUseInApp?: () => void;
  onGenerateAgain: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-muted/30 p-6 mt-6">
        <div className="space-y-3">
          {[1, 0.8, 1, 0.75].map((width, i) => (
            <motion.div
              key={i}
              className="rounded-lg bg-muted h-4"
              style={{ width: `${width * 100}%` }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5, 
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <BlurFadeIn delay={0}>
      <div className="rounded-xl border border-border/50 bg-muted/30 p-6 mt-6">
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 mr-2" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-3.5 w-3.5 mr-2" />
            Download PDF
          </Button>
          {onUseInApp && (
            <Button variant="outline" size="sm" onClick={onUseInApp}>
              Use in App
            </Button>
          )}
          <button
            onClick={onGenerateAgain}
            className="text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            Generate Again
          </button>
        </div>
      </div>
    </BlurFadeIn>
  );
}

// Children's Lesson Planner Tool Component
function ChildrensLessonTool({ 
  inputs, 
  setInputs, 
  onGenerate, 
  loading, 
  accent 
}: {
  inputs: Record<string, any>;
  setInputs: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onGenerate: () => void;
  loading: boolean;
  accent?: string;
}) {
  const ageGroups = [
    { key: "3-5", label: "3-5 years" },
    { key: "6-8", label: "6-8 years" },
    { key: "9-12", label: "9-12 years" }
  ];

  const durations = ["30 minutes", "45 minutes", "1 hour"];
  const classSizes = ["Small (1-10)", "Medium (11-25)", "Large (25+)"];

  const materials = [
    "✏️ Paper & Crayons", "🎨 Paints & Brushes", "✂️ Scissors & Glue",
    "🧱 Play-Doh / Clay", "🖥️ Projector / Screen", "🎵 Music / Speakers",
    "🏃 Outdoor Space", "📖 Bibles (Children's)"
  ];

  const toggleMaterial = (material: string) => {
    const currentMaterials = inputs.materials || [];
    const newMaterials = currentMaterials.includes(material)
      ? currentMaterials.filter((m: string) => m !== material)
      : [...currentMaterials, material];
    setInputs(prev => ({ ...prev, materials: newMaterials }));
  };

  const isDisabled = !inputs.story?.trim() || !inputs.ageGroup;

  return (
    <div className="space-y-4">
      <AILabel>Bible Story or Scripture</AILabel>
      <AITextarea
        value={inputs.story || ""}
        onChange={(value) => setInputs(prev => ({ ...prev, story: value }))}
        placeholder="e.g. David and Goliath, John 3:16, The Prodigal Son, Noah's Ark..."
        minHeight="80px"
        accent={accent}
      />

      <AILabel>Age Group</AILabel>
      <SegmentedControl
        options={ageGroups}
        value={inputs.ageGroup || ""}
        onChange={(value) => setInputs(prev => ({ ...prev, ageGroup: value }))}
        accent={accent}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <AILabel>Lesson Duration</AILabel>
          <AISelect
            value={inputs.duration || ""}
            onChange={(value) => setInputs(prev => ({ ...prev, duration: value }))}
            accent={accent}
          >
            {durations.map(duration => (
              <SelectItem key={duration} value={duration}>{duration}</SelectItem>
            ))}
          </AISelect>
        </div>
        
        <div>
          <AILabel>Class Size</AILabel>
          <AISelect
            value={inputs.classSize || ""}
            onChange={(value) => setInputs(prev => ({ ...prev, classSize: value }))}
            accent={accent}
          >
            {classSizes.map(size => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </AISelect>
        </div>
      </div>

      <AILabel>Available Materials</AILabel>
      <div className="grid grid-cols-3 gap-2">
        {materials.map(material => (
          <motion.button
            key={material}
            type="button"
            onClick={() => toggleMaterial(material)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`rounded-lg border px-3 py-2 text-sm transition-all duration-200 ${
              (inputs.materials || []).includes(material)
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30'
                : 'border-border text-muted-foreground hover:border-border/80'
            }`}
          >
            {material}
          </motion.button>
        ))}
      </div>
      
      <GenerateButton
        onClick={onGenerate}
        loading={loading}
        accent={accent}
        disabled={isDisabled}
      >
        Create Lesson Plan
      </GenerateButton>
    </div>
  );
}

// Pastoral Letter Writer Tool Component
function PastoralLetterTool({ 
  inputs, 
  setInputs, 
  onGenerate, 
  loading, 
  accent 
}: {
  inputs: Record<string, any>;
  setInputs: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onGenerate: () => void;
  loading: boolean;
  accent?: string;
}) {
  const letterTypes = [
    { key: "welcome", emoji: "💌", label: "Welcome New Member" },
    { key: "condolence", emoji: "🙏", label: "Condolence / Bereavement" },
    { key: "congratulations", emoji: "🎉", label: "Congratulations" },
    { key: "concern", emoji: "⚠️", label: "Pastoral Concern" },
    { key: "certificate", emoji: "📜", label: "Membership Certificate" },
    { key: "general", emoji: "✉️", label: "General Pastoral Letter" }
  ];

  const tones = [
    { key: "formal", label: "Formal" },
    { key: "warm", label: "Warm" },
    { key: "formal-warm", label: "Formal opening, warm close" }
  ];

  const isDisabled = !inputs.letterType || !inputs.recipientName?.trim();

  return (
    <div className="space-y-4">
      <AILabel>Letter Type</AILabel>
      <div className="grid grid-cols-3 gap-3">
        {letterTypes.map(type => (
          <motion.button
            key={type.key}
            type="button"
            onClick={() => setInputs(prev => ({ ...prev, letterType: type.key }))}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`rounded-xl border p-3 cursor-pointer text-center transition-all duration-200 ${
              inputs.letterType === type.key
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-border hover:border-border/80'
            }`}
          >
            <div className="text-2xl mb-1">{type.emoji}</div>
            <div className="text-xs font-medium">{type.label}</div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <AILabel>Recipient's Full Name</AILabel>
          <Input
            value={inputs.recipientName || ""}
            onChange={(e) => setInputs(prev => ({ ...prev, recipientName: e.target.value }))}
            placeholder="e.g. James Mwangi"
            className="rounded-xl border-border bg-muted/50"
          />
        </div>
        
        <div>
          <AILabel>Pastor / Sender Name</AILabel>
          <Input
            value={inputs.pastorName || ""}
            onChange={(e) => setInputs(prev => ({ ...prev, pastorName: e.target.value }))}
            placeholder="Pastor's name"
            className="rounded-xl border-border bg-muted/50"
          />
        </div>
      </div>

      <AILabel>Church Name</AILabel>
      <Input
        value={inputs.churchName || ""}
        onChange={(e) => setInputs(prev => ({ ...prev, churchName: e.target.value }))}
        placeholder="Church name"
        className="rounded-xl border-border bg-muted/50"
      />

      <AILabel>Relevant Details (optional)</AILabel>
      <AITextarea
        value={inputs.details || ""}
        onChange={(value) => setInputs(prev => ({ ...prev, details: value }))}
        placeholder="Any details to personalise the letter... e.g. they recently lost their mother, they joined from Mombasa, they have been a member for 10 years, etc."
        minHeight="100px"
        accent={accent}
      />

      <AILabel>Tone</AILabel>
      <SegmentedControl
        options={tones}
        value={inputs.tone || "warm"}
        onChange={(value) => setInputs(prev => ({ ...prev, tone: value }))}
        accent={accent}
      />
      
      <GenerateButton
        onClick={onGenerate}
        loading={loading}
        accent={accent}
        disabled={isDisabled}
      >
        Write Letter
      </GenerateButton>
    </div>
  );
}

// Weekly Bulletin Generator Tool Component
function WeeklyBulletinTool({ 
  inputs, 
  setInputs, 
  onGenerate, 
  loading, 
  accent 
}: {
  inputs: Record<string, any>;
  setInputs: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onGenerate: () => void;
  loading: boolean;
  accent?: string;
}) {
  const church = useChurch();
  const [dataLoading, setDataLoading] = useState(false);
  const [churchData, setChurchData] = useState<any>(null);

  // Fetch church data on component mount
  useEffect(() => {
    const fetchChurchData = async () => {
      setDataLoading(true);
      try {
        // Fetch upcoming events (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const eventsResult = await supabase
          .from(TABLES.EVENTS)
          .select('*')
          .eq(COLS.TENANT_ID, church.tenantId)
          .eq('is_published', true)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .lte('event_date', nextWeek.toISOString().split('T')[0])
          .order('event_date', { ascending: true });
        const events = eventsResult.data || [];

        // Fetch active announcements - use correct column name
        const announcementsResult = await supabase
          .from(TABLES.ANNOUNCEMENTS)
          .select('*')
          .eq(COLS.TENANT_ID, church.tenantId)
          .eq('status', 'published') // Use 'status' not 'is_active'
          .order('created_at', { ascending: false })
          .limit(5);
        const announcements = announcementsResult.data || [];

        // Fetch latest sermon
        const sermonsResult = await supabase
          .from(TABLES.SERMONS)
          .select('*')
          .eq(COLS.TENANT_ID, church.tenantId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(1);
        const sermons = sermonsResult.data || [];

        // Fetch pledge campaigns - use correct table name
        const campaignsResult = await supabase
          .from('pledge_campaigns') // Correct table name
          .select('*')
          .eq(COLS.TENANT_ID, church.tenantId)
          .eq('status', 'active') // Use 'status' not 'is_active'
          .order('created_at', { ascending: false })
          .limit(1);
        const campaigns = campaignsResult.data || [];

        const data = {
          events: events || [],
          announcements: announcements || [],
          sermon: sermons?.[0] || null,
          campaign: campaigns?.[0] || null
        };

        setChurchData(data);
        
        // Pre-fill form with church data
        setInputs(prev => ({
          ...prev,
          churchName: church.name,
          bulletinDate: getNextSunday(),
          churchData: data, // Store church data for prompt generation
          sections: {
            welcome: true,
            events: data.events.length > 0,
            announcements: data.announcements.length > 0,
            sermon: !!data.sermon,
            giving: !!data.campaign,
            prayer: true
          }
        }));
      } catch (error) {
        console.error('Error fetching church data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    fetchChurchData();
  }, [church.tenantId, church.name, setInputs]);

  const getNextSunday = () => {
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + (7 - today.getDay()));
    return nextSunday.toISOString().split('T')[0];
  };

  const tones = [
    { key: "formal", label: "Formal" },
    { key: "warm", label: "Warm" },
    { key: "contemporary", label: "Contemporary" }
  ];

  const toggleSection = (section: string) => {
    setInputs(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: !prev.sections?.[section]
      }
    }));
  };

  const isDisabled = !inputs.churchName?.trim() || !inputs.bulletinDate;

  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-muted-foreground" />
        </motion.div>
        <p className="text-sm text-muted-foreground text-center">Gathering your church data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Preview */}
      {churchData && (
        <BlurFadeIn delay={0}>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Church Data Found</h3>
            <div className="flex flex-wrap gap-2">
              {churchData.events.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-3 w-3" />
                  {churchData.events.length} events
                </span>
              )}
              {churchData.announcements.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/30">
                  <CheckCircle2 className="h-3 w-3" />
                  {churchData.announcements.length} announcements
                </span>
              )}
              {churchData.sermon && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/30">
                  <CheckCircle2 className="h-3 w-3" />
                  1 sermon
                </span>
              )}
              {churchData.campaign && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/30">
                  <CheckCircle2 className="h-3 w-3" />
                  1 giving campaign
                </span>
              )}
              {!churchData.events.length && !churchData.announcements.length && !churchData.sermon && !churchData.campaign && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground">
                  No recent data found
                </span>
              )}
            </div>
          </div>
        </BlurFadeIn>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <AILabel>Church Name</AILabel>
          <Input
            value={inputs.churchName || ""}
            onChange={(e) => setInputs(prev => ({ ...prev, churchName: e.target.value }))}
            placeholder="Church name"
            className="rounded-xl border-border bg-muted/50"
          />
        </div>
        
        <div>
          <AILabel>Bulletin Date</AILabel>
          <Input
            type="date"
            value={inputs.bulletinDate || ""}
            onChange={(e) => setInputs(prev => ({ ...prev, bulletinDate: e.target.value }))}
            className="rounded-xl border-border bg-muted/50"
          />
        </div>
      </div>

      <div>
        <AILabel>Weekly Theme/Focus (optional)</AILabel>
        <AITextarea
          value={inputs.theme || ""}
          onChange={(value) => setInputs(prev => ({ ...prev, theme: value }))}
          placeholder="e.g. Walking in Faith, Healing, The Power of Prayer..."
          minHeight="60px"
          accent={accent}
        />
      </div>

      <div>
        <AILabel>Tone</AILabel>
        <SegmentedControl
          options={tones}
          value={inputs.tone || "warm"}
          onChange={(value) => setInputs(prev => ({ ...prev, tone: value }))}
          accent={accent}
        />
      </div>

      <div>
        <AILabel>Include Sections</AILabel>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'welcome', label: '📖 Welcome message', enabled: true },
            { key: 'events', label: '📅 Upcoming events', enabled: churchData?.events?.length > 0 },
            { key: 'announcements', label: '📢 Announcements', enabled: churchData?.announcements?.length > 0 },
            { key: 'sermon', label: '🎤 Sermon notes', enabled: !!churchData?.sermon },
            { key: 'giving', label: '💰 Giving update', enabled: !!churchData?.campaign },
            { key: 'prayer', label: '🙏 Closing prayer', enabled: true }
          ].map(section => (
            <motion.button
              key={section.key}
              type="button"
              onClick={() => section.enabled && toggleSection(section.key)}
              disabled={!section.enabled}
              whileHover={section.enabled ? { scale: 1.02 } : {}}
              whileTap={section.enabled ? { scale: 0.98 } : {}}
              className={`rounded-lg border px-3 py-2 text-sm transition-all duration-200 text-left ${
                inputs.sections?.[section.key]
                  ? 'border-primary bg-primary/5 text-primary'
                  : section.enabled
                  ? 'border-border text-muted-foreground hover:border-border/80'
                  : 'border-border/30 text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              {section.label}
            </motion.button>
          ))}
        </div>
      </div>
      
      <GenerateButton
        onClick={onGenerate}
        loading={loading}
        accent={accent}
        disabled={isDisabled}
      >
        Generate Bulletin
      </GenerateButton>
    </div>
  );
}

// Worship Song Suggester Tool Component
function WorshipSongTool({ 
  inputs, 
  setInputs, 
  onGenerate, 
  loading, 
  accent 
}: {
  inputs: Record<string, any>;
  setInputs: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onGenerate: () => void;
  loading: boolean;
  accent?: string;
}) {
  const church = useChurch();
  const [songLibraryCount, setSongLibraryCount] = useState(0);
  const [songLibrary, setSongLibrary] = useState<any[]>([]);

  // Fetch song library data on mount
  useEffect(() => {
    const fetchSongData = async () => {
      try {
        const songsResult = await supabase
          .from('songs')
          .select('*', { count: 'exact' })
          .eq(COLS.TENANT_ID, church.tenantId);
        const songs = songsResult.data || [];
        const count = songsResult.count || 0;
        
        setSongLibraryCount(count);
        setSongLibrary(songs);
        
        // Store song library in inputs for prompt generation
        setInputs(prev => ({ ...prev, songLibrary: songs }));
      } catch (error) {
        console.error('Error fetching song library:', error);
        setSongLibraryCount(0);
        setSongLibrary([]);
        setInputs(prev => ({ ...prev, songLibrary: [] }));
      }
    };

    fetchSongData();
  }, [church.tenantId, setInputs]);

  const serviceMoments = [
    { key: "opening", label: "🎵 Opening", emoji: "🎵" },
    { key: "worship", label: "🙏 Worship Set", emoji: "🙏" },
    { key: "offering", label: "🤲 Offering", emoji: "🤲" },
    { key: "communion", label: "🍞 Communion", emoji: "🍞" },
    { key: "altar", label: "✊ Altar Call", emoji: "✊" },
    { key: "closing", label: "🚪 Closing", emoji: "🚪" }
  ];

  const moods = [
    { key: "high-energy", emoji: "🔥", title: "High Energy", desc: "Celebratory, upbeat, joyful" },
    { key: "reverent", emoji: "🙏", title: "Reverent", desc: "Reflective, intimate, quiet" },
    { key: "powerful", emoji: "⚡", title: "Powerful", desc: "Declaration, warfare, bold" },
    { key: "gentle", emoji: "🕊️", title: "Gentle", desc: "Healing, comfort, tender" }
  ];

  const songCounts = [
    { key: "3", label: "3 songs" },
    { key: "5", label: "5 songs" },
    { key: "7", label: "7 songs" }
  ];

  const isDisabled = !inputs.topic?.trim() || !inputs.serviceMoment || !inputs.mood;

  return (
    <div className="space-y-6">
      {/* Song Library Status */}
      <BlurFadeIn delay={0}>
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-pink-500" />
            <span className="text-sm font-medium">
              Drawing from your {songLibraryCount} songs
            </span>
          </div>
          {songLibraryCount === 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <Music2 className="h-3 w-3" />
              Your Song Library is empty. We'll suggest from common worship songs instead.
            </div>
          )}
        </div>
      </BlurFadeIn>

      <div>
        <AILabel>Sermon Topic or Scripture</AILabel>
        <AITextarea
          value={inputs.topic || ""}
          onChange={(value) => setInputs(prev => ({ ...prev, topic: value }))}
          placeholder="e.g. The grace of God, Romans 8:28, Walking in faith, Healing and restoration..."
          minHeight="80px"
          accent={accent}
        />
      </div>

      <div>
        <AILabel>Service Moment</AILabel>
        <SegmentedControl
          options={serviceMoments}
          value={inputs.serviceMoment || ""}
          onChange={(value) => setInputs(prev => ({ ...prev, serviceMoment: value }))}
          accent={accent}
        />
      </div>

      <div>
        <AILabel>Mood & Energy</AILabel>
        <div className="grid grid-cols-2 gap-3">
          {moods.map(mood => (
            <motion.button
              key={mood.key}
              type="button"
              onClick={() => setInputs(prev => ({ ...prev, mood: mood.key }))}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-xl border p-4 cursor-pointer text-center transition-all duration-200 ${
                inputs.mood === mood.key
                  ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/20 shadow-sm'
                  : 'border-border hover:border-border/80'
              }`}
            >
              <div className="text-2xl mb-2">{mood.emoji}</div>
              <div className="font-semibold text-sm mb-1">{mood.title}</div>
              <div className="text-xs text-muted-foreground">{mood.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <AILabel>Number of Suggestions</AILabel>
        <SegmentedControl
          options={songCounts}
          value={inputs.songCount || "5"}
          onChange={(value) => setInputs(prev => ({ ...prev, songCount: value }))}
          accent={accent}
        />
      </div>
      
      <GenerateButton
        onClick={onGenerate}
        loading={loading}
        accent={accent}
        disabled={isDisabled}
      >
        Suggest Songs
      </GenerateButton>
    </div>
  );
}

// Voice to Sermon Notes Tool Component
function VoiceNotesTool({ 
  inputs, 
  setInputs, 
  onGenerate, 
  loading, 
  accent 
}: {
  inputs: Record<string, any>;
  setInputs: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onGenerate: () => void;
  loading: boolean;
  accent?: string;
}) {
  const [recordingState, setRecordingState] = useState<'ready' | 'recording' | 'processing' | 'output'>('ready');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<'transcribing' | 'formatting'>('transcribing');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  const browserSupported = typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getBrowserSpecificHelp = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') || userAgent.includes('Edge')) {
      return 'Click the 🔒 lock icon in your address bar → Site settings → Microphone → Allow';
    } else if (userAgent.includes('Firefox')) {
      return 'Click the microphone icon in your address bar → Allow';
    } else if (userAgent.includes('Safari')) {
      return 'Safari menu → Settings → Websites → Microphone → Allow';
    }
    return 'Allow microphone access in your browser settings';
  };

  const startRecording = async () => {
    try {
      setPermissionDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingTime < 3) {
          toast.error("Recording too short. Please speak for at least a few seconds.");
          setRecordingState('ready');
          setRecordingTime(0);
          return;
        }
        
        processAudio(blob, mimeType);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecordingState('recording');
      setRecordingTime(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        setPermissionDenied(true);
      } else {
        toast.error("Could not access microphone. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const processAudio = async (blob: Blob, mimeType: string) => {
    setRecordingState('processing');
    setProcessingPhase('transcribing');
    
    try {
      // Prepare form data for Edge Function
      const formData = new FormData();
      const filename = mimeType === 'audio/webm' ? 'recording.webm' : 'recording.mp4';
      formData.append('file', blob, filename);
      formData.append('formatPrompt', `Format the following raw speech transcript into structured sermon notes.

Organise into these sections:
1. Introduction / Opening
2. Main Points (number each one clearly)
3. Scripture References (fix any transcription errors e.g. 'john 316' → 'John 3:16', 'romans 828' → 'Romans 8:28')
4. Conclusion / Application
5. Prayer Points (if mentioned)

Return clean, well-formatted sermon notes. Use markdown-style headers for sections. Fix obvious transcription errors based on theological context.`);

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData
      });

      if (error) {
        console.error('Transcription error:', error);
        throw new Error(error.message || 'Transcription failed');
      }

      const { transcript, formattedNotes } = data;
      
      if (!transcript?.trim()) {
        toast.error("Could not transcribe audio. Please try speaking more clearly.");
        setRecordingState('ready');
        return;
      }

      setInputs(prev => ({ ...prev, transcript, formattedNotes }));
      setRecordingState('output');
      toast.success("Sermon notes generated successfully!");
      
    } catch (error: any) {
      console.error('Processing error:', error);
      if (error.message.includes('429')) {
        toast.error("AI is busy right now. Please try again in a moment.");
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Connection failed. Please check your internet connection and try again.");
      } else {
        toast.error("AI is taking longer than usual. Please try again.");
      }
      setRecordingState('ready');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetRecording = () => {
    setRecordingState('ready');
    setRecordingTime(0);
    setAudioBlob(null);
    setInputs(prev => ({ ...prev, transcript: '', formattedNotes: '' }));
  };

  if (!browserSupported) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <MicOff className="h-12 w-12 text-amber-500" />
        <p className="text-lg font-semibold text-foreground">Your browser does not support audio recording</p>
        <p className="text-sm text-muted-foreground max-w-sm">Please use Chrome, Firefox, Safari 14+, or Edge</p>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <MicOff className="h-12 w-12 text-amber-500" />
        <p className="text-lg font-semibold text-foreground">Microphone access denied</p>
        <p className="text-sm text-muted-foreground max-w-sm mb-2">
          To use this tool, allow microphone access in your browser settings.
        </p>
        <p className="text-xs text-muted-foreground max-w-md bg-muted rounded-lg p-3">
          {getBrowserSpecificHelp()}
        </p>
        <Button onClick={() => setPermissionDenied(false)} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (recordingState === 'ready') {
    return (
      <div className="flex flex-col items-center py-8 space-y-6">
        {/* Animated Mic Icon */}
        <div className="relative w-24 h-24">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-400/40"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-400/40"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 1 }}
          />
          <div className="absolute inset-2 rounded-full bg-red-500/10 flex items-center justify-center">
            <Mic className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Ready to record</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Click record, then speak naturally. Your sermon notes will be transcribed and structured automatically using AI.
          </p>
        </div>

        {/* Tips */}
        <div className="flex gap-3 flex-wrap justify-center">
          {[
            { icon: "🎤", text: "Speak clearly" },
            { icon: "🔇", text: "Quiet environment" },
            { icon: "⏱", text: "Up to 25 minutes" },
            { icon: "🌐", text: "Works on all browsers" }
          ].map(tip => (
            <span key={tip.text} className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{tip.icon}</span>
              {tip.text}
            </span>
          ))}
        </div>

        <motion.button
          onClick={startRecording}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="bg-red-500 hover:bg-red-600 text-white rounded-2xl h-14 px-10 font-semibold flex items-center gap-2"
        >
          <Mic className="h-5 w-5" />
          Start Recording
        </motion.button>
      </div>
    );
  }

  if (recordingState === 'recording') {
    return (
      <div className="flex flex-col items-center py-8 space-y-6">
        {/* Waveform Animation */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-red-500 rounded-full"
              animate={{ height: [8, 24, 8] }}
              transition={{
                repeat: Infinity,
                duration: 0.8,
                delay: i * 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-3xl font-mono font-semibold text-foreground">
          {formatTime(recordingTime)}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-red-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
          <span className="text-sm text-muted-foreground">Recording...</span>
        </div>

        <motion.button
          onClick={stopRecording}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="bg-red-500 hover:bg-red-600 text-white rounded-2xl h-14 px-10 font-semibold flex items-center gap-2"
        >
          <StopCircle className="h-5 w-5" />
          Stop & Transcribe
        </motion.button>
      </div>
    );
  }

  if (recordingState === 'processing') {
    return (
      <div className="flex flex-col items-center py-8 space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          {processingPhase === 'transcribing' ? (
            <AudioWaveform className="h-10 w-10 text-blue-500" />
          ) : (
            <Sparkles className="h-10 w-10 text-violet-500" />
          )}
        </motion.div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {processingPhase === 'transcribing' ? 'Transcribing audio...' : 'Formatting sermon notes...'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {processingPhase === 'transcribing' 
              ? 'Groq Whisper is converting your speech to text'
              : 'AI is structuring your transcript into sermon notes'
            }
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xs bg-muted rounded-full h-2">
          <motion.div
            className={`h-full rounded-full ${processingPhase === 'transcribing' ? 'bg-blue-500' : 'bg-violet-500'}`}
            initial={{ width: processingPhase === 'transcribing' ? '0%' : '55%' }}
            animate={{ width: processingPhase === 'transcribing' ? '55%' : '100%' }}
            transition={{ duration: processingPhase === 'transcribing' ? 8 : 4, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  if (recordingState === 'output' && inputs.formattedNotes) {
    const sections = inputs.formattedNotes.split(/(?=#{1,3}\s)/g).filter(Boolean);
    
    return (
      <div className="space-y-4">
        {sections.map((section, index) => {
          const lines = section.trim().split('\n');
          const header = lines[0];
          const content = lines.slice(1).join('\n').trim();
          
          const sectionIcons: Record<string, string> = {
            'introduction': '📖',
            'opening': '📖',
            'main': '1️⃣',
            'point': '2️⃣',
            'scripture': '📜',
            'conclusion': '🎯',
            'application': '🎯',
            'prayer': '🙏'
          };
          
          const icon = Object.keys(sectionIcons).find(key => 
            header.toLowerCase().includes(key)
          ) ? sectionIcons[Object.keys(sectionIcons).find(key => 
            header.toLowerCase().includes(key)
          )!] : '📝';
          
          return (
            <BlurFadeIn key={index} delay={index * 0.08}>
              <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <span>{icon}</span>
                  {header.replace(/^#+\s*/, '')}
                </h4>
                {content && (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {content}
                  </div>
                )}
              </div>
            </BlurFadeIn>
          );
        })}
        
        <div className="flex flex-wrap gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(inputs.formattedNotes)}>
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy All
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Download started!")}>
            <Download className="h-3.5 w-3.5 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Feature coming soon!")}>
            Send to Sermon Notes
          </Button>
          <button
            onClick={resetRecording}
            className="text-sm text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            Record Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function TranslationTool({ 
  inputs, 
  setInputs, 
  onGenerate, 
  loading, 
  accent 
}: {
  inputs: Record<string, any>;
  setInputs: (fn: (prev: Record<string, any>) => Record<string, any>) => void;
  onGenerate: () => void;
  loading: boolean;
  accent?: string;
}) {
  const languages = [
    "Swahili", "French", "Luganda", "Zulu", "Amharic", "Hausa", 
    "Yoruba", "Igbo", "Kinyarwanda", "Portuguese", "Arabic", 
    "Spanish", "German", "Chinese (Simplified)"
  ];

  const contentTypes = [
    "Sermon excerpt", "Announcement", "Weekly bulletin", 
    "Prayer", "Scripture", "General church text"
  ];

  const isDisabled = !inputs.text?.trim() || !inputs.language || !inputs.contentType;

  return (
    <div className="space-y-4">
      <AILabel>Text to Translate</AILabel>
      <AITextarea
        value={inputs.text || ""}
        onChange={(value) => setInputs(prev => ({ ...prev, text: value }))}
        placeholder="Paste the sermon excerpt, announcement, bulletin, or any church text you want to translate..."
        minHeight="180px"
        accent={accent}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <AILabel>Target Language</AILabel>
          <AISelect
            value={inputs.language || ""}
            onChange={(value) => setInputs(prev => ({ ...prev, language: value }))}
            accent={accent}
          >
            {languages.map(lang => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </AISelect>
        </div>
        
        <div>
          <AILabel>Content Type</AILabel>
          <AISelect
            value={inputs.contentType || ""}
            onChange={(value) => setInputs(prev => ({ ...prev, contentType: value }))}
            accent={accent}
          >
            {contentTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </AISelect>
        </div>
      </div>
      
      <GenerateButton
        onClick={onGenerate}
        loading={loading}
        accent={accent}
        disabled={isDisabled}
      >
        Translate
      </GenerateButton>
    </div>
  );
}

export default function AITools() {
  const church = useChurch();
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Tool states
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeToolData = TOOLS.find(t => t.id === activeTool);

  const handleToolClick = (toolId: string) => {
    setActiveTool(toolId);
    setInputs({});
    setOutput("");
  };

  const handleBack = () => {
    setActiveTool(null);
    setInputs({});
    setOutput("");
  };

  const handleGenerate = async () => {
    if (!activeToolData) return;
    
    setLoading(true);
    setOutput("");
    
    try {
      let prompt = "";
      
      if (activeTool === 'translation') {
        // Validate inputs
        if (!inputs.text?.trim()) {
          toast.error("Please enter text to translate");
          return;
        }
        if (!inputs.language) {
          toast.error("Please select a target language");
          return;
        }
        if (!inputs.contentType) {
          toast.error("Please select content type");
          return;
        }

        prompt = `You are an expert translator specialising in Christian and church contexts. You maintain theological accuracy and faith-based tone in all translations.

Translate the following ${inputs.contentType} into ${inputs.language}. Maintain the faith-based tone and theological accuracy. Use terminology common in ${inputs.language}-speaking Christian communities. If a term has no direct translation, use the most widely accepted equivalent.

Return ONLY the translated text with no explanations, preamble, or notes.

Text to translate:
${inputs.text}`;
      } else if (activeTool === 'childrens-lesson') {
        // Validate inputs
        if (!inputs.story?.trim()) {
          toast.error("Please enter a Bible story or scripture");
          return;
        }
        if (!inputs.ageGroup) {
          toast.error("Please select an age group");
          return;
        }

        const materials = inputs.materials?.join(', ') || 'Basic classroom materials';
        const duration = inputs.duration || '45 minutes';
        const classSize = inputs.classSize || 'Medium (11-25)';

        prompt = `You are a children's ministry specialist with expertise in age-appropriate Christian education. You create engaging, theologically sound lesson plans that children actually enjoy.

Create a complete Sunday school lesson plan.
Bible story/scripture: ${inputs.story}
Age group: ${inputs.ageGroup}
Duration: ${duration}
Class size: ${classSize}
Available materials: ${materials}

Structure the lesson plan with these sections:
1. LEARNING OBJECTIVES (2-3 simple goals appropriate for ${inputs.ageGroup} children)
2. OPENING ACTIVITY (5-10 min, engaging icebreaker that connects to the story)
3. STORY TIME (simplified narrative appropriate for ${inputs.ageGroup}, with suggested questions to ask during the story)
4. MEMORY VERSE (one verse with a simple explanation and a fun way to memorize it appropriate for ${inputs.ageGroup})
5. CRAFT/ACTIVITY (using ${materials}, clearly step-by-step instructions)
6. DISCUSSION QUESTIONS (3-4 questions appropriate for ${inputs.ageGroup})
7. CLOSING PRAYER (simple, child-friendly, 30 seconds maximum)

Make it fun, engaging, and easy for a teacher to follow without prior preparation.`;
      } else if (activeTool === 'pastoral-letter') {
        // Validate inputs
        if (!inputs.letterType) {
          toast.error("Please select a letter type");
          return;
        }
        if (!inputs.recipientName?.trim()) {
          toast.error("Please enter the recipient's name");
          return;
        }

        const pastorName = inputs.pastorName || 'Pastor';
        const churchName = inputs.churchName || 'Church';
        const details = inputs.details || 'none provided';
        const tone = inputs.tone || 'warm';

        const letterTypeInstructions = {
          welcome: 'warm, excited, include what to expect as a new member of the church',
          condolence: 'deeply compassionate, focus on God\'s comfort and hope of resurrection',
          congratulations: 'joyful, celebrate God\'s blessing',
          concern: 'gentle but clear, loving but honest, not accusatory',
          certificate: 'formal, celebratory, acknowledges their commitment',
          general: 'professional and pastoral'
        };

        prompt = `You are an experienced pastoral writer with deep theological knowledge. You write letters that are compassionate, faith-filled, scripturally grounded, and appropriate for the occasion.

Write a ${inputs.letterType} pastoral letter.
From: ${pastorName}, ${churchName}
To: ${inputs.recipientName}
Tone: ${tone}
Context/details: ${details}

Requirements:
- Include an appropriate scripture reference
- Format as a proper letter: date, salutation, 2-3 body paragraphs, closing, signature line
- Length: 200-350 words
- ${letterTypeInstructions[inputs.letterType as keyof typeof letterTypeInstructions]}

Return a properly formatted letter.`;
      } else if (activeTool === 'weekly-bulletin') {
        // Validate inputs
        if (!inputs.churchName?.trim()) {
          toast.error("Please enter church name");
          return;
        }
        if (!inputs.bulletinDate) {
          toast.error("Please select bulletin date");
          return;
        }

        const theme = inputs.theme || 'not specified';
        const tone = inputs.tone || 'warm';
        const sections = inputs.sections || {};

        // Build sections list
        const includedSections = Object.entries(sections)
          .filter(([_, included]) => included)
          .map(([section, _]) => section);

        prompt = `You are a church communications assistant. Generate a warm, professional weekly church bulletin. Format with clear section headers. Use faith-based, welcoming language throughout.

Generate a weekly bulletin for ${inputs.churchName} dated ${inputs.bulletinDate}.
Tone: ${tone}.
Weekly theme: ${theme}.
Include these sections: ${includedSections.join(', ')}.

Live church data:
Events: ${JSON.stringify(inputs.churchData?.events || [])}
Announcements: ${JSON.stringify(inputs.churchData?.announcements || [])}
Latest sermon: ${inputs.churchData?.sermon ? `${inputs.churchData.sermon.title} - ${inputs.churchData.sermon.scripture_reference}` : 'None available'}
Giving: ${inputs.churchData?.campaign ? `${inputs.churchData.campaign.name} - Goal: ${inputs.churchData.campaign.target_amount}` : 'No active campaign'}

Format each section with a clear header. Keep the bulletin warm, faith-filled, and between 400-600 words total.`;
      } else if (activeTool === 'worship-suggester') {
        // Validate inputs
        if (!inputs.topic?.trim()) {
          toast.error("Please enter sermon topic or scripture");
          return;
        }
        if (!inputs.serviceMoment) {
          toast.error("Please select service moment");
          return;
        }
        if (!inputs.mood) {
          toast.error("Please select mood & energy");
          return;
        }

        const songCount = inputs.songCount || '5';
        const songLibrary = inputs.songLibrary || [];

        prompt = `You are an experienced worship director with deep knowledge of contemporary Christian music, gospel music, and African worship music. You select songs that theologically and emotionally complement the sermon.

Suggest ${songCount} worship songs for this service.
Sermon topic/scripture: ${inputs.topic}
Service moment: ${inputs.serviceMoment}
Mood needed: ${inputs.mood}

Songs available in the church Song Library:
${songLibrary.length > 0 ? songLibrary.map((s: any) => s.title).join(', ') : 'No songs in library - suggest from common worship songs'}

For each suggestion provide:
1. Song title and primary artist/writer
2. Why it fits this sermon and moment (1-2 sentences)
3. Suggested key to play in
4. Energy level (High/Medium/Low)
5. Whether it is in the Song Library: YES or NO

PRIORITISE songs from the Song Library above all. If suggesting songs not in the library, clearly mark them 'Add to library'. Include a mix of well-known and possibly lesser-known songs appropriate for an African congregation.`;
      } else {
        // Placeholder for other tools
        await new Promise(resolve => setTimeout(resolve, 2000));
        setOutput("Generated content will appear here...");
        toast.success("Content generated successfully!");
        return;
      }

      // Call Supabase Edge Function instead of Groq directly
      const { data, error } = await supabase.functions.invoke('generate-ai-content', {
        body: { prompt }
      });

      if (error) {
        console.error('Edge Function error:', error);
        toast.error("AI is taking longer than usual. Please try again.");
        return;
      }

      const generatedContent = data?.content || "";
      
      if (!generatedContent.trim()) {
        toast.error("AI returned an empty response. Please try again with more detail in your input.");
        return;
      }

      setOutput(generatedContent);
      toast.success("Content generated successfully!");
    } catch (error: any) {
      console.error('Generation error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Connection failed. Please check your internet connection and try again.");
      } else {
        toast.error("AI is taking longer than usual. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    // Implement PDF download
    toast.success("Download started!");
  };

  const handleGenerateAgain = () => {
    setOutput("");
  };

  if (activeTool) {
    return (
      <>
        <Helmet><title>AI Tools — Vestry</title></Helmet>
        
        <AnimatePresence mode="wait">
          {/* Enhanced Expanded Panel */}
          <motion.div
            key={activeTool}
            layoutId={`tool-card-${activeTool}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-xl z-40"
          >
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-5xl w-full h-[95vh] bg-gradient-to-br from-background via-background to-muted/20 rounded-3xl border border-border/50 shadow-2xl shadow-black/20 overflow-hidden z-50 flex flex-col">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingOrb delay={0} size={200} color={activeToolData?.accent || '#7c3aed'} />
                <FloatingOrb delay={2} size={150} color={activeToolData?.accent || '#7c3aed'} />
              </div>
            
            <div className="flex flex-col h-full relative z-10">
              {/* Premium Header */}
              <div className="flex-shrink-0 border-b border-border/50 p-8 bg-gradient-to-r from-background/80 to-muted/20 backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <motion.button
                      whileHover={{ scale: 1.02, x: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBack}
                      className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
                    >
                      <div className="p-2 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                      </div>
                      <span className="font-medium">Back to AI Tools</span>
                    </motion.button>
                    
                    <div className="flex items-start gap-6">
                      <motion.div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
                        style={{ 
                          background: `linear-gradient(135deg, ${activeToolData?.accent}15, ${activeToolData?.accent}10)`
                        }}
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        {/* Enhanced icon glow */}
                        <motion.div
                          className="absolute inset-0 rounded-2xl"
                          style={{
                            background: `linear-gradient(135deg, ${activeToolData?.accent}30, ${activeToolData?.accent}20)`,
                            filter: 'blur(12px)'
                          }}
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        {activeToolData?.icon && (
                          <activeToolData.icon 
                            className="h-10 w-10 relative z-10" 
                            style={{ color: activeToolData.accent }}
                          />
                        )}
                      </motion.div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <GradientText
                            colors={[activeToolData?.accent || '#7c3aed', activeToolData?.accent || '#7c3aed']}
                            className="text-3xl font-bold"
                          >
                            {activeToolData?.name}
                          </GradientText>
                        </div>
                        
                        <p className="text-muted-foreground leading-relaxed mb-4 max-w-2xl">
                          {activeToolData?.description}
                        </p>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <PremiumBadge>{activeToolData?.category}</PremiumBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-950/30 dark:to-purple-950/30 rounded-2xl px-4 py-3 flex items-center gap-3 border border-violet-200 dark:border-violet-800"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Zap className="h-4 w-4 text-violet-600" />
                    </motion.div>
                    <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                      Powered by Groq
                    </span>
                  </motion.div>
                </div>
              </div>
              
              {/* Enhanced Content Area with proper scrolling */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="p-8 pb-24">
                  {activeTool === 'weekly-bulletin' && (
                    <WeeklyBulletinTool 
                      inputs={inputs} 
                      setInputs={setInputs} 
                      onGenerate={handleGenerate} 
                      loading={loading} 
                      accent={activeToolData?.accent} 
                    />
                  )}
                  {activeTool === 'translation' && (
                    <TranslationTool 
                      inputs={inputs} 
                      setInputs={setInputs} 
                      onGenerate={handleGenerate} 
                      loading={loading} 
                      accent={activeToolData?.accent} 
                    />
                  )}
                  {activeTool === 'childrens-lesson' && (
                    <ChildrensLessonTool 
                      inputs={inputs} 
                      setInputs={setInputs} 
                      onGenerate={handleGenerate} 
                      loading={loading} 
                      accent={activeToolData?.accent} 
                    />
                  )}
                  {activeTool === 'pastoral-letter' && (
                    <PastoralLetterTool 
                      inputs={inputs} 
                      setInputs={setInputs} 
                      onGenerate={handleGenerate} 
                      loading={loading} 
                      accent={activeToolData?.accent} 
                    />
                  )}
                  {activeTool === 'worship-suggester' && (
                    <WorshipSongTool 
                      inputs={inputs} 
                      setInputs={setInputs} 
                      onGenerate={handleGenerate} 
                      loading={loading} 
                      accent={activeToolData?.accent} 
                    />
                  )}
                  {activeTool === 'voice-notes' && (
                    <VoiceNotesTool 
                      inputs={inputs} 
                      setInputs={setInputs} 
                      onGenerate={handleGenerate} 
                      loading={loading} 
                      accent={activeToolData?.accent} 
                    />
                  )}
                  
                  {/* Enhanced AI Output for standard generation tools */}
                  {['translation', 'childrens-lesson', 'pastoral-letter', 'weekly-bulletin', 'worship-suggester'].includes(activeTool || '') && (
                    <AIOutput
                      content={output}
                      loading={loading}
                      accent={activeToolData?.accent || '#8b5cf6'}
                      onCopy={handleCopy}
                      onDownload={handleDownload}
                      onGenerateAgain={handleGenerateAgain}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <Helmet><title>AI Tools — Vestry</title></Helmet>
      
      <AnimatePresence mode="wait">
        <motion.div
          key="launcher"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
      
      {/* Premium background with animated gradients */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #8b5cf6, transparent 70%)'
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #06b6d4, transparent 70%)'
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.1, 0.15]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>
      
      <div className="min-h-screen">
        {/* Premium Hero Section with better responsive spacing */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
            <div className="text-center mb-20 lg:mb-24">
              <BlurFadeIn delay={0}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800 mb-8"
                >
                  <Zap className="h-5 w-5 text-violet-600" />
                  <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                    Powered by Advanced AI
                  </span>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-5 w-5 text-violet-500" />
                  </motion.div>
                </motion.div>
              </BlurFadeIn>
              
              <BlurFadeIn delay={0.1}>
                <h1 className="text-4xl sm:text-5xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-tight">
                  <GradientText
                    colors={['#8b5cf6', '#06b6d4', '#f59e0b', '#8b5cf6']}
                    animationSpeed={8}
                    className="bg-clip-text text-transparent"
                  >
                    AI Tools
                  </GradientText>
                </h1>
              </BlurFadeIn>
              
              <BlurFadeIn delay={0.2}>
                <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12">
                  Transform your ministry with intelligent tools that understand your church's unique needs. 
                  From sermon preparation to member communication, let AI handle the heavy lifting.
                </p>
              </BlurFadeIn>
              
              <BlurFadeIn delay={0.3}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-12 text-sm sm:text-base text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span>6 AI Tools Available</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5" />
                    <span>Average: 30s generation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <span>Enterprise-grade security</span>
                  </div>
                </div>
              </BlurFadeIn>
            </div>
          </div>
        </div>

        {/* Premium Tools Grid with proper responsive spacing and full width */}
        <div className="w-full max-w-none" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 w-full">
            {/* Main AI Tools Grid with explicit grid template */}
            <div 
              className="grid gap-6 sm:gap-8 lg:gap-10 mb-16 w-full grid-cols-12 md:grid-cols-12 sm:grid-cols-12"
              style={{
                gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              {TOOLS.map((tool, index) => (
                <BlurFadeIn 
                  key={tool.id} 
                  delay={index * 0.1}
                  className={`${colSpanMap[tool.colSpan]} md:col-span-6 sm:col-span-12`}
                >
                  <ToolCard
                    tool={tool}
                    index={index}
                    onClick={() => handleToolClick(tool.id)}
                  />
                </BlurFadeIn>
              ))}
            </div>

            {/* Existing Tools Showcase - Separate section with proper spacing */}
            <div className="mt-20 w-full">
              <BlurFadeIn delay={0.3}>
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-foreground mb-4">
                    Already in Your Toolkit
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    These AI-powered features are built into existing modules across your church management system
                  </p>
                </div>
              </BlurFadeIn>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full">
                {EXISTING_TOOLS.map((tool, index) => (
                  <BlurFadeIn key={tool.name} delay={0.4 + index * 0.1}>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-3xl border border-dashed border-border/60 bg-gradient-to-br from-muted/20 to-muted/40 backdrop-blur-sm overflow-hidden cursor-pointer group w-full"
                      style={{ minHeight: '280px', padding: '32px', width: '100%', boxSizing: 'border-box' }}
                      onClick={() => navigate(tool.route)}
                    >
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                      <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 20px 20px, currentColor 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                      }} />
                    </div>
                    
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
                          style={{ backgroundColor: `${tool.color}15` }}
                        >
                          <motion.div
                            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                            style={{ 
                              background: `linear-gradient(135deg, ${tool.color}40, ${tool.color}20)`,
                              filter: 'blur(8px)'
                            }}
                          />
                          <tool.icon className="h-8 w-8 relative z-10" style={{ color: tool.color }} />
                        </motion.div>
                        
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-foreground group-hover:text-foreground transition-colors mb-2">
                            {tool.name}
                          </h3>
                          <PremiumBadge variant="default">
                            Built-in Feature
                          </PremiumBadge>
                        </div>
                      </div>
                      
                      <p className="text-base text-muted-foreground leading-relaxed mb-6 flex-1">
                        {tool.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <motion.div
                          className="flex items-center gap-2 text-sm font-medium"
                          style={{ color: tool.color }}
                          whileHover={{ x: 4 }}
                        >
                          <Gem className="h-4 w-4" />
                          Available Now
                        </motion.div>
                        
                        <motion.div
                          whileHover={{ x: 6, scale: 1.1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className="p-3 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors duration-200"
                        >
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                </BlurFadeIn>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </motion.div>
  </AnimatePresence>
</>
);
}