import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe, Palette, Smartphone, Church, Search, CalendarDays,
  MessageCircle, Star,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Review {
  id: string;
  church_name: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
  tenant_id: string;
}

// ─── Star picker ──────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="focus:outline-none"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Star display ─────────────────────────────────────────────────────────────
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WebsitePromo() {
  const { tenantId, name: churchName, userFirstName, userLastName } = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');

  // Consultation modal
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultForm, setConsultForm] = useState({
    contactName: `${userFirstName ?? ""} ${userLastName ?? ""}`.trim(),
    churchName: churchName ?? "",
    email: "",
    phone: "",
    message: "",
  });
  const [consultSubmitting, setConsultSubmitting] = useState(false);

  // Review form
  const [reviewerName, setReviewerName] = useState(`${userFirstName ?? ""} ${userLastName ?? ""}`.trim());
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const setConsult = (k: keyof typeof consultForm, v: string) =>
    setConsultForm(prev => ({ ...prev, [k]: v }));

  // Fetch all reviews (cross-tenant)
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["website-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.WEBSITE_REVIEWS)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
    staleTime: 60_000,
  });

  // Check if this tenant already left a review
  const myReview = reviews.find(r => r.tenant_id === tenantId);

  // Submit consultation
  const handleConsultSubmit = async () => {
    if (readOnly) return;
    if (!consultForm.contactName.trim() || !consultForm.email.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    setConsultSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("website-consultation", {
        body: {
          tenantId,
          contactName: consultForm.contactName,
          churchName: consultForm.churchName,
          email: consultForm.email,
          phone: consultForm.phone,
          message: consultForm.message,
        },
      });
      if (error) throw error;
      setConsultOpen(false);
      toast.success("Thanks! We'll reach out to you within 24 hours. 🙌");
      setConsultForm({
        contactName: `${userFirstName ?? ""} ${userLastName ?? ""}`.trim(),
        churchName: churchName ?? "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to send. Please try WhatsApp or email directly.");
    } finally {
      setConsultSubmitting(false);
    }
  };

  // Submit review
  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (readOnly) return;
      if (!reviewerName.trim()) throw new Error("Please enter your name.");
      if (rating === 0) throw new Error("Please select a star rating.");
      if (!reviewText.trim()) throw new Error("Please write a review.");
      const { error } = await supabase.from(TABLES.WEBSITE_REVIEWS).insert({
        tenant_id: tenantId,
        church_name: churchName ?? "Unknown Church",
        reviewer_name: reviewerName.trim(),
        rating,
        review_text: reviewText.trim(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["website-reviews"] });
      toast.success("Thank you for your review! 🌟");
      setReviewText("");
      setRating(0);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Helmet><title>Website — Vestry</title></Helmet>

      <div className="max-w-2xl space-y-5">

        {/* ── Card 1: Promo ── */}
        <div
          className="rounded-xl p-6 space-y-5 shadow-sm border border-purple-100"
          style={{ background: "linear-gradient(135deg, #f0eeff 0%, #fff3ec 100%)" }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 shadow-sm shrink-0">
              <Globe className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Church Website</h2>
              <p className="text-sm text-slate-500">Create and manage your church's public website</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Get a professionally designed website tailored specifically for your church — built by the same <strong>developer</strong> behind this software.
          </p>

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

          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 rounded-full px-6 w-full sm:w-auto"
            onClick={() => setConsultOpen(true)}
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
              { icon: Search,       label: "Be Discoverable",          desc: "Help new families find your church on Google and social media." },
              { icon: CalendarDays, label: "Share What's Happening",   desc: "Publish sermons, events, and announcements in one place." },
              { icon: MessageCircle,label: "Build Your Community Online", desc: "Connect with members and visitors beyond Sunday service." },
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

        {/* ── Card 3: Leave a Review ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Leave a Review</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              After we build your professional website, kindly leave a review and a rating on how the website feels and looks.
            </p>
          </div>

          {myReview ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 space-y-1">
              <p className="text-sm font-medium text-emerald-700">You've already left a review — thank you! 🌟</p>
              <StarDisplay rating={myReview.rating} />
              <p className="text-xs text-slate-600 italic">"{myReview.review_text}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Your Name</Label>
                <Input
                  placeholder="Your name"
                  value={reviewerName}
                  onChange={e => setReviewerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Rating</Label>
                <StarPicker value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="text-xs text-slate-400">
                    {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Your Review</Label>
                <Textarea
                  placeholder="Tell us how your website looks and feels..."
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                size="sm"
                onClick={() => reviewMutation.mutate()}
                disabled={reviewMutation.isPending}
              >
                <Star className="h-4 w-4" />
                {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          )}
        </div>

        {/* ── Card 4: All Reviews (real-time, cross-tenant) ── */}
        {(reviewsLoading || reviews.length > 0) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">What Churches Are Saying</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real reviews from churches we've built websites for</p>
            </div>

            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{r.reviewer_name}</p>
                        <p className="text-xs text-slate-400">{r.church_name}</p>
                      </div>
                      <div className="text-right">
                        <StarDisplay rating={r.rating} />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {format(new Date(r.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic">"{r.review_text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Consultation Modal ── */}
      <Dialog open={consultOpen} onOpenChange={v => !v && setConsultOpen(false)}>
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
              <Input placeholder="Your name" value={consultForm.contactName} onChange={e => setConsult("contactName", e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Church Name</Label>
              <Input placeholder="Your church name" value={consultForm.churchName} onChange={e => setConsult("churchName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email Address</Label>
              <Input type="email" placeholder="your@email.com" value={consultForm.email} onChange={e => setConsult("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Phone / WhatsApp Number</Label>
              <Input placeholder="+1 234 567 8900" value={consultForm.phone} onChange={e => setConsult("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                placeholder="Tell us about your church and what you'd like on your website..."
                value={consultForm.message}
                onChange={e => setConsult("message", e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full"
              onClick={handleConsultSubmit}
              disabled={consultSubmitting}
            >
              {consultSubmitting ? "Sending..." : "Send Request"}
            </Button>
            <div className="text-center space-y-1.5">
              <p className="text-xs text-slate-400">Or reach us directly:</p>
              <div className="flex flex-col items-center gap-1">
                <a href="https://wa.me/254727748200" target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline">
                  💬 Chat on WhatsApp: +254 727 748 200
                </a>
                <a href="mailto:victornguyodev@gmail.com" className="text-xs text-orange-500 hover:underline">
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
