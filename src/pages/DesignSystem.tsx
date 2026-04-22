/**
 * Design System Reference Page — DEV ONLY
 * Route: /design-system
 * Not shown in production nav. Used to visually verify all components.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/ui/PageTransition";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSkeleton, StatCardSkeletons } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, TrendingUp, CalendarDays, UsersRound, Bell, CreditCard,
  CheckCircle, AlertTriangle, Info, XCircle, Plus, Trash2,
  Mail, Phone, MapPin, Settings, Layers, Zap, Heart,
} from "lucide-react";
import { getAvatarGradient, getInitials, CLASSES } from "@/lib/design-system";
import { cn } from "@/lib/utils";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800 font-jakarta">{title}</h2>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {children}
    </section>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────
function Swatch({ bg, label, hex }: { bg: string; label: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn("h-12 w-full rounded-lg border border-slate-200", bg)} />
      <p className="text-xs font-medium text-slate-700 font-jakarta">{label}</p>
      <p className="text-[10px] text-slate-400 font-mono">{hex}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DesignSystem() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destructiveOpen, setDestructiveOpen] = useState(false);

  const names = ["Alice Johnson", "Bob Kamau", "Carol Mwangi", "David Osei", "Eve Njeri", "Frank Otieno"];

  return (
    <>
      <Helmet><title>Design System — Vestry Hub</title></Helmet>
      <PageTransition>
        <div className="min-h-screen bg-slate-50 font-jakarta">
          <div className="max-w-5xl mx-auto px-6 py-8 space-y-12">

            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">Vestry Hub</p>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Design System</h1>
              <p className="text-orange-100 text-base">
                Visual reference for all UI components, tokens, and patterns.
                Dev only — not shown in production nav.
              </p>
            </div>

            {/* ── Typography ─────────────────────────────────────────────── */}
            <Section title="Typography">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Display — 36px / 700</p>
                  <p className="text-4xl font-bold tracking-tight text-slate-900">The quick brown fox</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">H1 — 30px / 700</p>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">The quick brown fox</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">H2 — 24px / 600</p>
                  <p className="text-2xl font-semibold tracking-tight text-slate-900">The quick brown fox</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">H3 — 20px / 600</p>
                  <p className="text-xl font-semibold text-slate-900">The quick brown fox</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">H4 — 16px / 600</p>
                  <p className="text-base font-semibold text-slate-900">The quick brown fox</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Body — 14px / 400</p>
                  <p className="text-sm text-slate-700 leading-relaxed">The quick brown fox jumps over the lazy dog. Plus Jakarta Sans is the primary typeface for all UI text in Vestry Hub.</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Caption — 12px / 400</p>
                  <p className="text-xs text-slate-500">Timestamps, metadata, helper text</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Label — 12px / 500 / uppercase</p>
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Section Label</p>
                </div>
              </div>
            </Section>

            {/* ── Color Palette ───────────────────────────────────────────── */}
            <Section title="Color Palette">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Primary — Orange</p>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {[
                      { bg: "bg-[#fff7ed]", label: "50",  hex: "#fff7ed" },
                      { bg: "bg-[#ffedd5]", label: "100", hex: "#ffedd5" },
                      { bg: "bg-[#fed7aa]", label: "200", hex: "#fed7aa" },
                      { bg: "bg-[#fdba74]", label: "300", hex: "#fdba74" },
                      { bg: "bg-[#fb923c]", label: "400", hex: "#fb923c" },
                      { bg: "bg-[#f97316]", label: "500 ★", hex: "#f97316" },
                      { bg: "bg-[#ea6c0a]", label: "600", hex: "#ea6c0a" },
                      { bg: "bg-[#c2570a]", label: "700", hex: "#c2570a" },
                      { bg: "bg-[#9a3f0b]", label: "800", hex: "#9a3f0b" },
                      { bg: "bg-[#7c330c]", label: "900", hex: "#7c330c" },
                    ].map(s => <Swatch key={s.label} {...s} />)}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Semantic</p>
                  <div className="grid grid-cols-4 gap-3">
                    <Swatch bg="bg-emerald-500" label="Success" hex="#22c55e" />
                    <Swatch bg="bg-amber-500"   label="Warning" hex="#f59e0b" />
                    <Swatch bg="bg-red-500"     label="Error"   hex="#ef4444" />
                    <Swatch bg="bg-blue-500"    label="Info"    hex="#3b82f6" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Neutral — Slate</p>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {[50,100,200,300,400,500,600,700,800,900].map(n => (
                      <Swatch key={n} bg={`bg-slate-${n}`} label={String(n)} hex={`slate-${n}`} />
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Stat Cards ──────────────────────────────────────────────── */}
            <Section title="Stat Cards">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users}       label="Total Members"     value={248}   color="orange"  trend="up"      trendValue="+12%" />
                <StatCard icon={TrendingUp}  label="Giving This Month" value={84500} color="emerald" trend="up"      trendValue="+8%" />
                <StatCard icon={CalendarDays} label="Upcoming Events"  value={7}     color="blue"    trend="neutral" trendValue="same" />
                <StatCard icon={UsersRound}  label="Active Groups"     value={14}    color="purple"  trend="down"    trendValue="-2%" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Bell}        label="Notifications"     value={3}     color="amber"   />
                <StatCard icon={CreditCard}  label="Pledges"           value={12}    color="red"     />
                <StatCard icon={Heart}       label="Volunteers"        value={31}    color="orange"  sublabel="Active this month" />
                <StatCard icon={Zap}         label="Automations"       value={5}     color="slate"   />
              </div>
            </Section>

            {/* ── Buttons ─────────────────────────────────────────────────── */}
            <Section title="Buttons">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Variants</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className={CLASSES.btnPrimary}>Primary</Button>
                    <Button variant="outline" className={CLASSES.btnOutline}>Outline</Button>
                    <Button variant="ghost" className={CLASSES.btnGhost}>Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button disabled className={CLASSES.btnPrimary}>Disabled</Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Sizes</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm" className={CLASSES.btnPrimary}>Small</Button>
                    <Button className={CLASSES.btnPrimary}>Default</Button>
                    <Button size="lg" className={CLASSES.btnPrimary}>Large</Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">With Icons</p>
                  <div className="flex flex-wrap gap-3">
                    <Button className={CLASSES.btnPrimary}><Plus className="h-4 w-4 mr-1.5" />Add Member</Button>
                    <Button variant="outline" className={CLASSES.btnOutline}><Settings className="h-4 w-4 mr-1.5" />Settings</Button>
                    <Button variant="destructive"><Trash2 className="h-4 w-4 mr-1.5" />Delete</Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Motion (tap to test)</p>
                  <div className="flex flex-wrap gap-3">
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button className={CLASSES.btnPrimary}>Tap Me</Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Badges ──────────────────────────────────────────────────── */}
            <Section title="Badges / Pills">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-wrap gap-2">
                  <span className={CLASSES.badgeSuccess}>Success</span>
                  <span className={CLASSES.badgeWarning}>Warning</span>
                  <span className={CLASSES.badgeError}>Error</span>
                  <span className={CLASSES.badgeInfo}>Info</span>
                  <span className={CLASSES.badgePrimary}>Primary</span>
                  <span className={CLASSES.badgeNeutral}>Neutral</span>
                  <span className={CLASSES.badgePurple}>Purple</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Pending Approval</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">Inactive</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Visitor</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">New Convert</span>
                </div>
              </div>
            </Section>

            {/* ── Inputs ──────────────────────────────────────────────────── */}
            <Section title="Form Inputs">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className={CLASSES.inputLabel}>Default Input</label>
                  <Input className={CLASSES.input} placeholder="Enter value..." />
                </div>
                <div className="space-y-1.5">
                  <label className={CLASSES.inputLabel}>With Icon</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className={cn(CLASSES.input, "pl-9")} placeholder="you@example.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={CLASSES.inputLabel}>Error State</label>
                  <Input className="h-10 border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 font-jakarta text-sm" placeholder="Invalid value" />
                  <p className="text-xs text-red-500">This field is required</p>
                </div>
                <div className="space-y-1.5">
                  <label className={CLASSES.inputLabel}>Disabled</label>
                  <Input className={CLASSES.input} placeholder="Disabled" disabled />
                </div>
              </div>
            </Section>

            {/* ── Avatars ─────────────────────────────────────────────────── */}
            <Section title="Avatars">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Gradient Initials (by first letter)</p>
                  <div className="flex flex-wrap gap-3">
                    {names.map(name => {
                      const grad = getAvatarGradient(name);
                      const ini = getInitials(name.split(" ")[0], name.split(" ")[1]);
                      return (
                        <div key={name} className="flex flex-col items-center gap-1.5">
                          <div className={cn("h-12 w-12 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shadow-sm", grad)}>
                            {ini}
                          </div>
                          <p className="text-xs text-slate-500">{name.split(" ")[0]}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Sizes</p>
                  <div className="flex items-end gap-4">
                    {[
                      { size: "h-6 w-6 text-[10px]", label: "XS" },
                      { size: "h-8 w-8 text-xs",     label: "SM" },
                      { size: "h-10 w-10 text-sm",   label: "MD" },
                      { size: "h-12 w-12 text-base", label: "LG" },
                      { size: "h-16 w-16 text-xl",   label: "XL" },
                    ].map(({ size, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1.5">
                        <div className={cn("rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold", size)}>
                          JD
                        </div>
                        <p className="text-xs text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* ── Cards ───────────────────────────────────────────────────── */}
            <Section title="Cards">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={CLASSES.card}>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Base Card</p>
                  <p className="text-xs text-slate-500">bg-white, rounded-xl, border-slate-200, shadow-sm, p-6</p>
                </div>
                <div className={CLASSES.cardCompact}>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Compact Card</p>
                  <p className="text-xs text-slate-500">Same as base but p-5</p>
                </div>
                <motion.div
                  whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.1)" }}
                  transition={{ duration: 0.2 }}
                  className={cn(CLASSES.card, "cursor-pointer")}
                >
                  <p className="text-sm font-semibold text-slate-800 mb-1">Interactive Card</p>
                  <p className="text-xs text-slate-500">Hover me — lifts with shadow</p>
                </motion.div>
              </div>
            </Section>

            {/* ── Empty States ────────────────────────────────────────────── */}
            <Section title="Empty States">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <EmptyState
                    icon={Users}
                    title="No members yet"
                    description="Add your first member to get started managing your congregation."
                    action={
                      <Button size="sm" className={CLASSES.btnPrimary}>
                        <Plus className="h-4 w-4 mr-1.5" />Add Member
                      </Button>
                    }
                  />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <EmptyState
                    icon={CalendarDays}
                    title="No upcoming events"
                    description="Create your first event to see it here."
                    action={
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1.5" />Create Event
                      </Button>
                    }
                  />
                </div>
              </div>
            </Section>

            {/* ── Loading Skeletons ────────────────────────────────────────── */}
            <Section title="Loading Skeletons">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Stat Cards</p>
                <StatCardSkeletons count={4} />

                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-6">Table</p>
                <LoadingSkeleton variant="table" count={4} />

                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-6">List</p>
                <LoadingSkeleton variant="list" count={3} />

                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-6">Page Header</p>
                <LoadingSkeleton variant="page-header" />

                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-6">Form</p>
                <div className="max-w-md">
                  <LoadingSkeleton variant="form" count={3} />
                </div>
              </div>
            </Section>

            {/* ── Confirm Dialogs ──────────────────────────────────────────── */}
            <Section title="Confirm Dialogs">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-wrap gap-3">
                <Button className={CLASSES.btnPrimary} onClick={() => setConfirmOpen(true)}>
                  Open Confirm Dialog
                </Button>
                <Button variant="destructive" onClick={() => setDestructiveOpen(true)}>
                  Open Destructive Dialog
                </Button>
              </div>
              <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Confirm Action"
                description="Are you sure you want to proceed? This will apply the changes immediately."
                confirmLabel="Yes, Proceed"
                onConfirm={() => setConfirmOpen(false)}
              />
              <ConfirmDialog
                open={destructiveOpen}
                onOpenChange={setDestructiveOpen}
                title="Delete Member?"
                description="This will permanently remove the member and all their data. This action cannot be undone."
                confirmLabel="Delete"
                destructive
                onConfirm={() => setDestructiveOpen(false)}
              />
            </Section>

            {/* ── Shadows ─────────────────────────────────────────────────── */}
            <Section title="Shadows">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { label: "xs",  cls: "shadow-[0_1px_2px_rgba(0,0,0,0.05)]" },
                  { label: "sm",  cls: "shadow-sm" },
                  { label: "md",  cls: "shadow-md" },
                  { label: "lg",  cls: "shadow-lg" },
                  { label: "xl",  cls: "shadow-xl" },
                ].map(s => (
                  <div key={s.label} className={cn("bg-white rounded-xl p-5 flex items-center justify-center", s.cls)}>
                    <p className="text-sm font-semibold text-slate-700 font-jakarta">shadow-{s.label}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Spacing ─────────────────────────────────────────────────── */}
            <Section title="Spacing Scale">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-2">
                {[1,2,3,4,5,6,8,10,12,16].map(n => (
                  <div key={n} className="flex items-center gap-4">
                    <p className="text-xs font-mono text-slate-400 w-8">p-{n}</p>
                    <div className="bg-orange-400 rounded" style={{ width: `${n * 4}px`, height: "16px" }} />
                    <p className="text-xs text-slate-500">{n * 4}px</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Border Radius ────────────────────────────────────────────── */}
            <Section title="Border Radius">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: "rounded-md",   cls: "rounded-md",   desc: "8px — buttons, inputs" },
                    { label: "rounded-xl",   cls: "rounded-xl",   desc: "12px — cards" },
                    { label: "rounded-2xl",  cls: "rounded-2xl",  desc: "16px — large cards" },
                    { label: "rounded-full", cls: "rounded-full", desc: "pill — avatars, badges" },
                  ].map(r => (
                    <div key={r.label} className="flex flex-col items-center gap-2">
                      <div className={cn("h-16 w-24 bg-orange-100 border-2 border-orange-300", r.cls)} />
                      <p className="text-xs font-mono text-slate-600">{r.label}</p>
                      <p className="text-[10px] text-slate-400 text-center max-w-[96px]">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── Page Header ──────────────────────────────────────────────── */}
            <Section title="Page Header">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <PageHeader
                  title="Example Page Title"
                  subtitle="This is the standard page header used across all pages in Vestry Hub."
                  actions={
                    <>
                      <Button variant="outline" size="sm">Export</Button>
                      <Button size="sm" className={CLASSES.btnPrimary}>
                        <Plus className="h-4 w-4 mr-1.5" />Add Item
                      </Button>
                    </>
                  }
                />
                <p className="text-xs text-slate-400 mt-2">↑ PageHeader component rendered above</p>
              </div>
            </Section>

            {/* Footer */}
            <div className="text-center py-8 text-xs text-slate-400 font-jakarta">
              Vestry Hub Design System · Dev only · Not shown in production nav
            </div>

          </div>
        </div>
      </PageTransition>
    </>
  );
}
