# AI Tools Page UI Rebuild - Implementation Guide

## Current Status
The AI Tools page at `/ai-tools` has correct functionality but wrong UI. The file `src/pages/media/AITools.tsx` is very large (~2300 lines) with all the tool logic intact.

## What Needs to Change (UI ONLY)

### 1. Update TOOLS Array (Lines ~30-100)
Remove these properties from each tool:
- `accentLight`
- `features`
- `complexity`
- `estimatedTime`

Update `colSpan` values to match specification:
- Weekly Bulletin: 7
- Translation: 5
- Children's Lesson: 4
- Pastoral Letter: 4
- Worship Suggester: 4
- Voice to Notes: 5

Update `accent` colors to violet palette (NO orange):
- Weekly Bulletin: `#7c3aed` (violet)
- Translation: `#0ea5e9` (sky blue)
- Children's Lesson: `#f59e0b` (amber)
- Pastoral Letter: `#10b981` (emerald)
- Worship Suggester: `#ec4899` (pink)
- Voice to Notes: `#ef4444` (red)

### 2. Update colSpanMap (Line ~102)
```typescript
const colSpanMap: Record<number, string> = {
  4: 'md:col-span-6 lg:col-span-4',
  5: 'md:col-span-6 lg:col-span-5',
  7: 'md:col-span-6 lg:col-span-7'
};
```

### 3. Replace PremiumToolCard Component (Lines ~200-350)
Replace entire `PremiumToolCard` function with new `ToolCard`:

```typescript
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
```

### 4. Replace Main Page Return Statement (Lines ~2050-2300)
Find the main return statement (when `!activeTool`) and replace with:

```typescript
  // Main page view
  return (
    <>
      <Helmet><title>AI Tools — Vestry</title></Helmet>
      
      <BlurFadeIn delay={0}>
        <div className="min-h-screen bg-background px-6 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex flex-col">
                <p className="text-xs font-medium tracking-widest uppercase text-violet-600 dark:text-violet-400 mb-2">
                  POWERED BY AI
                </p>
                <div className="flex items-baseline gap-2">
                  <GradientText
                    colors={['#7c3aed', '#a78bfa', '#6d28d9', '#7c3aed']}
                    animationSpeed={6}
                    className="text-3xl font-bold"
                  >
                    AI
                  </GradientText>
                  <h1 className="text-3xl font-bold text-foreground">Tools</h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Intelligent tools to help your ministry work smarter — powered by Groq
                </p>
              </div>
              
              <div className="bg-muted rounded-full px-3 py-1.5 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-muted-foreground">Powered by Groq</span>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-12 gap-6 mb-8">
              {TOOLS.map((tool, index) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  index={index}
                  onClick={() => handleToolClick(tool.id)}
                />
              ))}
              
              {/* Existing Tools Card */}
              <BlurFadeIn delay={TOOLS.length * 0.08} className="col-span-12 md:col-span-6 lg:col-span-7">
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/40 p-6 h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <h3 className="text-sm font-semibold">Already in your toolkit</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    These AI tools are built into their features
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {EXISTING_TOOLS.map((tool) => (
                      <motion.div
                        key={tool.name}
                        whileHover={{ borderColor: 'rgba(124, 58, 237, 0.4)' }}
                        onClick={() => navigate(tool.route)}
                        className="rounded-xl bg-background border border-border p-3 flex items-center gap-3 cursor-pointer transition-colors"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${tool.color}26` }}
                        >
                          <tool.icon className="h-4 w-4" style={{ color: tool.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{tool.name}</p>
                          <p className="text-xs text-primary">Open →</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </BlurFadeIn>
            </div>
          </div>
        </div>
      </BlurFadeIn>
    </>
  );
```

### 5. Remove Unused Components
Delete these components (they're not in the spec):
- `FloatingOrb`
- `PremiumBadge`
- `AnimatedCounter`

Keep all the tool-specific components:
- `ChildrensLessonTool`
- `PastoralLetterTool`
- `WeeklyBulletinTool`
- `WorshipSongTool`
- `VoiceNotesTool`
- `TranslationTool`
- `AILabel`, `AITextarea`, `AISelect`, `SegmentedControl`, `GenerateButton`, `AIOutput`

## Testing
1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Check page loads at `/ai-tools`
3. Verify bento grid layout (7-5-4-4-4-5-7 pattern)
4. Verify card styling (rounded-2xl, subtle borders, radial gradients)
5. Verify page header (small eyebrow, AI in gradient, Tools in plain text)
6. Verify hover animations (y: -4, scale: 1.01)
7. Verify entrance animations (staggered 0.08s delay)
8. Click a card - expansion should still work
9. Generate content - all logic should still work

## What NOT to Touch
- All `handleGenerate` logic
- All Edge Function calls
- All form state management
- All tool-specific components
- All hooks and utilities
- The expansion panel (when a tool is clicked)
