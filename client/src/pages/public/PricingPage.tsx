import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { PublicLayout } from "@/components/public/PublicLayout";
import { AnimateOnScroll } from "@/components/public/AnimateOnScroll";
import { SectionHeading } from "@/components/public/SectionHeading";
import { CTABanner } from "@/components/public/CTABanner";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  ArrowRight,
  Calculator,
  Sparkles,
  X,
  QrCode,
  BarChart3,
  WifiOff,
  Smartphone,
  Shield,
  Users,
  Leaf,
  Camera,
  Megaphone,
  Star,
  MapPin,
  Languages,
  AlertTriangle,
  FileText,
  CreditCard,
  Mic,
  Truck,
  Settings,
  ClipboardList,
  UserPlus,
} from "lucide-react";

const css = `
  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  .float-gentle { animation: gentleFloat 6s ease-in-out infinite; }
`;

const RATE = 4;
const MIN_BILLING = 500;
const discounts: Record<string, { label: string; months: number; discount: number; badge?: string }> = {
  quarterly: { label: "Quarterly", months: 3, discount: 0 },
  halfYearly: { label: "Half-Yearly", months: 6, discount: 0.05 },
  annual: { label: "Annual", months: 12, discount: 0.1, badge: "BEST VALUE" },
};

const exampleCalcs = [
  { hh: 100, q: "₹1,500", h: "₹2,850", a: "₹5,400" },
  { hh: 250, q: "₹3,000", h: "₹5,700", a: "₹10,800" },
  { hh: 500, q: "₹6,000", h: "₹11,400", a: "₹21,600" },
  { hh: 1000, q: "₹12,000", h: "₹22,800", a: "₹43,200" },
  { hh: 5000, q: "₹60,000", h: "₹114,000", a: "₹216,000" },
];

const allFeatures = [
  { icon: QrCode, text: "QR-based household tracking" },
  { icon: Smartphone, text: "Door-to-door QR scan collection" },
  { icon: Star, text: "Segregation quality rating (1-5★)" },
  { icon: Camera, text: "Photo evidence capture" },
  { icon: Mic, text: "Voice note recording" },
  { icon: ClipboardList, text: "Observation checklist per visit" },
  { icon: AlertTriangle, text: "Not-collected reason tracking" },
  { icon: WifiOff, text: "Full offline mode + auto-sync" },
  { icon: Truck, text: "Vehicle session management" },
  { icon: AlertTriangle, text: "Needs-attention household flagging" },
  { icon: BarChart3, text: "Collector performance analytics" },
  { icon: BarChart3, text: "Ward-level segregation scoring" },
  { icon: Leaf, text: "Material log / facility processing" },
  { icon: Leaf, text: "Waste chain of custody tracking" },
  { icon: Camera, text: "Issue management with photo proof" },
  { icon: Megaphone, text: "Announcement broadcasting with photos" },
  { icon: Languages, text: "Multi-language UI (Kannada, Telugu, Tamil, Hindi, English)" },
  { icon: Smartphone, text: "Icon-based interface for all literacy levels" },
  { icon: FileText, text: "PDF report export" },
  { icon: MapPin, text: "GPS location capture per collection" },
  { icon: QrCode, text: "QR batch generation for field mapping" },
  { icon: Settings, text: "Configurable village settings" },
  { icon: Users, text: "Multi-role hierarchy (5 roles)" },
  { icon: UserPlus, text: "Household feedback to collector" },
  { icon: Shield, text: "Moderator multi-village oversight" },
  { icon: CreditCard, text: "Payment & billing management" },
  { icon: ClipboardList, text: "Attendance & shift tracking" },
  { icon: Users, text: "Helpers & segregator staff management" },
  { icon: Shield, text: "Activity log & audit trail" },
  { icon: FileText, text: "CSV & branded PDF data export" },
  { icon: Sparkles, text: "Dedicated onboarding & email support" },
];

export default function PricingPage() {
  const [, setLocation] = useLocation();

  useSEO({
    title: "Pricing - GreenPath",
    description: "₹4/household/month. All features included. No per-user fees. No hidden costs. Transparent pricing for waste management - from panchayats to municipalities.",
    path: "/pricing",
  });
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [showCalculator, setShowCalculator] = useState(false);
  const [households, setHouseholds] = useState(500);

  const plan = discounts[selectedPlan];
  const monthlyTotal = Math.max(households * RATE, MIN_BILLING);
  const periodTotal = Math.round(monthlyTotal * plan.months * (1 - plan.discount));

  return (
    <PublicLayout>
      <style>{css}</style>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-50 to-emerald-50/30 py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <AnimateOnScroll>
              <div>
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  PRICING
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6">
                  Simple,{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    transparent
                  </span>{" "}
                  pricing
                </h1>
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-6">
                  One plan. All features. Pay only for what you use.
                  No per-user fees. No hidden costs.
                </p>
                <p className="text-base text-slate-600 leading-relaxed mb-4">
                  We believe waste management technology should be accessible to
                  every community - not just well-funded municipalities. That's why
                  GreenPath is priced per household per month.
                </p>
                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed">
                  <strong className="text-slate-700">Important:</strong> GreenPath provides digital infrastructure.
                  Field operations are managed locally. Subscription pricing may be revised over time;
                  any changes apply only to new plans or renewals and are communicated in advance.
                </p>
              </div>
            </AnimateOnScroll>

            {/* Hero illustration */}
            <AnimateOnScroll delay={200} className="hidden lg:block">
              <div className="relative float-gentle">
                <img
                  src="/images/illustrations/platform-household.png"
                  alt="Household with QR-based digital identity"
                  className="w-full max-w-[500px] mx-auto h-auto"
                  style={{ filter: "drop-shadow(0 20px 40px rgba(5,150,105,0.12))" }}
                />
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* PRICING CARD */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="bg-white rounded-3xl border-2 border-emerald-200 shadow-2xl shadow-emerald-100/50 p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />

              <div className="mb-8">
                <div className="text-6xl md:text-7xl font-extrabold text-slate-900 mb-2">
                  ₹4<span className="text-2xl md:text-3xl font-semibold text-slate-400">/household/month</span>
                </div>
                <p className="text-slate-500">
                  All features included · No hidden costs · No per-user fees
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Minimum billing: ₹500/month (covers up to 125 households)
                </p>
              </div>

              {/* Billing cycles */}
              <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
                {Object.entries(discounts).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`relative p-5 rounded-2xl border-2 transition-all duration-200 ${selectedPlan === key
                      ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                      : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                  >
                    {p.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                        {p.badge}
                      </span>
                    )}
                    <div className="text-base font-semibold text-slate-900 mb-1">
                      {p.label}
                    </div>
                    <div className="text-sm text-slate-500">
                      {p.discount > 0 ? `${p.discount * 100}% discount` : "Standard rate"}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setShowCalculator(true)}
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-xl"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate your cost
              </Button>
            </div>
          </AnimateOnScroll>

          {/* Calculator modal */}
          {showCalculator && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200">
                <button
                  onClick={() => setShowCalculator(false)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-slate-900 mb-6">Cost Calculator</h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Number of Households
                    </label>
                    <input
                      type="number"
                      value={households}
                      onChange={(e) => setHouseholds(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                    <input
                      type="range"
                      min={50}
                      max={10000}
                      step={50}
                      value={households}
                      onChange={(e) => setHouseholds(parseInt(e.target.value))}
                      className="w-full mt-3 accent-emerald-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>50</span>
                      <span>10,000</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 rounded-2xl p-6">
                    <div className="text-sm text-emerald-600 font-medium mb-2">
                      {plan.label} ({plan.months} months{plan.discount > 0 ? `, ${plan.discount * 100}% off` : ""})
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">
                      ₹{periodTotal.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      ₹{monthlyTotal.toLocaleString()}/month × {plan.months} months
                      {plan.discount > 0 ? ` − ${plan.discount * 100}%` : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ALL FEATURES */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            {/* FUTURE: original subtitle was "...From QR tracking to compliance reports - it's all included." - compliance report templates not yet built */}
            <SectionHeading
              label="EVERYTHING INCLUDED"
              title="No feature gates. No surprises."
              subtitle="Every plan includes every feature. From QR tracking to audit trails - it's all included."
            />
          </AnimateOnScroll>

          {/* Feature illustration strip */}
          <AnimateOnScroll delay={100}>
            <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              {[
                { img: "/images/illustrations/platform-collector.png", label: "Collector App" },
                { img: "/images/illustrations/platform-dashboard.png", label: "Manager Dashboard" },
                { img: "/images/illustrations/offline-sync.png", label: "Offline-First" },
              ].map((v) => (
                <div key={v.label} className="bg-gradient-to-br from-emerald-50 to-teal-50/40 rounded-2xl p-5 flex flex-col items-center gap-3">
                  <img
                    src={v.img}
                    alt={v.label}
                    className="w-full max-w-[200px] h-auto"
                    style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.05))" }}
                  />
                  <span className="text-sm font-semibold text-slate-700">{v.label}</span>
                </div>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {allFeatures.map((f) => (
                <div key={f.text} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:shadow-md transition-all duration-200">
                  <f.icon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{f.text}</span>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ENTERPRISE */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="relative bg-gradient-to-br from-slate-900 to-emerald-950 rounded-3xl p-8 md:p-12 text-center overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Managing 10,000+ households?
                </h2>
                <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                  Contact us for volume pricing, dedicated onboarding support,
                  and multi-location deployments.
                </p>
                <Button
                  onClick={() => setLocation("/contact")}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Contact Sales
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      <CTABanner
        heading="Ready to get started?"
        primaryLabel="Request Demo"
        secondaryLabel="Contact Sales"
        secondaryHref="/contact"
      />
    </PublicLayout>
  );
}
