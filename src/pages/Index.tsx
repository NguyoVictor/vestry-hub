import React, { useRef, useEffect, useState, useCallback } from "react"
import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import Iridescence from "@/components/landing/Iridescence"
import { RevealText } from "@/components/landing/RevealText"
import { PixelIcon } from "@/components/landing/PixelIcon"

// ─── THEME ───────────────────────────────────────────────────────────────────
const SITE_BG    = "#F5F4F1"
const PRIMARY    = "hsl(261, 66%, 33%)"
const PRIMARY_HV = "hsl(261, 66%, 42%)"
const CARD_BG    = "rgba(255,255,255,0.70)"
const NAV_BG     = "rgba(245,244,241,0.30)"
const NAV_SHADOW = "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)"

// ─── INTRO ANIMATION ─────────────────────────────────────────────────────────
const WORD1 = ["V","E","S","T","R","Y"]
const WORD2 = ["H","U","B"]
const ALL_LETTERS = WORD1.length + WORD2.length   // 9

const LTR_IN_STAGGER  = 90
const LTR_IN_DUR      = 700
const HOLD_DUR        = 300
const LETTERS_IN_DONE = LTR_IN_STAGGER * (ALL_LETTERS - 1) + LTR_IN_DUR + HOLD_DUR
const LTR_OUT_STAGGER = 55
const LTR_OUT_DUR     = 450
const CURTAIN_DELAY   = LETTERS_IN_DONE + 100
const CURTAIN_DUR     = 1300
const ANIM_TOTAL      = CURTAIN_DELAY + LTR_OUT_STAGGER * (ALL_LETTERS - 1) + LTR_OUT_DUR + 1400
const HERO_REVEAL_MS  = CURTAIN_DELAY + CURTAIN_DUR - 150

type Phase = "idle" | "in" | "out" | "done"

function IntroAnimation({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [curtainUp, setCurtainUp] = useState(false)

  useEffect(() => {
    const t0 = setTimeout(() => setPhase("in"), 80)
    const t1 = setTimeout(() => setPhase("out"), LETTERS_IN_DONE)
    const t2 = setTimeout(() => setCurtainUp(true), CURTAIN_DELAY)
    const t3 = setTimeout(() => onDone(), HERO_REVEAL_MS)
    const t4 = setTimeout(() => setPhase("done"), ANIM_TOTAL)
    return () => { [t0,t1,t2,t3,t4].forEach(clearTimeout) }
  }, [onDone])

  if (phase === "done") return null

  function renderLetter(letter: string, index: number) {
    const inDelay  = index * LTR_IN_STAGGER
    const outDelay = index * LTR_OUT_STAGGER
    const isIdle = phase === "idle", isIn = phase === "in", isOut = phase === "out"
    const opacity    = isIdle ? 0 : isIn ? 1 : 0
    const blur       = isIdle ? 36 : isIn ? 0 : 24
    const translateY = isIdle ? 48 : isIn ? 0 : -20
    const transition = isOut
      ? `opacity ${LTR_OUT_DUR}ms cubic-bezier(0.4,0,1,1) ${outDelay}ms, filter ${LTR_OUT_DUR}ms cubic-bezier(0.4,0,1,1) ${outDelay}ms, transform ${LTR_OUT_DUR}ms cubic-bezier(0.4,0,1,1) ${outDelay}ms`
      : isIn
      ? `opacity ${LTR_IN_DUR}ms cubic-bezier(0.16,1,0.3,1) ${inDelay}ms, filter ${LTR_IN_DUR}ms cubic-bezier(0.16,1,0.3,1) ${inDelay}ms, transform ${LTR_IN_DUR}ms cubic-bezier(0.16,1,0.3,1) ${inDelay}ms`
      : "none"
    return (
      <span key={index} className="font-sans font-bold text-[#111] leading-none select-none"
        style={{
          fontSize: `calc((100vw - 64px) / ${ALL_LETTERS + 1})`,
          opacity, filter: `blur(${blur}px)`, transform: `translateY(${translateY}px)`, transition,
          willChange: "opacity, filter, transform",
        }}
      >{letter}</span>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-hidden="true">
      <div className="absolute inset-x-0 top-0" style={{
        bottom: curtainUp ? "100%" : "0%",
        transition: curtainUp ? `bottom ${CURTAIN_DUR}ms cubic-bezier(0.76,0,0.24,1)` : "none",
        background: SITE_BG,
      }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center" style={{ gap: "0.1em" }}>
          <div className="flex" style={{ gap: "0.06em" }}>
            {WORD1.map((l, i) => renderLetter(l, i))}
          </div>
          <div style={{ width: "0.3em" }} />
          <div className="flex" style={{ gap: "0.06em" }}>
            {WORD2.map((l, i) => renderLetter(l, WORD1.length + i))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useInView()
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = 16
    const increment = end / (1800 / step)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, step)
    return () => clearInterval(timer)
  }, [inView, end])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

function BentoCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView(0.1)
  return (
    <div ref={ref} className={`group relative rounded-2xl border border-black/[0.07] bg-white overflow-hidden transition-all duration-700 hover:border-black/[0.15] hover:bg-[#fafaf8] ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms, border-color 0.3s ease, background-color 0.3s ease`,
      }}>
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(0,0,0,0.03), transparent 60%)" }} />
      {children}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] tracking-widest font-sans text-black/40 bg-black/[0.04]">
      {children}
    </span>
  )
}

// ─── SITE NAV ─────────────────────────────────────────────────────────────────
function SiteNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const NAV_LINKS = [
    { label: "Platform", href: "#platform" },
    { label: "Features", href: "#features" },
    { label: "Workflow", href: "#workflow" },
    { label: "Pricing",  href: "#pricing"  },
  ]
  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-3xl">
        <nav className="flex items-center justify-between px-5 py-3 rounded-2xl border border-black/[0.06]"
          style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: NAV_BG, boxShadow: NAV_SHADOW }}>
          <Link to="/" className="font-mono text-[11px] tracking-[0.25em] text-black/70 uppercase">VESTRY HUB</Link>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="text-[11px] text-black/60 hover:text-black transition-colors duration-200 tracking-wide">{l.label}</a>
            ))}
            <Link to="/member/login" className="text-[11px] text-black/60 hover:text-black transition-colors duration-200 tracking-wide">Member Portal</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth/signin" className="hidden md:block text-[11px] px-3 py-2 text-black/50 hover:text-black transition-colors duration-200 tracking-wide">Sign In</Link>
            <Link to="/auth/signup" className="hidden md:block text-[11px] px-4 py-2 rounded-xl text-white tracking-wide transition-colors duration-200"
              style={{ background: PRIMARY }} onMouseEnter={e => (e.currentTarget.style.background = PRIMARY_HV)} onMouseLeave={e => (e.currentTarget.style.background = PRIMARY)}>
              Get Started Free
            </Link>
            <button onClick={() => setOpen(v => !v)} className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-[5px] rounded-lg hover:bg-black/[0.04] transition-colors" aria-label={open ? "Close menu" : "Open menu"}>
              <span className="block h-px bg-black/60 transition-all duration-300 origin-center" style={{ width: 18, transform: open ? "translateY(6px) rotate(45deg)" : "none" }} />
              <span className="block h-px bg-black/60 transition-all duration-300" style={{ width: 18, opacity: open ? 0 : 1, transform: open ? "scaleX(0)" : "none" }} />
              <span className="block h-px bg-black/60 transition-all duration-300 origin-center" style={{ width: 18, transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }} />
            </button>
          </div>
        </nav>
        <div className="md:hidden mt-2 overflow-hidden transition-all duration-300" style={{ maxHeight: open ? "400px" : "0px", opacity: open ? 1 : 0 }}>
          <div className="rounded-2xl border border-black/[0.06] px-2 py-2 flex flex-col"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: NAV_BG, boxShadow: NAV_SHADOW }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={close} className="px-4 py-3 text-sm text-black/60 hover:text-black hover:bg-black/[0.03] rounded-xl transition-colors tracking-wide">{l.label}</a>
            ))}
            <Link to="/member/login" onClick={close} className="px-4 py-3 text-sm text-black/60 hover:text-black hover:bg-black/[0.03] rounded-xl transition-colors tracking-wide">Member Portal</Link>
            <div className="px-2 pb-1 mt-1 flex flex-col gap-2">
              <Link to="/auth/signin" onClick={close} className="text-center text-[11px] px-4 py-2.5 rounded-xl border border-black/10 text-black/60 hover:text-black hover:border-black/20 transition-all tracking-wide">Sign In</Link>
              <Link to="/auth/signup" onClick={close} className="text-center text-[11px] px-4 py-2.5 rounded-xl text-white tracking-wide"
                style={{ background: PRIMARY }}>Get Started Free</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── STACKING CHURCH CARDS ────────────────────────────────────────────────────
const CHURCH_TOOLS = [
  {
    label: "GIVING",
    title: "Online Giving & Finance",
    desc: "Members give via Mpesa STK Push directly from their phones. Funds go straight to your church account. Automatic reconciliation included.",
    stats: [{ v: "KSh 2.4M", l: "given last month" }, { v: "98.2%", l: "success rate" }],
  },
  {
    label: "MEMBERS",
    title: "Member Management",
    desc: "Track every member's profile, family connections, discipleship journey, and attendance history. Full pastoral notes included.",
    stats: [{ v: "1,200+", l: "members tracked" }, { v: "4.8★", l: "admin rating" }],
  },
  {
    label: "AI TOOLS",
    title: "AI Sermon & Study Tools",
    desc: "Generate sermon outlines, Bible studies, pastoral letters, and children's lesson plans using AI trained on theological content.",
    stats: [{ v: "5,000+", l: "sermons generated" }, { v: "3.2s", l: "avg generation" }],
  },
  {
    label: "SERVICES",
    title: "Service Planning & Attendance",
    desc: "Plan services, assign volunteers, track attendance, and manage your order of worship — all from one dashboard.",
    stats: [{ v: "880K+", l: "check-ins recorded" }, { v: "12x", l: "faster than paper" }],
  },
]

const STICKY_TOP   = 80
const STICKY_STEP  = 16
const SCALE_STEP   = 0.04
const OFFSET_STEP  = 8

function StackingChurchCards() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [depth, setDepth] = useState<number[]>(CHURCH_TOOLS.map(() => 0))

  useEffect(() => {
    function onScroll() {
      setDepth(CHURCH_TOOLS.map((_, i) => {
        let count = 0
        for (let j = i + 1; j < CHURCH_TOOLS.length; j++) {
          const el = cardRefs.current[j]
          if (!el) continue
          if (el.getBoundingClientRect().top <= STICKY_TOP + j * STICKY_STEP + 2) count++
        }
        return count
      }))
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const TOOL_GRADIENTS = [
    "linear-gradient(135deg, hsl(261,66%,20%) 0%, hsl(261,50%,40%) 100%)",
    "linear-gradient(135deg, hsl(220,60%,20%) 0%, hsl(220,50%,40%) 100%)",
    "linear-gradient(135deg, hsl(16,78%,25%) 0%, hsl(16,60%,45%) 100%)",
    "linear-gradient(135deg, hsl(160,50%,20%) 0%, hsl(160,40%,40%) 100%)",
  ]

  return (
    <div className="flex flex-col" style={{ perspective: "1400px", perspectiveOrigin: "50% 0%" }}>
      {CHURCH_TOOLS.map((tool, i) => {
        const d = depth[i]
        return (
          <div key={tool.label} ref={el => { cardRefs.current[i] = el }} className="sticky mb-4" style={{ top: `${STICKY_TOP + i * STICKY_STEP}px`, zIndex: 10 + i }}>
            <div style={{
              transform: `scale(${1 - d * SCALE_STEP}) translateY(${d * OFFSET_STEP}px)`,
              transformOrigin: "top center",
              transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
              willChange: "transform",
            }}>
              <div className="group relative bg-[#faf9f7] rounded-2xl border border-black/[0.07] overflow-hidden cursor-pointer">
                {/* Colored gradient bar at top-right on desktop */}
                <div className="hidden md:block absolute inset-y-0 right-0 w-2/5 pointer-events-none" style={{ background: TOOL_GRADIENTS[i], opacity: 0.15 }} />
                <div className="relative z-10 p-8">
                  <div className="md:max-w-[60%]">
                    <div className="mb-6"><Tag>{tool.label}</Tag></div>
                    <h3 className="text-xl font-light mb-3">{tool.title}</h3>
                    <p className="text-sm text-black/45 leading-relaxed mb-8">{tool.desc}</p>
                  </div>
                  <div className="flex gap-8 pt-6 border-t border-black/[0.06]">
                    {tool.stats.map(s => (
                      <div key={s.l}>
                        <div className="text-2xl font-light">{s.v}</div>
                        <div className="text-[11px] text-black/35 tracking-widest mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── LIVE CHURCH FEED ─────────────────────────────────────────────────────────
const CHURCH_NAMES  = ["Hope Chapel","Grace Baptist","Victory Church","Living Word","Bethel Assembly","New Life Church","Calvary Church","Faith Center","Zion Church","Crossroads"]
const ACTIVITIES    = ["Member gave KSh 500 tithe","89 attended Sunday service","Visitor registered online","Sermon notes generated via AI","Pledge payment received","Payroll processed for 3 staff","Bible study plan generated","New member profile created","Announcement sent to 350 members","House fellowship check-in"]
const LOCATIONS     = ["Nairobi, KE","Mombasa, KE","Kisumu, KE","Nakuru, KE","Eldoret, KE","Kampala, UG","Dar es Salaam, TZ","Kigali, RW"]
const LIVE_STATUSES = [
  { label: "running",  color: "#4ade80" },
  { label: "running",  color: "#4ade80" },
  { label: "running",  color: "#4ade80" },
  { label: "queued",   color: "#facc15" },
  { label: "complete", color: "#60a5fa" },
]

type ChurchRow = { church: string; activity: string; location: string; status: typeof LIVE_STATUSES[number]; key: number }

function randomChurchRow(key: number): ChurchRow {
  return {
    church:   CHURCH_NAMES[Math.floor(Math.random() * CHURCH_NAMES.length)],
    activity: ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)],
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    status:   LIVE_STATUSES[Math.floor(Math.random() * LIVE_STATUSES.length)],
    key,
  }
}

const SEED_CHURCH_ROWS: ChurchRow[] = [
  { church: "Hope Chapel",    activity: "Member gave KSh 500 tithe",          location: "Nairobi, KE",       status: LIVE_STATUSES[0], key: 0 },
  { church: "Grace Baptist",  activity: "89 attended Sunday service",          location: "Mombasa, KE",       status: LIVE_STATUSES[0], key: 1 },
  { church: "Victory Church", activity: "Visitor registered online",           location: "Kisumu, KE",        status: LIVE_STATUSES[3], key: 2 },
  { church: "Living Word",    activity: "Sermon notes generated via AI",       location: "Nakuru, KE",        status: LIVE_STATUSES[0], key: 3 },
  { church: "Bethel Assembly","activity": "Pledge payment received",           location: "Eldoret, KE",       status: LIVE_STATUSES[0], key: 4 },
  { church: "New Life Church","activity": "Payroll processed for 3 staff",     location: "Kampala, UG",       status: LIVE_STATUSES[4], key: 5 },
]

function LiveChurchFeed() {
  const [rows, setRows] = useState<ChurchRow[]>(SEED_CHURCH_ROWS)
  const [mounted, setMounted] = useState(false)
  const keyRef = useRef(100)

  useEffect(() => {
    setMounted(true)
    setRows(Array.from({ length: 6 }, (_, i) => randomChurchRow(i)))
    const t = setInterval(() => {
      keyRef.current++
      setRows(prev => [...prev.slice(1), randomChurchRow(keyRef.current)])
    }, 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.7)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 90px 70px", padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.03)" }}>
        {["CHURCH","ACTIVITY","LOCATION","STATUS"].map(h => (
          <span key={h} style={{ fontSize: 8, letterSpacing: "0.16em", color: "rgba(0,0,0,0.30)", fontFamily: "monospace" }}>{h}</span>
        ))}
      </div>
      <div style={{ overflow: "hidden" }}>
        {(mounted ? rows : SEED_CHURCH_ROWS).map((row, i) => (
          <div key={row.key} style={{
            display: "grid", gridTemplateColumns: "1fr 1.5fr 90px 70px",
            padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)", gap: 8, alignItems: "center",
            animation: i === rows.length - 1 ? "rowSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both" : "none",
          }}>
            <div style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(0,0,0,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.church}</div>
            <div style={{ fontSize: 9, color: "rgba(0,0,0,0.50)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.activity}</div>
            <div style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(0,0,0,0.30)" }}>{row.location}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%", background: row.status.color,
                boxShadow: row.status.label === "running" ? `0 0 6px ${row.status.color}` : "none",
                animation: row.status.label === "running" ? "statusPulse 2s ease-in-out infinite" : "none",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(0,0,0,0.35)" }}>{row.status.label}</span>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes rowSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes statusPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  )
}

function LiveChurchCounter() {
  const [count, setCount] = useState(247)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setCount(v => v + Math.floor(Math.random() * 3 - 1)), 1200)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontFamily: "monospace", fontSize: "clamp(3rem,6vw,5rem)", fontWeight: 300, color: "rgba(0,0,0,0.85)", lineHeight: 1, letterSpacing: "-0.02em", transition: "color 0.3s ease" }}>
      {mounted ? count.toLocaleString("en-US") : "247"}
    </span>
  )
}

// ─── DEVEX / SETUP SECTION ────────────────────────────────────────────────────
const SETUP_STEPS = [
  {
    num: "01", title: "Create Account", desc: "Sign up in under 2 minutes",
    file: "terminal",
    code: [
      { type: "comment", text: "# Welcome to VestryHub" },
      { type: "command", text: "vestry setup \"Hope Chapel\"" },
      { type: "gap" },
      { type: "output",  text: "  Configuring church profile..." },
      { type: "output",  text: "  Setting up member portal..." },
      { type: "gap" },
      { type: "success", text: "✓ Church profile created" },
      { type: "success", text: "✓ Mpesa giving configured" },
      { type: "success", text: "✓ Member portal ready" },
    ],
  },
  {
    num: "02", title: "Add Your Church", desc: "Customize your church profile",
    file: "church.config.ts",
    code: [
      { type: "comment", text: "// church.config.ts" },
      { type: "keyword", text: "import", after: " { Church } ", keyword2: "from", string: " 'vestryhub'" },
      { type: "gap" },
      { type: "keyword", text: "const", after: " church ", keyword2: "=", keyword3: " new ", fn: "Church", args: "({" },
      { type: "prop", key: "  name",     val: "'Hope Chapel'" },
      { type: "prop", key: "  giving",   val: "'mpesa'" },
      { type: "prop", key: "  branches", val: "['Nairobi', 'Mombasa']" },
      { type: "prop", key: "  ai",       val: "true" },
      { type: "plain", text: "})" },
    ],
  },
  {
    num: "03", title: "Invite Your Team", desc: "Staff and members join instantly",
    file: "terminal",
    code: [
      { type: "comment", text: "# Invite staff and members" },
      { type: "command", text: "vestry invite --role admin pastor@hope.ke" },
      { type: "command", text: "vestry invite --role staff worship@hope.ke" },
      { type: "gap" },
      { type: "success", text: "✓ 3 staff accounts created" },
      { type: "output",  text: "  Invitations sent via email & SMS" },
      { type: "gap" },
      { type: "comment", text: "# Members join via access code" },
      { type: "url",     text: "  → join.vestryhub.com/HOPE2024" },
    ],
  },
  {
    num: "04", title: "Go Live Today", desc: "Start managing your church",
    file: "terminal",
    code: [
      { type: "comment", text: "# Deploy your church dashboard" },
      { type: "command", text: "vestry deploy --church \"Hope Chapel\"" },
      { type: "gap" },
      { type: "output",  text: "  Building church workspace..." },
      { type: "output",  text: "  Enabling Mpesa integration..." },
      { type: "output",  text: "  Launching member portal..." },
      { type: "gap" },
      { type: "success", text: "✓ Hope Chapel is live!" },
      { type: "url",     text: "  → Ready to serve your congregation" },
    ],
  },
]

type CodeLine = {
  type: string; text?: string; after?: string; keyword2?: string; keyword3?: string; fn?: string; args?: string; string?: string; key?: string; val?: string
}

function CodeLineEl({ line }: { line: CodeLine }) {
  if (line.type === "gap")     return <div className="h-3" />
  if (line.type === "comment") return <div className="text-[#9ca3af]">{line.text}</div>
  if (line.type === "output")  return <div className="text-[#6b7280]">{line.text}</div>
  if (line.type === "success") return <div className="text-[#16a34a]">{line.text}</div>
  if (line.type === "url")     return <div className="text-[#2563eb] underline">{line.text}</div>
  if (line.type === "command") return <div><span className="text-[#16a34a]">$ </span><span className="text-[#111]">{line.text}</span></div>
  if (line.type === "plain")   return <div className="text-[#111]">{line.text}</div>
  if (line.type === "prop")    return <div><span className="text-[#2563eb]">{line.key}</span><span className="text-[#111]">: </span><span className="text-[#16a34a]">{line.val}</span><span className="text-[#111]">,</span></div>
  if (line.type === "keyword") return (
    <div>
      <span className="text-[#7c3aed]">{line.text}</span>
      <span className="text-[#111]">{line.after}</span>
      <span className="text-[#7c3aed]">{line.keyword2}</span>
      {line.keyword3 && <span className="text-[#7c3aed]">{line.keyword3}</span>}
      {line.fn && <span className="text-[#b45309]">{line.fn}</span>}
      {line.args && <span className="text-[#111]">{line.args}</span>}
      {line.string && <span className="text-[#16a34a]">{line.string}</span>}
    </div>
  )
  return null
}

function DevExSection() {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(true)

  function selectStep(i: number) {
    if (i === active) return
    setVisible(false)
    setTimeout(() => { setActive(i); setVisible(true) }, 180)
  }

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setActive(prev => (prev + 1) % SETUP_STEPS.length); setVisible(true) }, 180)
    }, 3200)
    return () => clearInterval(t)
  }, [])

  const step = SETUP_STEPS[active]
  return (
    <section id="devex" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.05] border border-black/[0.06] text-[10px] tracking-widest text-black/40 uppercase">
            For Church Admins
          </div>
          <h2 className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
            Built for simplicity.<br />Loved by pastors.
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="flex flex-col gap-3">
            {SETUP_STEPS.map((s, i) => (
              <button key={s.num} onClick={() => selectStep(i)}
                className="flex-1 text-left rounded-2xl border transition-all duration-200 p-6 group"
                style={{
                  background: active === i ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.7)",
                  borderColor: active === i ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)",
                  boxShadow: active === i ? "0 1px 3px rgba(0,0,0,0.06)" : "0 1px 2px rgba(0,0,0,0.03)",
                }}>
                <div className="flex gap-4 items-start">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-light shrink-0 transition-colors duration-200"
                    style={{ background: active === i ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)", color: active === i ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.35)" }}>
                    {s.num}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-light transition-colors duration-200" style={{ color: active === i ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.5)" }}>{s.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(0,0,0,0.28)" }}>{s.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 rounded-2xl border border-black/[0.06] p-8 flex flex-col"
            style={{ background: "rgba(255,255,255,0.7)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", minHeight: "360px" }}>
            <div className="flex items-center justify-between mb-5 shrink-0">
              <div className="text-[10px] tracking-widest uppercase transition-all duration-200"
                style={{ opacity: visible ? 1 : 0, filter: visible ? "blur(0px)" : "blur(4px)", transition: "opacity 200ms ease, filter 200ms ease", color: "rgba(0,0,0,0.3)" }}>
                {step.file}
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map(d => (
                  <div key={d} className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{ background: d === active % 3 ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.08)" }} />
                ))}
              </div>
            </div>
            <div className="flex-1 rounded-xl p-6 overflow-hidden" style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="font-mono text-[12px] leading-6"
                style={{
                  opacity: visible ? 1 : 0, filter: visible ? "blur(0px)" : "blur(6px)",
                  transform: visible ? "translateY(0)" : "translateY(6px)",
                  transition: "opacity 220ms cubic-bezier(0.16,1,0.3,1), filter 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1)",
                }}>
                {step.code.map((line, i) => <CodeLineEl key={i} line={line} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── SECURITY / AUDIT LOG ─────────────────────────────────────────────────────
const LOG_ACTIONS = ["giving_received","member_registered","attendance_recorded","service_scheduled","report_generated","pledge_payment","visitor_checked_in","ai_sermon_generated"]

function AuditLog() {
  const [logs, setLogs] = useState([
    { time: "12:34:21", action: "giving_received",     status: "success" },
    { time: "12:34:18", action: "member_registered",   status: "success" },
    { time: "12:34:15", action: "attendance_recorded", status: "success" },
    { time: "12:34:12", action: "service_scheduled",   status: "success" },
    { time: "12:34:09", action: "report_generated",    status: "success" },
  ])

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date()
      const timeStr = now.toTimeString().slice(0, 8)
      const action = LOG_ACTIONS[Math.floor(Math.random() * LOG_ACTIONS.length)]
      setLogs(prev => [{ time: timeStr, action, status: "success" }, ...prev.slice(0, 4)])
    }, 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-2">
      {logs.map((log, i) => (
        <div key={`${log.time}-${log.action}-${i}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-black/[0.02] hover:bg-black/[0.04] transition-colors border border-black/[0.04] group cursor-pointer"
          style={{ animation: i === 0 ? "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both" : "none" }}>
          <span className="text-[10px] text-black/25 font-mono min-w-[60px]">{log.time}</span>
          <span className="text-[11px] text-black/50 font-light flex-1">{log.action}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 group-hover:bg-green-500 transition-colors" />
        </div>
      ))}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function Index() {
  const [heroReady, setHeroReady] = useState(false)
  const [bgReady,   setBgReady]   = useState(false)
  const handleIntroDone = useCallback(() => setHeroReady(true), [])

  useEffect(() => {
    const t = setTimeout(() => setBgReady(true), HERO_REVEAL_MS)
    return () => clearTimeout(t)
  }, [])

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
  }

  return (
    <>
      <Helmet>
        <title>VestryHub — Church Management for African Churches | Free to Start</title>
        <meta name="description" content="VestryHub helps African churches manage members, accept Mpesa offerings, track attendance, and communicate — all in one platform. Free for up to 100 members." />
        <link rel="canonical" href="https://vestryhub.com/" />
      </Helmet>

      <div style={{ background: SITE_BG }} className="text-[#111] min-h-screen font-sans antialiased">

        {/* ── INTRO ─────────────────────────────────────────────────── */}
        <IntroAnimation onDone={handleIntroDone} />

        {/* ── STICKY NAV ────────────────────────────────────────────── */}
        <SiteNav />

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section className="relative h-screen overflow-hidden">
          {/* Iridescence background */}
          <div className="absolute inset-0 z-0"
            style={{
              transform: bgReady ? "scale(1.05)" : "scale(0.85)",
              transition: "transform 2s cubic-bezier(0.16,1,0.3,1)",
            }}>
            <Iridescence color={[0.4, 0.3, 0.9]} mouseReact amplitude={0.1} speed={1} />
          </div>

          {/* Progressive blur + gradient rising from bottom */}
          <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none" style={{ height: "65%", background: `linear-gradient(to top, ${SITE_BG} 0%, ${SITE_BG} 18%, rgba(245,244,241,0.85) 35%, rgba(245,244,241,0.5) 55%, rgba(245,244,241,0.15) 75%, transparent 100%)` }} />
          <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none" style={{ height: "20%", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", maskImage: "linear-gradient(to top, black 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />
          <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none" style={{ height: "38%", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", maskImage: "linear-gradient(to top, black 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />
          <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none" style={{ height: "55%", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", maskImage: "linear-gradient(to top, black 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />

          <div className="h-20" />

          {/* Title + stats + CTAs — anchored to bottom left */}
          <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col px-6 md:px-12 pb-12 max-w-3xl">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-[#111] leading-[1.05] tracking-tight mb-5"
              style={{
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                opacity: heroReady ? 1 : 0,
                filter: heroReady ? "blur(0px)" : "blur(24px)",
                transform: heroReady ? "translateY(0px)" : "translateY(32px)",
                transition: "opacity 1s cubic-bezier(0.16,1,0.3,1) 0ms, filter 1s cubic-bezier(0.16,1,0.3,1) 0ms, transform 1s cubic-bezier(0.16,1,0.3,1) 0ms",
              }}>
              Manage your<br />church.<br />Effortlessly.
            </h1>

            <p className="text-sm md:text-base text-black/55 leading-relaxed max-w-md mb-8"
              style={{
                opacity: heroReady ? 1 : 0,
                filter: heroReady ? "blur(0px)" : "blur(12px)",
                transform: heroReady ? "translateY(0px)" : "translateY(16px)",
                transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1) 80ms, filter 0.9s cubic-bezier(0.16,1,0.3,1) 80ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) 80ms",
              }}>
              VestryHub replaces the WhatsApp groups, paper registers, and Excel sheets with one platform built for African churches.
            </p>

            {/* 3 stats */}
            <div className="flex gap-8 sm:gap-12 mb-8">
              {[
                { value: "500+",   label: "Churches" },
                { value: "99.9%",  label: "Uptime"   },
                { value: "Africa", label: "Built For" },
              ].map((stat, i) => (
                <div key={i} style={{
                  opacity: heroReady ? 1 : 0, filter: heroReady ? "blur(0px)" : "blur(16px)",
                  transform: heroReady ? "translateY(0px)" : "translateY(20px)",
                  transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${160 + i * 80}ms, filter 0.8s cubic-bezier(0.16,1,0.3,1) ${160 + i * 80}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${160 + i * 80}ms`,
                }}>
                  <div className="text-2xl sm:text-3xl text-[#111] font-light tracking-tight">{stat.value}</div>
                  <div className="text-xs text-black/40 tracking-widest uppercase mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3" style={{
              opacity: heroReady ? 1 : 0, filter: heroReady ? "blur(0px)" : "blur(10px)",
              transform: heroReady ? "translateY(0px)" : "translateY(12px)",
              transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 400ms, filter 0.8s cubic-bezier(0.16,1,0.3,1) 400ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 400ms",
            }}>
              <Link to="/auth/signup" className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm text-white tracking-wide font-medium transition-all duration-200"
                style={{ background: PRIMARY }} onMouseEnter={e => (e.currentTarget.style.background = PRIMARY_HV)} onMouseLeave={e => (e.currentTarget.style.background = PRIMARY)}>
                Get Started Free
              </Link>
              <a href="#workflow" className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm text-black/60 tracking-wide border border-black/10 hover:border-black/20 hover:text-black hover:bg-black/[0.03] transition-all duration-200">
                See How It Works
              </a>
            </div>
          </div>
        </section>

        {/* ── PLATFORM ──────────────────────────────────────────────── */}
        <section id="platform" className="py-32 px-6 md:px-12 lg:px-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <PixelIcon type="platform" size={40} />
              <div className="mt-4"><Tag>PLATFORM</Tag></div>
              <RevealText className="mt-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05]">
                {"Everything your\nchurch needs."}
              </RevealText>
            </div>
            <div className="grid grid-cols-12 grid-rows-auto gap-3" onMouseMove={handleMouse}>
              {/* Big top card */}
              <BentoCard className="col-span-12 p-8 min-h-[200px] flex flex-col justify-between relative overflow-hidden" delay={0}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, hsl(261,66%,96%) 0%, hsl(261,50%,88%) 50%, transparent 100%)` }} />
                <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none" style={{ background: `linear-gradient(to left, hsl(261,66%,90%) 0%, transparent 100%)`, opacity: 0.4 }} />
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl border border-black/10 bg-white/60 flex items-center justify-center mb-6" style={{ backdropFilter: "blur(8px)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <h3 className="text-xl font-light mb-3">Member Management</h3>
                  <p className="text-sm text-black/45 leading-relaxed max-w-sm">Track every member's journey — profiles, families, groups, and pastoral notes all in one place.</p>
                </div>
              </BentoCard>
              {/* Bottom 3 cards */}
              {[
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, title: "Giving & Finance", desc: "Accept Mpesa offerings, record tithes, manage pledges, and run payroll — automated and accurate." },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M3 12h1m16 0h1M12 3v1m0 16v1M5.6 5.6l.7.7m11.4-.7-.7.7M5.6 18.4l.7-.7m11.4.7-.7-.7"/></svg>, title: "AI-Powered Tools", desc: "Sermon assistant, Bible study generator, pastoral letter writer, and children's lessons — built in." },
                { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, title: "Communications", desc: "Send announcements, bulk SMS, manage WhatsApp integration, and reach your whole congregation." },
              ].map((card, i) => (
                <BentoCard key={card.title} className="col-span-12 md:col-span-4 p-8 min-h-[200px]" delay={120 + i * 40}>
                  <div className="w-10 h-10 rounded-xl border border-black/10 flex items-center justify-center mb-5">{card.icon}</div>
                  <h3 className="text-lg font-light mb-2">{card.title}</h3>
                  <p className="text-sm text-black/45 leading-relaxed">{card.desc}</p>
                </BentoCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHURCH TOOLS (stacking cards) ─────────────────────────── */}
        <section id="features" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
              <div>
                <PixelIcon type="agents" size={40} />
                <div className="mt-4"><Tag>CHURCH TOOLS</Tag></div>
                <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                  {"Plug-and-play tools\nready to use."}
                </RevealText>
              </div>
              <p className="text-sm text-black/45 leading-relaxed max-w-xs">
                Start with pre-built church workflows or configure your own. Every tool is ready on day one.
              </p>
            </div>
            <StackingChurchCards />
          </div>
        </section>

        {/* ── WORKFLOW ──────────────────────────────────────────────── */}
        <section id="workflow" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06] overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <PixelIcon type="workflow" size={40} />
              <div className="mt-4"><Tag>WORKFLOW</Tag></div>
              <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                {"From signup to running\nchurch in minutes."}
              </RevealText>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3" onMouseMove={handleMouse}>
              {[
                { n: "01", title: "Create Your Account",     desc: "Sign up in 2 minutes. No credit card required. Free for up to 100 members.", color: "hsl(261,66%,33%)", delay: 0   },
                { n: "02", title: "Set Up Your Church",      desc: "Add your church details, invite staff, and configure your giving categories.", color: "hsl(200,70%,35%)", delay: 80  },
                { n: "03", title: "Invite Your Congregation",desc: "Share your church access code. Members join from their phones instantly.",     color: "hsl(16,78%,40%)",  delay: 140 },
                { n: "04", title: "Go Live",                  desc: "Start managing members, accepting Mpesa giving, and running services.",       color: "hsl(145,60%,30%)", delay: 200 },
              ].map((step) => (
                <BentoCard key={step.n} className="relative overflow-hidden flex flex-col min-h-[320px]" delay={step.delay}>
                  {/* Gradient image placeholder */}
                  <div className="absolute inset-x-0 top-0 h-56 pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}22 0%, ${step.color}44 60%, transparent 100%)`,
                      maskImage: "linear-gradient(to bottom, black 0%, black 30%, transparent 80%)",
                      WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 30%, transparent 80%)",
                    }}>
                    <div className="flex items-center justify-center w-full h-full" style={{ opacity: 0.25 }}>
                      <span className="font-mono font-bold text-[80px] text-black leading-none select-none">{step.n}</span>
                    </div>
                  </div>
                  <div className="relative z-10 p-7">
                    <span className="font-mono text-[11px] text-black/20 tracking-widest block">{step.n}</span>
                  </div>
                  <div className="relative z-10 px-7 pb-7 mt-auto pt-16">
                    <h3 className="text-2xl font-light mb-3">{step.title}</h3>
                    <p className="text-sm text-black/45 leading-relaxed">{step.desc}</p>
                  </div>
                </BentoCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── INTEGRATIONS ──────────────────────────────────────────── */}
        <section id="integrations" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
              <div>
                <PixelIcon type="integrations" size={40} />
                <div className="mt-4"><Tag>INTEGRATIONS</Tag></div>
                <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                  {"Connect your tools.\nControl your finances."}
                </RevealText>
              </div>
              <p className="text-sm text-black/45 leading-relaxed max-w-xs">
                Native Mpesa integration. WhatsApp messaging. AI content generation. Everything your church uses, connected in one place.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden border border-black/[0.07] flex flex-col md:block md:relative" onMouseMove={handleMouse}>
              {/* Architecture visual */}
              <div className="relative w-full h-[280px] md:h-[480px] shrink-0 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0f0722 0%, #1a0a3d 40%, #0a1628 70%, #0d1f0d 100%)" }}>
                {/* Decorative node network */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 480" fill="none" preserveAspectRatio="xMidYMid slice">
                  <circle cx="400" cy="240" r="40" fill="rgba(99,102,241,0.3)" />
                  <circle cx="400" cy="240" r="60" stroke="rgba(99,102,241,0.15)" strokeWidth="1" />
                  <circle cx="400" cy="240" r="100" stroke="rgba(99,102,241,0.08)" strokeWidth="1" />
                  {[[180,120],[620,120],[150,360],[650,360],[400,80],[400,400]].map(([x,y],i) => (
                    <g key={i}>
                      <line x1="400" y1="240" x2={x} y2={y} stroke="rgba(99,102,241,0.2)" strokeWidth="1" strokeDasharray="4 4" />
                      <circle cx={x} cy={y} r="20" fill="rgba(99,102,241,0.15)" />
                      <circle cx={x} cy={y} r="6" fill="rgba(99,102,241,0.6)" />
                    </g>
                  ))}
                  <circle cx="400" cy="240" r="12" fill="rgba(99,102,241,0.9)" />
                  <text x="400" y="244" fill="white" fontSize="8" textAnchor="middle" fontFamily="monospace">VH</text>
                  {[["Mpesa",180,128],["WhatsApp",620,128],["Members",150,368],["Reports",650,368],["AI Tools",400,88],["Members App",400,408]].map(([label,x,y]) => (
                    <text key={label as string} x={x as number} y={(y as number)+28} fill="rgba(255,255,255,0.4)" fontSize="7" textAnchor="middle" fontFamily="monospace">{label}</text>
                  ))}
                </svg>
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 60%, rgba(245,244,241,0.1) 100%)" }} />
              </div>
              {/* Glass cards overlay */}
              <div className="flex flex-col gap-3 p-4 md:absolute md:bottom-4 md:right-4 md:p-0 md:w-72">
                <div className="rounded-xl border border-white/50 p-6"
                  style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", background: "rgba(255,255,255,0.60)" }}>
                  <Tag>MPESA SDK</Tag>
                  <h3 className="mt-3 text-lg font-light mb-2">Accept Mpesa giving</h3>
                  <p className="text-xs text-black/45 leading-relaxed mb-4">Initiate STK Push directly from your giving page. Funds reconcile automatically.</p>
                  <div className="bg-black/[0.05] rounded-lg border border-black/[0.07] p-3 font-mono text-[11px] text-black/50 leading-relaxed">
                    <span className="text-black/25">{"// Mpesa giving"}</span><br />
                    <span className="text-blue-600/70">vestryHub</span>.giving.<span className="text-amber-700/70">initiate</span>{"({"}<br />
                    {"  "}<span className="text-amber-700/70">amount</span>: <span className="text-green-700/70">500</span>,<br />
                    {"  "}<span className="text-amber-700/70">phone</span>: <span className="text-green-700/70">&apos;0712345678&apos;</span>,<br />
                    {"  "}<span className="text-amber-700/70">category</span>: <span className="text-green-700/70">&apos;tithe&apos;</span><br />
                    {"})"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/50 p-6"
                  style={{ backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", background: "rgba(255,255,255,0.60)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                    <span className="text-xs text-black/40 tracking-widest">LIVE API</span>
                  </div>
                  <p className="text-sm text-black/45">Full REST API. Webhook callbacks. Build custom giving flows for your church.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECURITY ──────────────────────────────────────────────── */}
        <section id="security" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
          <div className="max-w-6xl mx-auto">
            <div className="mb-16">
              <PixelIcon type="platform" size={40} />
              <div className="mt-4"><Tag>SECURITY</Tag></div>
              <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                {"Church-grade security\nfrom day one."}
              </RevealText>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <p className="text-sm text-black/45 leading-relaxed">
                  Every transaction is logged, every giving record is traceable. Built for churches that need financial accountability.
                </p>
                <div className="space-y-4">
                  {[
                    { label: "Bank-Grade Encryption",    desc: "All member data and financial records encrypted at rest and in transit" },
                    { label: "Complete Giving Records",  desc: "Every offering, tithe, and pledge logged with full transaction history" },
                    { label: "Real-time Oversight",      desc: "Church admin monitors all activity with live dashboard and instant alerts" },
                  ].map((item) => (
                    <div key={item.label} className="flex gap-4">
                      <div className="w-1 rounded-full shrink-0" style={{ background: PRIMARY, opacity: 0.4 }} />
                      <div>
                        <h3 className="text-sm font-light mb-1">{item.label}</h3>
                        <p className="text-xs text-black/35">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 flex flex-col gap-2">
                  {["256-bit SSL","Mpesa Certified","99.9% Uptime","Data Stays Yours"].map((badge) => (
                    <div key={badge} className="flex items-center gap-2 text-xs text-black/25">
                      <span className="w-1 h-1 rounded-full bg-black/25" />
                      {badge}
                    </div>
                  ))}
                </div>
              </div>
              <BentoCard className="p-6" delay={0}>
                <div className="text-xs text-black/30 tracking-widest uppercase mb-4">Live Audit Trail</div>
                <AuditLog />
              </BentoCard>
            </div>
          </div>
        </section>

        {/* ── DEVEX / SETUP ─────────────────────────────────────────── */}
        <DevExSection />

        {/* ── MARQUEE ───────────────────────────────────────────────── */}
        <section className="py-0 border-t border-black/[0.06] overflow-hidden select-none">
          <div className="flex border-b border-black/[0.06]" style={{ animation: "marqueeLeft 28s linear infinite" }}>
            {[...Array(3)].map((_, rep) => (
              <div key={rep} className="flex shrink-0">
                {["Member Profiles","Mpesa Giving","Attendance","Sermon Notes","Pledge Campaigns","House Fellowships","Service Planning","AI Bible Study","Payroll","Visitor Tracking"].map((cap) => (
                  <div key={cap} className="flex items-center gap-6 px-10 py-5 border-r border-black/[0.06] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
                    <span className="text-sm text-black/45 whitespace-nowrap tracking-wide">{cap}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex" style={{ animation: "marqueeRight 22s linear infinite" }}>
            {[...Array(3)].map((_, rep) => (
              <div key={rep} className="flex shrink-0">
                {["Bulk Messaging","Facility Booking","Announcements","Discipleship Tracking","Children's Ministry","Fund Accounting","QR Codes","Giving Reports","WhatsApp Integration","Member App"].map((cap) => (
                  <div key={cap} className="flex items-center gap-6 px-10 py-5 border-r border-black/[0.06] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
                    <span className="text-sm text-black/30 whitespace-nowrap tracking-wide">{cap}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <style>{`
            @keyframes marqueeLeft  { from { transform:translateX(0); } to { transform:translateX(-33.333%); } }
            @keyframes marqueeRight { from { transform:translateX(-33.333%); } to { transform:translateX(0); } }
          `}</style>
        </section>

        {/* ── LIVE RIGHT NOW ────────────────────────────────────────── */}
        <section id="live" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                <PixelIcon type="agents" size={40} />
                <div className="mt-4"><Tag>LIVE RIGHT NOW</Tag></div>
                <RevealText className="mt-5 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05]">
                  {"Churches serving their\ncongregations, right now."}
                </RevealText>
                <p className="mt-6 text-base text-black/40 leading-relaxed max-w-sm">
                  At any moment, hundreds of churches are running giving, attendance, and communications on VestryHub — all from one dashboard.
                </p>
                <div className="mt-10 flex items-end gap-2">
                  <LiveChurchCounter />
                  <span className="text-black/30 text-sm mb-1 tracking-wide">churches active globally</span>
                </div>
              </div>
              <div className="relative">
                <LiveChurchFeed />
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────────── */}
        <section id="pricing" className="py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 flex flex-col items-center">
              <PixelIcon type="pricing" size={40} />
              <div className="mt-4"><Tag>PRICING</Tag></div>
              <RevealText className="mt-5 text-4xl md:text-5xl font-light tracking-tight leading-[1.05]">
                {"Simple pricing for every church."}
              </RevealText>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" onMouseMove={handleMouse}>
              {[
                {
                  name: "Starter", price: "Free", period: "", sub: "For small churches getting started",
                  features: ["Up to 100 members","1 branch","Manual giving records","Basic member profiles","Member portal"],
                  cta: "Get Started Free", href: "/auth/signup", highlight: false, delay: 0,
                },
                {
                  name: "Growth", price: "KSh 1,499", period: "/mo", sub: "For growing churches",
                  features: ["Up to 500 members","Mpesa online giving","AI tools (50 credits/mo)","Multiple branches","Pledge campaigns","Priority support"],
                  cta: "Start Growing", href: "/auth/signup", highlight: true, delay: 80,
                },
                {
                  name: "Enterprise", price: "Custom", period: "", sub: "For large congregations",
                  features: ["Unlimited members","Unlimited AI credits","Dedicated support","White-label options","API access","Custom integrations"],
                  cta: "Contact Us", href: "/auth/signup", highlight: false, delay: 140,
                },
              ].map((plan) => (
                <BentoCard key={plan.name} className={`p-8 flex flex-col ${plan.highlight ? "border-black/20" : ""}`}
                  style={{ ...(plan.highlight ? { background: "hsl(261,66%,97%)" } : {}) } as React.CSSProperties} delay={plan.delay}>
                  <div className="mb-8">
                    <div className="font-mono text-[11px] tracking-widest text-black/40 mb-4 uppercase">{plan.name}</div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-light">{plan.price}</span>
                      {plan.period && <span className="text-black/40 text-sm">{plan.period}</span>}
                    </div>
                    <p className="text-xs text-black/35 tracking-wide">{plan.sub}</p>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-black/55">
                        <div className="w-1 h-1 rounded-full bg-black/25 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.href} className={`w-full py-3 rounded-xl text-sm tracking-widest text-center transition-all duration-200 ${plan.highlight ? "text-white" : "border border-black/10 text-black/60 hover:border-black/25 hover:text-black hover:bg-black/[0.04]"}`}
                    style={plan.highlight ? { background: PRIMARY } : {}}
                    onMouseEnter={plan.highlight ? e => ((e.currentTarget as HTMLAnchorElement).style.background = PRIMARY_HV) : undefined}
                    onMouseLeave={plan.highlight ? e => ((e.currentTarget as HTMLAnchorElement).style.background = PRIMARY) : undefined}>
                    {plan.cta.toUpperCase()}
                  </Link>
                </BentoCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ────────────────────────────────────────────── */}
        <section className="relative py-32 px-6 md:px-12 lg:px-20 border-t border-black/[0.06] overflow-hidden">
          {/* Gradient visual background */}
          <div className="absolute bottom-0 left-0 w-full h-[70%] pointer-events-none select-none"
            style={{ background: `linear-gradient(to top, ${SITE_BG} 0%, transparent 60%), linear-gradient(135deg, hsl(261,66%,88%) 0%, hsl(16,78%,85%) 50%, hsl(200,70%,85%) 100%)`, opacity: 0.5 }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ maskImage: "linear-gradient(to top, transparent 0%, black 55%)", WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 55%)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${SITE_BG} 0%, rgba(245,244,241,0.92) 18%, rgba(245,244,241,0.55) 35%, transparent 55%)` }} />
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.05] mb-6">
              Start managing your<br />church better.
            </h2>
            <p className="text-sm text-black/45 leading-relaxed mb-10">
              Join hundreds of African churches already using VestryHub to serve their congregations better. Free to start. No credit card required.
            </p>
            <Link to="/auth/signup" className="inline-flex items-center justify-center px-10 py-4 rounded-xl text-sm text-white tracking-widest font-medium transition-all duration-200"
              style={{ background: PRIMARY }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = PRIMARY_HV)}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = PRIMARY)}>
              GET STARTED FREE
            </Link>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────── */}
        <footer className="py-10 px-6 md:px-12 lg:px-20 border-t border-black/[0.06]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <span className="font-mono text-xs tracking-[0.25em] text-black/50 uppercase">VESTRY HUB</span>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {[
                { label: "Platform",     href: "#platform"      },
                { label: "Features",     href: "#features"      },
                { label: "Workflow",     href: "#workflow"       },
                { label: "Integrations", href: "#integrations"  },
                { label: "Live",         href: "#live"           },
                { label: "Pricing",      href: "#pricing"        },
              ].map(l => (
                <a key={l.label} href={l.href} className="text-xs text-black/35 hover:text-black/70 transition-colors tracking-widest">{l.label}</a>
              ))}
            </div>
            <div className="flex items-center gap-6">
              {[
                { label: "Privacy",       href: "/privacy"   },
                { label: "Terms",         href: "/terms" },
                { label: "Help",          href: "#"                 },
                { label: "Member Portal", href: "/member/login"     },
              ].map(l => (
                l.href.startsWith("/")
                  ? <Link key={l.label} to={l.href} className="text-xs text-black/25 hover:text-black/55 transition-colors tracking-widest">{l.label}</Link>
                  : <a key={l.label} href={l.href} className="text-xs text-black/25 hover:text-black/55 transition-colors tracking-widest">{l.label}</a>
              ))}
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-black/[0.04]">
            <span className="text-xs text-black/20">© 2026 Vestry Hub. All rights reserved.</span>
          </div>
        </footer>

      </div>
    </>
  )
}
