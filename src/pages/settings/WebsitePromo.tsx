import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useChurch } from "@/contexts/ChurchContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe, Palette, Smartphone, Church, Search, CalendarDays,
  MessageCircle, Star,
} from "lucide-react";

export default function WebsitePromo() {
  const { name: churchName } = useChurch();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    contactName: "",
    churchName: churchName ?? "",
    email: "",
    phone: "",
    message: "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.contactName.trim() || !form.email.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    setSubmitting(true);
    // Simulate a brief delay then succeed
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
    setModalOpen(false);
    toast.success("Thanks! We'll reach out to you within 24 hours. 🙌");
    setForm({ contactName: "", churchName: churchName ?? "", email: "", phone: "", message: "" });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <>
      <Helmet><title>Website — Vestry</title></Helmet>

      <div className="max-w-2xl space-y-5">

        {/* ── Card 1: Promo ── */}
        <div
          className="rounded-xl p-6 space-y-5 shadow-sm border border-purple-100"
          style={{ background: "linear-gradient(135deg, #f0eeff 0%, #fff3ec 100%)" }}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 shadow-sm shrink-0">
              <Globe className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Church Website</h2>
              <p className="text-sm text-slate-500">Create and manage your church's public website</p>
            </div>
          </div>

          {/* Body */}
          <p className="text-sm text-slate-600 leading-relaxed">
            Get a professionally designed website tailored specifically for your church — built by the same team behind this software.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Palette,    label: "Custom Design" },
              { icon: Smartphone, label: "Mobile Friendly" },
              { icon: Church,     label: "Built for Churches" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl bg-white/60 border border-white/80 px-3 py-4 text-center shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                  <Icon className="h-4 w-4 text-orange-500" />
                </div>
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 rounded-full px-6 w-full sm:w-auto"
            onClick={() => setModalOpen(true)}
          >
            <Globe className="h-4 w-4" />
            Request a Free Consultation
          </Button>
        </div>

        {/* ── Card 2: Why a website matters ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800">Why your church needs a website</h3>
          <div className="space-y-4">
            {[
              {
                icon: Search,
                label: "Be Discoverable",
                desc: "Help new families find your church on Google and social media.",
              },
              {
                icon: CalendarDays,
                label: "Share What's Happening",
                desc: "Publish sermons, events, and announcements in one place.",
              },
              {
                icon: MessageCircle,
                label: "Build Your Community Online",
                desc: "Connect with members and visitors beyond Sunday service.",
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
                  <Icon className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Card 3: Testimonial ── */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 shadow-sm p-6 space-y-3">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-sm text-slate-600 italic leading-relaxed">
            "We had no idea how to get online. The team built us a beautiful site in days — our visitors doubled in 3 months."
          </p>
          <p className="text-xs font-semibold text-slate-500">— Pastor James, Grace Fellowship Church</p>
        </div>
      </div>

      {/* ── Consultation Modal ── */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Request a Free Consultation</DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Tell us a little about your church and we'll be in touch
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Contact Name</Label>
              <Input
                placeholder="Your name"
                value={form.contactName}
                onChange={e => set("contactName", e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Church Name</Label>
              <Input
                placeholder="Your church name"
                value={form.churchName}
                onChange={e => set("churchName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email Address</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={e => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Phone / WhatsApp Number</Label>
              <Input
                placeholder="+1 234 567 8900"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                placeholder="Tell us about your church and what you'd like on your website..."
                value={form.message}
                onChange={e => set("message", e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Request"}
            </Button>

            <div className="text-center space-y-1.5">
              <p className="text-xs text-slate-400">Or reach us directly:</p>
              <div className="flex flex-col items-center gap-1">
                <a
                  href="https://wa.me/254727748200"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-500 hover:underline"
                >
                  💬 Chat on WhatsApp: +254 727 748 200
                </a>
                <a
                  href="mailto:victornguyodev@gmail.com"
                  className="text-xs text-orange-500 hover:underline"
                >
                  ✉️ Email: victornguyodev@gmail.com
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
