import { PublicLayout } from "@/components/public/PublicLayout";
import { useSEO } from "@/hooks/useSEO";
import { AnimateOnScroll } from "@/components/public/AnimateOnScroll";
import { SectionHeading } from "@/components/public/SectionHeading";
import { StatsCounter } from "@/components/public/StatsCounter";
import { CTABanner } from "@/components/public/CTABanner";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ArrowRight,
  Building2,
  Users,
  QrCode,
  UserPlus,
  ScanLine,
  Activity,
  PieChart,
  Eye,
  FileCheck,
  ClipboardCheck,
  BadgeCheck,
  X,
  Quote,
  ExternalLink,
  CheckCircle2,
  BellRing,
} from "lucide-react";

const css = `
  @keyframes heroFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-16px); }
  }
  @keyframes slowPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .float-slow  { animation: heroFloat 6s ease-in-out infinite; }
  .float-med   { animation: heroFloat 5s ease-in-out 1s infinite; }
  .float-fast   { animation: heroFloat 4s ease-in-out 2s infinite; }
`;

export default function HomePage() {
  const [, setLocation] = useLocation();

  useSEO({
    title: "GreenPath - Waste Collection Management Platform",
    description: "Digital waste management for communities. QR-based household tracking, offline-first collection, real-time analytics, and governance - from doorstep to processing.",
    path: "/",
  });

  return (
    <PublicLayout>
      <style>{css}</style>

      {/* HERO */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-emerald-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-100/30 rounded-full blur-[80px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <AnimateOnScroll>
                {/* <div className="inline-flex items-center gap-2 bg-emerald-100/80 backdrop-blur-sm text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-emerald-200/50">
                  <BadgeCheck className="w-4 h-4" />
                  Serving 2,000+ households across 3 communities
                </div> */}
                <div className="inline-flex items-center gap-2 bg-emerald-100/80 backdrop-blur-sm text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-emerald-200/50">
                  <BadgeCheck className="w-4 h-4" />
                  Tracking 2,000+ households across 3 communities
                </div>
              </AnimateOnScroll>

              <AnimateOnScroll delay={100}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6">
                  The Digital Backbone for{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    Door-to-Door
                  </span>{" "}
                  Waste Collection
                </h1>
              </AnimateOnScroll>

              <AnimateOnScroll delay={200}>
                {/* <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
                  Digitize your door-to-door waste collection. Track every
                  pickup with QR codes. Identify households that need follow-up.
                  Build transparency across managers, collectors, and citizens.
                </p> */}
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl">
                  GreenPath introduced household-level digital traceability into decentralized waste workflows, enabling supervisors to identify service gaps and drive accountability-based follow-ups.
                </p>
              </AnimateOnScroll>

              <AnimateOnScroll delay={300}>
                <div className="flex flex-col sm:flex-row gap-4 mb-10">
                  <Button
                    onClick={() => setLocation("/contact")}
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-700/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Request Demo <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={() => setLocation("/product")}
                    variant="outline"
                    size="lg"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-8 py-6 text-base rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Explore Platform
                  </Button>
                </div>
              </AnimateOnScroll>

              <AnimateOnScroll delay={400}>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { val: "2,000+", label: "Households" },
                    { val: "3+", label: "Communities" },
                    /* { val: "95%", label: "Segregation Rate" }, */
                    { val: "Tracked", label: "Segregation Quality" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-xl md:text-2xl font-extrabold text-slate-900">{s.val}</div>
                      <div className="text-xs text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              </AnimateOnScroll>
            </div>

            {/* HERO ILLUSTRATION - LARGE, dominates */}
            <AnimateOnScroll delay={150} className="relative">
              <div className="relative float-slow">
                <img
                  src="/images/hero/hero-main.png"
                  alt="GreenPath - Smart Waste Management Ecosystem"
                  className="w-full h-auto max-w-[600px] mx-auto lg:max-w-none"
                  style={{ filter: "drop-shadow(0 25px 50px rgba(5,150,105,0.15))" }}
                />
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* TRUST LOGOS + TAM STRIP */}
      <section className="py-8 border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            {/* 
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trusted by</span>
                <div className="flex items-center gap-6">
                  {[
                    { name: "Azim Premji University", initial: "APU", color: "bg-blue-600" },
                    { name: "Hasiru Dala", initial: "HD", color: "bg-emerald-600" },
                    { name: "Billapura Gram Panchayat", initial: "BGP", color: "bg-teal-600" },
                  ].map((org) => (
                    <div key={org.name} className="flex items-center gap-2 group" title={org.name}>
                      <div className={`w-8 h-8 rounded-lg ${org.color} flex items-center justify-center shadow-sm`}>
                        <span className="text-[10px] font-bold text-white">{org.initial}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-600 hidden sm:inline">{org.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {["Municipalities", "Panchayats", "Apartments", "Townships", "Bulk Generators"].map((seg) => (
                  <span key={seg} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium rounded-full">
                    {seg}
                  </span>
                ))}
              </div>
            </div>
            */}
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Developed during field engagement within a decentralized rural sustainability initiative</span>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* THE CHALLENGE */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="THE CHALLENGE"
              title="The gap between collection and accountability"
              subtitle="Without digital tracking, neither governments nor citizens have visibility into how waste is actually managed."
            />
          </AnimateOnScroll>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <AnimateOnScroll delay={100}>
              <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-100">
                <div className="relative bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-8 flex items-center justify-center">
                  <img
                    src="/images/illustrations/problem-govt.png"
                    alt="Government waste management challenges"
                    className="w-full max-w-[380px] h-auto group-hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.06))" }}
                  />
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">For Governments & Organizations</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      "No digital tracking of daily collections",
                      "Zero visibility into collector performance",
                      "Manual monitoring with paper registers",
                      /* FUTURE: "No data for compliance or ESG reporting" - commented out, ESG not yet built */
                      "No data for accountability or reporting",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={200}>
              <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-100">
                <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-8 flex items-center justify-center">
                  <img
                    src="/images/illustrations/problem-citizen.png"
                    alt="Citizen frustrations - no transparency"
                    className="w-full max-w-[380px] h-auto group-hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.06))" }}
                  />
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">For Citizens & Households</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      "Real-time alerts when the vehicle is nearby",
                      "Poor segregation guidance and feedback",
                      "No way to report missed pickups",
                      "No transparency in waste handling",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <X className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="HOW IT WORKS"
              title="From household registration to actionable reports"
              subtitle="A structured workflow that covers registration, collection, monitoring, and reporting."
            />
          </AnimateOnScroll>

          <div className="space-y-8 md:space-y-12 max-w-6xl mx-auto">
            {[
              {
                step: 1, icon: QrCode, title: "Digitize Every Household",
                desc: "Map every household and assign a unique QR code. Each unit gets a digital identity - linked to ward, block, and collector. The QR Card/Sticker stays at the gate. App for households is optional not compulsory for workflow.",
                result: "→ Every household has a scannable digital identity",
                img: "/images/illustrations/feature-qr-batch.png",
                color: "from-emerald-500 to-emerald-600", bg: "from-emerald-50 to-teal-50",
              },
              {
                step: 2, icon: UserPlus, title: "Setup Collectors, Wards and Vehicles",
                desc: "Assign collectors to wards and vehicles and define schedules. One-time setup by a manager - then collectors just scan and go. Designed for all literacy levels with icon-based, multi-language navigation and Voice notes replace typing for remarks.",
                result: "→ Routes mapped, collectors ready, zero training needed",
                img: "/images/illustrations/accessibility-multilang.png",
                color: "from-teal-500 to-teal-600", bg: "from-teal-50 to-cyan-50",
              },
              {
                step: 3, icon: Activity, title: "Start Collection",
                desc: "Collectors only Collects waste from the households and sessions are auto called. The system tracks trip duration, area covered, and number of collections per session. Sessions auto-close at end of day if forgotten.",
                result: "→ Every trip is timestamped and trackable",
                img: "/images/illustrations/feature-vehicle.png",
                color: "from-cyan-500 to-cyan-600", bg: "from-cyan-50 to-blue-50",
              },
              {
                step: 4, icon: BellRing, title: "Smart Proximity Alerts",
                desc: "GreenPath automatically notifies households when the collection vehicle is nearby your doorstep. No more waiting outside or missing the vehicle. Multi-vehicle aware and battery-friendly.",
                result: "→ Citizens notified exactly when to hand over waste",
                img: "/images/illustrations/feature-alerts.png",
                color: "from-orange-500 to-orange-600", bg: "from-orange-50 to-amber-50",
              },
              {
                step: 5, icon: ScanLine, title: "Scan, Rate & Record",
                desc: "At each doorstep, collectors scan the QR code and record waste type (wet, dry, mixed, sanitary and special care). Rate segregation quality with star ratings. Add photo evidence or voice notes. Works fully offline - syncs when back online.",
                result: "→ Every collection event logged with type, quality, evidence",
                img: "/images/illustrations/step-3-collect.png",
                color: "from-blue-500 to-blue-600", bg: "from-blue-50 to-indigo-50",
              },
              {
                step: 6, icon: FileCheck, title: "Flag & Follow Up",
                desc: "Households with consistently poor segregation, repeated missed pickups, or complaints are automatically flagged as 'Needs Attention'. Managers can view flagged households and track their improvement over time.",
                result: "→ Problem households identified and resolved proactively",
                img: "/images/illustrations/feature-attention.png",
                color: "from-indigo-500 to-indigo-600", bg: "from-indigo-50 to-violet-50",
              },
              {
                step: 7, icon: Eye, title: "Monitor in Real-Time",
                desc: "Managers see live dashboards - which collectors are active, which routes are covered, which households were missed today. Ward-level roll-ups, collector leaderboards, and daily summaries are generated automatically.",
                result: "→ Full operational visibility without field visits",
                img: "/images/illustrations/step-4-monitor.png",
                color: "from-violet-500 to-violet-600", bg: "from-violet-50 to-purple-50",
              },
              {
                step: 8, icon: PieChart, title: "Analyze & Report",
                desc: "Generate ward-level reports, segregation trends, and collector benchmarks. Export data as CSV or branded PDF reports. Full audit trail for every collection event with timestamped, immutable logs.",
                /* FUTURE: Original desc included 'ESG reporting, SBM/SLWM audits, carbon credit verification, climate financing' - removed until built */
                result: "→ Audit-ready reports, actionable insights, full accountability",
                img: "/images/illustrations/step-5-analyze.png",
                color: "from-purple-500 to-purple-600", bg: "from-purple-50 to-fuchsia-50",
              },
            ].map((step, i) => (
              <AnimateOnScroll key={step.step}>
                <div className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${i % 2 !== 0 ? 'md:[direction:rtl] md:[&>*]:![direction:ltr]' : ''}`}>
                  <div className={`relative rounded-3xl bg-gradient-to-br ${step.bg} p-8 md:p-10 flex items-center justify-center overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-12 h-12 rounded-br-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                      {step.step}
                    </div>
                    <img
                      src={step.img}
                      alt={`Step ${step.step}: ${step.title}`}
                      className="w-full max-w-[400px] h-auto hover:scale-105 transition-transform duration-700"
                      style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                        <step.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step {step.step}</div>
                        <h3 className="text-2xl font-bold text-slate-900">{step.title}</h3>
                      </div>
                    </div>
                    <p className="text-base text-slate-600 leading-relaxed">{step.desc}</p>
                    <p className="text-sm font-semibold text-emerald-600 mt-3">{step.result}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPARENCY & ACCOUNTABILITY */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="TRANSPARENCY & ACCOUNTABILITY"
              title="Clear visibility across every stakeholder"
              subtitle="GreenPath connects managers, collectors, and households with a shared data layer - so every party sees the same picture."
            />
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <div className="flex justify-center mb-14">
              <div className="relative">
                <div className="absolute -inset-10 bg-gradient-to-r from-emerald-100/30 via-teal-100/40 to-cyan-100/30 rounded-full blur-3xl" />
                <img
                  src="/images/illustrations/transparency-triangle.png"
                  alt="Transparency triangle - Manager, Collector, Household connected by data flows"
                  className="relative w-full max-w-[480px] h-auto float-slow"
                  style={{ filter: "drop-shadow(0 15px 40px rgba(5,150,105,0.12))" }}
                />
              </div>
            </div>
          </AnimateOnScroll>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                role: "Manager → Collector",
                img: "/images/illustrations/role-manager.png",
                desc: "See real-time collector performance. Track routes covered, households scanned, segregation ratings, attendance and time logs.",
                color: "from-emerald-50 to-teal-50",
              },
              {
                role: "Collector → Household",
                img: "/images/illustrations/role-collector.png",
                desc: "Rate segregation quality per household. Flag households needing attention. Everything logged with timestamp and location.",
                color: "from-teal-50 to-cyan-50",
              },
              {
                role: "Household → Manager",
                img: "/images/illustrations/role-household.png",
                desc: "Get real-time proximity alerts. Report issues with photo evidence. View collection history and bills. See segregation scores and provide feedback.",
                color: "from-cyan-50 to-blue-50",
              },
            ].map((flow, i) => (
              <AnimateOnScroll key={flow.role} delay={200 + i * 100}>
                <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl border border-slate-100 transition-all duration-500 hover:-translate-y-2 h-full flex flex-col">
                  <div className={`bg-gradient-to-br ${flow.color} p-6 flex items-center justify-center`}>
                    <img
                      src={flow.img}
                      alt={flow.role}
                      className="w-full max-w-[220px] h-auto group-hover:scale-105 transition-transform duration-700"
                      style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.06))" }}
                    />
                  </div>
                  <div className="p-6 flex-1">
                    <h4 className="text-base font-bold text-slate-900 mb-2">{flow.role}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{flow.desc}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          <AnimateOnScroll delay={400}>
            <div className="grid sm:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
              {[
                { icon: Eye, text: "Every collection tracked" },
                { icon: ClipboardCheck, text: "Automated workforce tracking" },
                /* FUTURE: { icon: FileCheck, text: "ESG & compliance ready" }, - removed until ESG reporting is built */
                { icon: FileCheck, text: "Audit trail & accountability" },
                { icon: QrCode, text: "QR-based digital identity" },
              ].map((h) => (
                <div key={h.text} className="flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
                  <h.icon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-700">{h.text}</span>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* DEPLOYMENT & SOCIAL PROOF */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading label="REAL IMPACT" title="Already transforming communities" dark />
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
              <StatsCounter value={2000} suffix="+" label="Households Digitized" dark />
              {/* <StatsCounter value={95} suffix="%" label="Source Segregation" dark /> */}
              <div className="text-center"><div className="text-3xl font-extrabold text-white mb-2">Improved</div><div className="text-sm text-slate-400">Segregation Discipline</div></div>
              <StatsCounter value={3} suffix="+" label="Active Deployments" dark />
              <StatsCounter value={8} suffix="+" label="Panchayats Expanding" dark />
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200}>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-10 max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Featured</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Billapura Panchayat, Bengaluru
              </h3>
              {/* <p className="text-slate-300 leading-relaxed mb-6">
                What started as garbage burning and open dumping has transformed into a
                95% source segregation model - with women SHG members driving collection
                vehicles and a Zero Waste Centre processing all organic waste locally.
              </p> */}
              <p className="text-slate-300 leading-relaxed mb-6">
                GreenPath's platform supported local implementation organisations by introducing digital tracking to door-to-door operations, enabling supervisors to identify service gaps, empower community SHG members, and drive accountability-based follow-ups.
              </p>
              <button onClick={() => setLocation("/case-studies")} className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Read the full case study <ArrowRight className="w-4 h-4" />
              </button>
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="text-sm text-slate-500">Featured in</span>
                <a href="https://thebetterindia.com/sustainability/azim-premji-university-college-campus-sustainability-bilapura-panchayat-waste-management-system-11074332" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  The Better India <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://sustainabilitynext.in/billapura-panchayat-cleans-itself-in-two-years/" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  SustainabilityNext <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {/* <section className="bg-slate-50 py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="WHAT PEOPLE SAY"
              title="Trusted by communities across Karnataka"
            />
          </AnimateOnScroll> */}

          {/* 
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                quote: "The GreenPath app tracks waste from households to processing centres through QR codes. It's operated daily by our waste workers and the data helps us monitor waste flows and address gaps.",
                name: "Anjor Bhaskar", role: "Faculty, Azim Premji University",
              },
              {
                quote: "Earlier, we simply didn't have enough human or material resources to manage waste properly. With GreenPath tracking, we achieved nearly 95% source segregation.",
                name: "Manjunath", role: "Supervisor, Hasiru Dala",
              },
              {
                quote: "It made me rethink my own food habits and consumption. It makes me so happy that we are not just learning for ourselves anymore, we are involving others, too.",
                name: "Anup Mishra", role: "Student Volunteer, Azim Premji University",
              },
            ].map((t, i) => (
              <AnimateOnScroll key={t.name} delay={i * 100}>
                <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col relative">
                  <Quote className="w-8 h-8 text-emerald-100 absolute top-6 left-6" />
                  <p className="text-slate-600 leading-relaxed mb-6 relative z-10 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-700">{t.name[0]}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
          */}
        {/* </div>
      </section> */}

      {/* PRICING SNAPSHOT */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-10 md:p-16 text-center max-w-3xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100/30 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">PRICING</span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Starting at <span className="text-emerald-600">₹4</span> per household per month
                </h2>
                <p className="text-lg text-slate-600 mb-4">Built for community-scale deployments. Every feature included from day one.</p>
                <p className="text-sm text-slate-500 mb-8">Example: 500 households = <span className="font-semibold text-slate-700">₹2000/month</span> · No per-user fees · No hidden costs</p>
                <Button
                  onClick={() => setLocation("/pricing")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  View full pricing <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* SCALING ACROSS INDIA */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            {/* <SectionHeading
              label="SCALING ACROSS INDIA"
              title="From one panchayat to many"
              subtitle="Building a standardized digital platform for communities of every size."
            /> */}
            <SectionHeading
              label="SCALING JOURNEY"
              title="Expanding across diverse community environments"
              subtitle="From an initial rural pilot toward multi-community digital adoption. Building a standardized civic-tech platform designed to support decentralized waste management workflows across diverse local contexts."
            />
          </AnimateOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
            {/* {[
              { val: "3", label: "Villages Active", status: "live", color: "bg-emerald-500" },
              { val: "8", label: "Municipal Pilots", status: "upcoming", color: "bg-amber-500" },
              { val: "2", label: "Apartment Deployments", status: "planned", color: "bg-blue-500" },
              { val: "1", label: "Unified Platform", status: "live", color: "bg-purple-500" },
            ].map((item, i) => (
              <AnimateOnScroll key={item.label} delay={i * 100}>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="text-3xl font-extrabold text-slate-900 mb-1">{item.val}</div>
                  <div className="text-sm font-medium text-slate-700 mb-3">{item.label}</div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white ${item.color}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                    {item.status}
                  </span>
                </div>
              </AnimateOnScroll>
            ))} */}
            {[
              { val: "3+", label: "Village-level operational deployments", subtext: "Active use of digital household tracking and monitoring workflows" },
              { val: "8+", label: "Emerging municipal pilot discussions", subtext: "Exploratory engagements and readiness assessments for digital workflow adoption" },
              { val: "2", label: "Apartment community implementations in preparation", subtext: "Structured onboarding of residential waste collection monitoring systems" },
              { val: "1", label: "Unified digital platform architecture", subtext: "Single scalable system designed to support multi-location governance and reporting" },
            ].map((item, i) => (
              <AnimateOnScroll key={item.label} delay={i * 100}>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-center">
                  <div className="text-3xl font-extrabold text-slate-900 mb-2">{item.val}</div>
                  <div className="text-sm font-bold text-slate-800 mb-2 leading-tight">{item.label}</div>
                  <p className="text-xs text-slate-500 mt-auto pt-2 border-t border-slate-50">{item.subtext}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          <AnimateOnScroll delay={200}>
            <div className="bg-white rounded-3xl border border-slate-100 p-8 md:p-10 max-w-3xl mx-auto text-center shadow-sm">
              {/* <p className="text-slate-600 leading-relaxed">
                GreenPath is building a <strong>standardized digital platform</strong> for communities across India.
                Every household digitized. Every collection tracked. Every metric reportable -
                enabling <strong>transparent governance and accountable waste management</strong> at community scale.
              </p> */}
              <p className="text-slate-600 leading-relaxed">
                GreenPath provides a <strong>digital infrastructure solution</strong> for decentralized waste management systems.
                Built from real field experience, the platform focuses on transparency, accountability, and scalable operational visibility
                to support local bodies and ecosystem stakeholders.
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* MISSION */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-emerald-950" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimateOnScroll>
            <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400 mb-4 block">
              OUR MISSION
            </span>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-8">
              Making everyday waste collection more organised, visible, and accountable
            </h2>

            <blockquote className="text-xl md:text-2xl text-slate-300 leading-relaxed italic mb-8 max-w-3xl mx-auto">
              "Waste management works best when communities, field workers, and local leaders all have clear information.  
              Our goal is to build simple digital tools that help them coordinate better and improve cleanliness outcomes over time."
            </blockquote>

            <p className="text-base text-slate-400">
              - Balaji Nayak & Sreeja Gummula
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      <CTABanner />
    </PublicLayout>
  );
}
