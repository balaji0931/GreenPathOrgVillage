import { PublicLayout } from "@/components/public/PublicLayout";
import { useSEO } from "@/hooks/useSEO";
import { AnimateOnScroll } from "@/components/public/AnimateOnScroll";
import { SectionHeading } from "@/components/public/SectionHeading";
import { CTABanner } from "@/components/public/CTABanner";
import {
  QrCode,
  Smartphone,
  BarChart3,
  AlertTriangle,
  Megaphone,
  CheckCircle2,
  Users,
  ArrowRight,
  Shield,
  Layers,
  Server,
  Database,
  Globe,
  Languages,
  Accessibility,
  Settings,
  Leaf,
  Recycle,
  TrendingUp,
  Heart,
  TreePine,
  Package,
  Eye,
  MapPin,
  Truck,
  Star,
  Mic,
  Camera,
  Bell,
  UserPlus,
  Lock,
  Clock,
  CreditCard,
  FileCheck,
} from "lucide-react";

const pageStyles = `
  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  .gentle-float { animation: gentleFloat 5s ease-in-out infinite; }
  .gentle-float-d { animation: gentleFloat 5s ease-in-out 1s infinite; }
`;

const modules = [
  {
    icon: QrCode,
    title: "Household Tracking",
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-50 to-teal-50/40",
    img: "/images/illustrations/module-tracking.png",
    features: [
      "QR code-based registration for every household/unit",
      "Unique digital identity linked to ward, block, or zone",
      "Collection history with segregation ratings",
      "Issue reporting with photo evidence and status tracking",
      "Payment tracking and receipt generation",
    ],
  },
  {
    icon: Smartphone,
    title: "Collector Operations",
    color: "from-teal-500 to-cyan-500",
    bgColor: "from-teal-50 to-cyan-50/40",
    img: "/images/illustrations/module-operations.png",
    features: [
      "Mobile-first QR scanning during door-to-door collection",
      "Waste type recording (wet, dry, hazardous, mixed)",
      "1-5 star segregation quality rating per household",
      "Voice note and photo feedback capability",
      "Full offline support - auto-sync when connected",
      "Observation checklist and not-collected reasons",
    ],
  },
  {
    icon: Server,
    title: "Facility & Aggregation Monitoring",
    color: "from-cyan-500 to-blue-500",
    bgColor: "from-cyan-50 to-blue-50/40",
    img: "/images/illustrations/module-facility.png",
    features: [
      "Log incoming materials at processing facilities",
      "Material log tracking (compost, dry waste sales, disposal)",
      "Vehicle session management with trip tracking",
      "Daily waste volume and material type logging",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    color: "from-blue-500 to-indigo-500",
    bgColor: "from-blue-50 to-indigo-50/40",
    img: "/images/illustrations/module-analytics.png",
    features: [
      "Manager dashboard with real-time collection status",
      "Ward-wise, collector-wise, household-wise breakdowns",
      "Segregation quality scores and performance tracking",
      "Exportable PDF reports for governance bodies",
      "Revenue and payment analytics",
    ],
  },
  {
    icon: AlertTriangle,
    title: "Issue Management",
    color: "from-amber-500 to-orange-500",
    bgColor: "from-amber-50 to-orange-50/40",
    img: "/images/illustrations/feature-issue-mgmt.png",
    features: [
      "Citizen-reported issues with photo evidence",
      "Manager replies with proof-of-resolution photos",
      "Category-based issue tracking across 8 types",
      "Resolution tracking with full timeline",
    ],
  },
];

const roles = [
  { role: "Moderator", desc: "Oversees multiple communities, manages managers across deployments, sends cross-community announcements", icon: Shield, img: "/images/illustrations/role-admin.png" },
  { role: "Manager", desc: "Registers households, generates QR batches, assigns collectors, monitors operations and analytics", icon: Users, img: "/images/illustrations/role-manager.png" },
  { role: "Collector", desc: "Scans QR codes, records waste type, rates segregation quality, adds photo/voice evidence", icon: Smartphone, img: "/images/illustrations/role-collector.png" },
  { role: "Fieldworker", desc: "Maps households by scanning premapped QR codes, captures GPS locations, mobile-only workflow", icon: MapPin, img: "/images/illustrations/role-fieldworker.png" },
  { role: "Household / Generator", desc: "Views collection history, pays bills, gives collector feedback, reports issues with photos, tracks segregation score", icon: QrCode, img: "/images/illustrations/role-household.png" },
];

export default function ProductPage() {
  useSEO({
    title: "Platform - GreenPath",
    description: "Complete waste management platform: QR-based household tracking, offline-first collector app, vehicle sessions, analytics dashboards, multi-language support. Built for ground-level operations.",
    path: "/product",
  });

  return (
    <PublicLayout>
      <style>{pageStyles}</style>

      {/* Hero - with floating illustration */}
      <section className="relative bg-gradient-to-br from-slate-50 to-emerald-50/30 py-10 md:py-14 overflow-hidden">
        <div className="absolute top-10 right-0 w-80 h-80 bg-emerald-100/20 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <AnimateOnScroll>
              <div className="max-w-xl">
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  THE PLATFORM
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                  The complete waste management{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    platform
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                  Purpose-built for community waste collection, tracking, and
                  oversight - from household to processing facility. Every feature
                  is designed for the people who do the work on the ground.
                </p>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={200} className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-100/30 to-teal-100/30 rounded-3xl blur-2xl" />
                <div className="relative gentle-float">
                  <img
                    src="/images/illustrations/product-hero.png"
                    alt="GreenPath analytics dashboard"
                    className="max-w-7xl h-auto"
                    style={{ filter: "drop-shadow(0 15px 35px rgba(5,150,105,0.12))" }}
                  />
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* In One Line */}
      <section className="py-10 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimateOnScroll>
            <p className="text-xl md:text-2xl font-medium text-slate-700 leading-relaxed">
              GreenPath digitizes every household and tracks every waste collection event in real time.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Architecture - visual flow */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4">
          <AnimateOnScroll>
            <SectionHeading
              label="ARCHITECTURE"
              title="How the platform is structured"
              subtitle="GreenPath is built as a modular platform where each stakeholder has a dedicated interface tailored to their workflow."
            />
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                {
                  label: "Field Data",
                  desc: "Household QR scans, offline logging, daily waste logging, photo and voice records",
                  icon: Database,
                  color: "bg-emerald-500"
                },
                {
                  label: "Daily Operations",
                  desc: "Vehicle trips, collection sessions and on-ground coordination",
                  icon: Server,
                  color: "bg-teal-500"
                },
                {
                  label: "Insights",
                  desc: "Simple dashboards and reports to track coverage and performance",
                  icon: BarChart3,
                  color: "bg-cyan-500"
                },
                {
                  label: "Local Governance",
                  desc: "Issue tracking, announcements and transparent activity records",
                  icon: Globe,
                  color: "bg-blue-500"
                },
              ].map((layer, i) => (
                <div key={layer.label} className="relative">
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 text-center hover:-translate-y-1">
                    <div className={`w-12 h-12 ${layer.color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <layer.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">{layer.label}</h3>
                    <p className="text-sm text-slate-500">{layer.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-8 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Modules - art-book alternating layout with illustrations */}
      <section className="bg-slate-50 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="CORE MODULES"
              title="Operational tools designed for real field workflows"
              subtitle="Each module supports a specific stage of waste collection, monitoring and reporting."
            />
          </AnimateOnScroll>

          <div className="space-y-10 md:space-y-12">
            {modules.map((mod, i) => (
              <AnimateOnScroll key={mod.title} delay={i * 80}>
                <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg">

                  {/* subtle vertical identity strip */}
                  <div className={`absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b ${mod.color}`} />

                  <div className={`grid ${i % 2 === 0 ? 'md:grid-cols-[1fr_380px]' : 'md:grid-cols-[380px_1fr]'}`}>

                    {/* CONTENT */}
                    <div className={`p-7 md:p-9 ${i % 2 !== 0 ? 'md:order-2' : ''}`}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow`}>
                          <mod.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight">
                          {mod.title}
                        </h3>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-y-2.5 gap-x-6">
                        {mod.features.map((f) => (
                          <div key={f} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-[3px] flex-shrink-0" />
                            <span className="text-sm text-slate-600 leading-snug">
                              {f}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* IMAGE PANEL */}
                    <div
                      className={`
                        relative flex items-center justify-center
                        bg-gradient-to-br ${mod.bgColor}
                        border-t md:border-t-0
                        ${i % 2 === 0 ? 'md:border-l' : 'md:border-r'}
                        border-slate-200
                        p-8 md:p-10
                        ${i % 2 !== 0 ? 'md:order-1' : ''}
                      `}
                    >
                      <div className="w-full max-w-[220px] opacity-95">
                        <img
                          src={mod.img}
                          alt={mod.title}
                          className="w-full h-auto object-contain"
                          style={{ filter: "drop-shadow(0 12px 26px rgba(0,0,0,0.10))" }}
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* KEY PLATFORM FEATURES */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="PLATFORM CAPABILITIES"
              title="Powerful features built for the field"
              subtitle="Beyond the core modules - capabilities that make GreenPath uniquely effective for ground-level waste management."
            />
          </AnimateOnScroll>

          <div className="space-y-8 md:space-y-12 max-w-6xl mx-auto">
            {/* Needs Attention System */}
            <AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="relative rounded-3xl bg-gradient-to-br from-red-50 to-amber-50/40 p-8 md:p-10 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/illustrations/feature-attention.png"
                    alt="Needs Attention - households flagged for poor segregation"
                    className="w-full max-w-[400px] h-auto hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Needs Attention System</h3>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Households with consistently poor segregation or missed collections get automatically flagged. Managers see a WhatsApp-style strip of attention-required households - enabling targeted intervention instead of guesswork.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Auto-flag based on segregation scores and collection gaps",
                      "Visual strip showing households that need intervention",
                      "Historical data to identify persistent problem areas",
                      "Drives accountability loop between collector and household",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            {/* Vehicle Session Management */}
            <AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center md:[direction:rtl] md:[&>*]:![direction:ltr]">
                <div className="relative rounded-3xl bg-gradient-to-br from-teal-50 to-cyan-50/40 p-8 md:p-10 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/illustrations/feature-vehicle.png"
                    alt="Vehicle session management with GPS tracking"
                    className="w-full max-w-[400px] h-auto hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Vehicle Sessions</h3>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Collectors start and end vehicle sessions with a tap. Each session logs the collector, vehicle, start and end times, and number of collections - providing clear oversight of daily operations.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "One-tap session start/stop for each collection route",
                      "Time-stamped sessions with collection counts",
                      "Vehicle-level daily reports for managers",
                      "Time-stamped sessions with performance metrics",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            {/* QR Batch Generation */}
            <AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="relative rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/40 p-8 md:p-10 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/illustrations/feature-qr-batch.png"
                    alt="QR code batch generation for field mapping"
                    className="w-full max-w-[400px] h-auto hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <QrCode className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">QR Batch Generation</h3>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Managers generate premapped QR code batches which fieldworkers then take to the field. Scan a code, fill in household details with GPS location, and the household is digitized.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Generate QR batches of any size from the dashboard",
                      "Fieldworkers scan and map on-site with GPS capture",
                      "Instant household registration in the system",
                      "One-time setup - then collectors just scan and collect",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            {/* Announcements */}
            <AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center md:[direction:rtl] md:[&>*]:![direction:ltr]">
                <div className="relative rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/40 p-8 md:p-10 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/illustrations/feature-announcements.png"
                    alt="Broadcast announcements to collectors and households"
                    className="w-full max-w-[400px] h-auto hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Announcements</h3>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Broadcast important messages to all collectors, all households, or specific audiences. Attach photos for visual updates. Auto-slide announcement banners on mobile dashboards.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Target specific audiences - all, managers, collectors, generators",
                      "Attach photos for visual announcements",
                      "Cross-community broadcasts by moderators",
                      "Auto-display on household and collector dashboards",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            {/* Attendance & Shift Tracking */}
            <AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="relative rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/40 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/illustrations/feature-attendance.png"
                    alt="Attendance & Shift Tracking - QR clock-in for field staff"
                    className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[380px] h-auto py-8 md:py-0 object-contain hover:scale-105 transition-transform duration-700 mx-auto"
                    style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Attendance & Shift Tracking</h3>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Know when your team starts and finishes work - every day. Set up attendance centers with printed QR posters. Collectors scan to clock in and out. Managers mark daily attendance for all staff types.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "QR-based attendance centers with printable posters",
                      "Collectors scan to clock in and clock out of shifts",
                      "Managers mark daily attendance for all staff types",
                      "Shift timelines showing start time, end time, and location",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            {/* Payments & Billing */}
            <AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center md:[direction:rtl] md:[&>*]:![direction:ltr]">
                <div className="relative rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/40 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/illustrations/feature-billing.png"
                    alt="Payments & Billing - Digital fee collection and household dashboards"
                    className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[380px] h-auto py-8 md:py-0 object-contain hover:scale-105 transition-transform duration-700 mx-auto"
                    style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Payments & Billing</h3>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Collect waste management fees from households digitally. Generate bills, track who has paid, and give households a clear view of their payment history - all from within the platform.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Generate household bills with flexible billing cycles",
                      "Track cash and online payments with receipts",
                      "Households view and pay bills from their own dashboard",
                      "Full payment ledger for managers with collection reports",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            {/* Staff Management */}
            <AnimateOnScroll>
              <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="relative rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50/40 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/illustrations/feature-staff.png"
                    alt="Staff Management - Multi-role team tracking and administration"
                    className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[380px] h-auto py-8 md:py-0 object-contain hover:scale-105 transition-transform duration-700 mx-auto"
                    style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.08))" }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Staff Management</h3>
                  </div>
                  <p className="text-base text-slate-600 leading-relaxed mb-4">
                    Manage your full team - not just collectors. Register and track helpers, compost workers, sweepers, drivers, and waste segregators. Everyone is part of the same system.
                  </p>
                  <ul className="space-y-2">
                    {[
                      "Register helpers - compost workers, sweepers, garden staff, drain cleaners",
                      "Track waste segregators and their assignments",
                      "Mark attendance across all staff types, not just collectors",
                      "A single place to manage your team across all roles",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
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

      {/* Collector Form & Generator Feedback - side by side feature cards */}
      <section className="bg-slate-50 py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="GROUND-LEVEL TOOLS"
              title="Built for the people who do the work"
              subtitle="Every interface is designed for ground-level workers and households - no training manuals needed."
            />
          </AnimateOnScroll>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Collector Form */}
            <AnimateOnScroll delay={100}>
              <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-100 h-full flex flex-col">
                <div className="relative bg-gradient-to-br from-teal-50 to-cyan-50/50 p-6 flex items-center justify-center">
                  <img
                    src="/images/illustrations/feature-collector-form.png"
                    alt="Collector mobile form with ratings and voice notes"
                    className="w-full max-w-[240px] h-auto group-hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.06))" }}
                  />
                </div>
                <div className="p-6 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Collector Collection Form</h3>
                  <ul className="space-y-2">
                    {[
                      "Waste type: wet, dry, mixed, hazardous",
                      "Segregation rating (1-5 stars)",
                      "Cleanliness/plastic rating",
                      "Photo evidence capture",
                      "Voice note recording for feedback",
                      "Observation checklist (compostable, recyclable, etc.)",
                      "Not-collected reasons with explanation",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>

            {/* Generator Feedback */}
            <AnimateOnScroll delay={200}>
              <div className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-100 h-full flex flex-col">
                <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50/50 p-6 flex items-center justify-center">
                  <img
                    src="/images/illustrations/feature-generator-feedback.png"
                    alt="Household feedback and collection history"
                    className="w-full max-w-[350px] h-auto group-hover:scale-105 transition-transform duration-700"
                    style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.06))" }}
                  />
                </div>
                <div className="p-6 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Household Experience</h3>
                  <ul className="space-y-2">
                    {[
                      "View complete collection history",
                      "See segregation scores and collector notes",
                      "Rate and give feedback to collectors",
                      "Report issues with photo evidence",
                      "Track issue resolution timeline",
                      "Receive broadcast announcements",
                      "View and pay household bills",
                      /* FUTURE: "Monthly progress reports" - not yet built */
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* Offline & Accessibility */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimateOnScroll>
              <div>
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  OFFLINE FIRST
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
                  Built for the field, not just the office
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                  GreenPath works where internet doesn't. Collectors in rural
                  panchayats, apartments, and communities operate with intermittent
                  connectivity. Our offline-first architecture ensures:
                </p>
                <ul className="space-y-4">
                  {[
                    "Collections are recorded even without signal",
                    "Data queues locally and syncs automatically",
                    "No data loss - every scan is timestamped and preserved",
                    "Works on low-end Android devices",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={200}>
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-[2rem] blur-2xl" />
                <div className="relative gentle-float">
                  <img
                    src="/images/illustrations/offline-sync.png"
                    alt="Offline sync - works without internet"
                    className="w-full max-w-[420px] mx-auto h-auto"
                    style={{ filter: "drop-shadow(0 15px 30px rgba(5,150,105,0.12))" }}
                  />
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* Accessibility - dark section */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimateOnScroll>
              <div className="relative flex justify-center">
                <div className="absolute -inset-8 bg-emerald-500/5 rounded-full blur-3xl" />
                <img
                  src="/images/illustrations/accessibility-multilang.png"
                  alt="Multi-language and accessibility features"
                  className="relative w-100 md:w-100 h-auto gentle-float"
                  style={{ filter: "drop-shadow(0 10px 30px rgba(5,150,105,0.2))" }}
                />
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={200}>
              <div>
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400 mb-4 block">
                  BUILT FOR EVERYONE
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
                  Works for every collector, in every community
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed mb-8">
                  GreenPath is designed for ground-level workers - including those
                  who may not read or write. One-time setup by a manager, then
                  collectors just scan and go.
                </p>

                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { icon: Languages, title: "Multi-Language", desc: "Kannada, Telugu, Tamil, Hindi, English and more" },
                    { icon: Accessibility, title: "Icon-Based UI", desc: "No reading or typing needed after setup" },
                    { icon: Settings, title: "One-Time Setup", desc: "Manager sets up once, collectors just scan" },
                  ].map((feature) => (
                    <div key={feature.title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                      <feature.icon className="w-6 h-6 text-emerald-400 mb-3" />
                      <h4 className="text-sm font-semibold text-white mb-1">{feature.title}</h4>
                      <p className="text-xs text-slate-400">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* Waste Logs & Chain of Custody - merged from Impact */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="CHAIN OF CUSTODY"
              title="Logging waste from doorstep to processing facility"
              subtitle="Collection events are timestamped, photographed, and logged. Facility-level material logs track what's composted and sold."
            />
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <div className="relative mb-12">
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-100/20 via-teal-100/30 to-emerald-100/20 rounded-3xl blur-xl" />
              <img
                src="/images/illustrations/waste-log-chain.png"
                alt="Waste journey from household to processing"
                className="relative w-full h-auto"
                style={{ filter: "drop-shadow(0 8px 20px rgba(5,150,105,0.08))" }}
              />
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { icon: Package, title: "Pickup", desc: "Collector scans QR at household, logs waste type" },
                { icon: Eye, title: "Photograph", desc: "Photo evidence of waste quality and quantity" },
                { icon: BarChart3, title: "Log", desc: "Facilities log material types and quantities" },
                { icon: Recycle, title: "Process", desc: "Facility records wet/dry segregation output" },
                /* FUTURE: original desc was "Full audit trail for compliance reporting" - compliance report templates not yet built */
                { icon: CheckCircle2, title: "Report", desc: "Full audit trail for accountability and reporting" },
              ].map((step) => (
                <div key={step.title} className="bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm hover:shadow-md transition-all duration-300">
                  <step.icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">{step.title}</h4>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Multi-Stakeholder Roles - expanded to 5 roles */}
      <section className="bg-slate-50 py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="MULTI-STAKEHOLDER"
              title="Every role has a purpose-built workflow"
              subtitle="Five distinct roles, each with a dedicated interface designed for their specific workflow."
            />
          </AnimateOnScroll>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {roles.map((r, i) => (
                <AnimateOnScroll key={r.role} delay={i * 100}>
                  <div className="group flex items-center gap-4 md:gap-6 bg-white rounded-2xl border border-slate-100 p-4 md:p-5 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-0.5 overflow-hidden relative">
                    <div className="absolute right-0 top-0 bottom-0 w-40 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500">
                      <img src={r.img} alt="" className="w-full h-full object-contain object-right" />
                    </div>
                    <div className="w-20 h-20 sm:w-40 sm:h-40 rounded-2xl bg-emerald-50 flex-shrink-0 overflow-hidden p-1.5">
                      <img src={r.img} alt={r.role} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                      <h3 className="text-base font-semibold text-slate-900">{r.role}</h3>
                      <p className="text-sm text-slate-500">{r.desc}</p>
                    </div>
                    {i < roles.length - 1 && (
                      <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0 hidden md:block" />
                    )}
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Configurable Communities */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimateOnScroll delay={200}>
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-[2rem] blur-2xl" />
                <div className="relative gentle-float">
                  <img
                    src="/images/illustrations/feature-configurable.png"
                    alt="Community-level configuration settings"
                    className="w-full max-w-[420px] mx-auto h-auto"
                    style={{ filter: "drop-shadow(0 15px 30px rgba(5,150,105,0.12))" }}
                  />
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll>
              <div>
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  CONFIGURABLE
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
                  Every community operates differently
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed mb-8">
                  Each deployment can be configured to match local requirements.
                  Toggle features on or off per community - no one-size-fits-all.
                </p>
                <ul className="space-y-4">
                  {[
                    "Toggle photo upload requirements per community",
                    "Enable or disable GPS location services",
                    "Configure ward structure (single or multi-ward)",
                    "Set collection schedules per community",
                    "Role-based access - each stakeholder sees only what's relevant",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* Impact & Sustainability - merged from ImpactPage */}
      <section id="impact" className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-emerald-950" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading label="IMPACT & SUSTAINABILITY" title="Technology that changes habits" dark />
          </AnimateOnScroll>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <AnimateOnScroll>
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">62 million tonnes. 20% processed.</h3>
                <p className="text-lg text-slate-300 leading-relaxed mb-4">
                  India generates over 62 million tonnes of solid waste annually.
                  Only 20% is processed. GreenPath exists to change this equation - one community at a time.
                </p>
                {/* <p className="text-slate-300 leading-relaxed">
                  When households see their segregation scores, receive feedback from
                  collectors, and understand where their waste goes - behavior changes.
                  In Billapura, source segregation went from negligible to{" "}
                  <span className="text-emerald-400 font-bold">95%</span> in under two years.
                </p> */}
                <p className="text-slate-300 leading-relaxed">
                  When households see their segregation scores, receive feedback from
                  collectors, and understand where their waste goes - behavior changes.
                  Following the introduction of digital tracking in pilot areas like Billapura Panchayat,
                  field teams reported significant improvements in source segregation discipline.
                </p>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={200}>
              <div className="relative flex justify-center">
                <div className="absolute -inset-8 bg-emerald-500/5 rounded-full blur-3xl" />
                <img
                  src="/images/illustrations/impact-behaviour.png"
                  alt="Behaviour change - waste management transformation"
                  className="relative w-full max-w-[380px] h-auto gentle-float"
                  style={{ filter: "drop-shadow(0 10px 30px rgba(5,150,105,0.2))" }}
                />
              </div>
            </AnimateOnScroll>
          </div>

          {/* Circular Economy */}
          <AnimateOnScroll delay={100}>
            <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: TreePine, title: "Compost to Food", desc: "Compost feeds local food forests, growing food locally" },
                { icon: Recycle, title: "Revenue from Waste", desc: "Sorted dry waste generates income for waste workers" },
                { icon: Heart, title: "Dignified Livelihoods", desc: "Organized waste work with PPE and fair pay" },
              ].map((card) => (
                <div key={card.title} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors">
                  <card.icon className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">{card.title}</h4>
                  <p className="text-sm text-slate-300 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Scalability */}
      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimateOnScroll>
            <SectionHeading
              label="SCALABILITY"
              title="From 1 ward to 1,000"
              subtitle="Add new locations, wards, blocks, or entire municipalities without changing infrastructure. Role-based access ensures each stakeholder sees only what's relevant."
            />
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mt-8">
              {[
                { title: "Multi-Tenant", desc: "Multiple locations on one platform" },
                { title: "Role Hierarchy", desc: "Moderator → Manager → Collector → Fieldworker → Generator" },
                { title: "Data Isolation", desc: "Per-location isolation with cross-location analytics" },
              ].map((item) => (
                <div key={item.title} className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Security & Data Ownership */}
      <section className="bg-slate-50 py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="SECURITY & DATA OWNERSHIP"
              title="Data security and ownership"
              subtitle="Your data stays yours. Role-based access, audit trails, and full export - no vendor lock-in."
            />
          </AnimateOnScroll>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Database, title: "Isolated Storage", desc: "Each deployment's data is logically isolated - no cross-location leakage" },
              { icon: Shield, title: "Role-Based Access", desc: "5-level hierarchy ensures each user sees only what's relevant to their role" },
              { icon: FileCheck, title: "Audit Trails", desc: "Every scan, rating, and action is timestamped with user identity - immutable logs" },
              { icon: Lock, title: "Export Ownership", desc: "Your data stays yours - full CSV export, branded PDF reports, audit logs, no vendor lock-in." },
            ].map((card, i) => (
              <AnimateOnScroll key={card.title} delay={i * 80}>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 h-full hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4">
                    <card.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{card.desc}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      <CTABanner heading="See GreenPath in action" primaryLabel="Request a Demo" />
    </PublicLayout>
  );
}
