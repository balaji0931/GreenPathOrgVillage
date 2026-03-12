import { PublicLayout } from "@/components/public/PublicLayout";
import { useSEO } from "@/hooks/useSEO";
import { AnimateOnScroll } from "@/components/public/AnimateOnScroll";
import { SectionHeading } from "@/components/public/SectionHeading";
import { StatsCounter } from "@/components/public/StatsCounter";
import { CTABanner } from "@/components/public/CTABanner";
import {
  MapPin,
  Users,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Award,
  QrCode,
  Leaf,
  BarChart3,
  Heart,
  Shield,
  Smartphone,
} from "lucide-react";
import { useLocation } from "wouter";

const css = `
  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  .float-gentle { animation: gentleFloat 6s ease-in-out infinite; }
`;

export default function CaseStudiesPage() {
  const [, setLocation] = useLocation();

  useSEO({
    title: "Case Studies — GreenPath",
    description: "Real deployments with measurable outcomes. Billapura panchayat achieved 90% source segregation. 8+ panchayats now replicating across 1.5 lakh people.",
    path: "/case-studies",
  });

  return (
    <PublicLayout>
      <style>{css}</style>

      {/* ═══════════ HERO — with large illustration ═══════════ */}
      <section className="relative bg-gradient-to-br from-slate-50 to-emerald-50/30 py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <AnimateOnScroll>
              <div className="max-w-xl">
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  CASE STUDIES
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6">
                  Real deployments.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    Measurable outcomes.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                  See how GreenPath is transforming waste management in communities
                  across Karnataka — from open dumping to 90% source segregation.
                </p>
              </div>
            </AnimateOnScroll>

            {/* Hero illustration — municipality scene */}
            <AnimateOnScroll delay={200} className="hidden lg:block">
              <div className="relative float-gentle">
                <img
                  src="/images/illustrations/solution-municipality.png"
                  alt="GreenPath deployed across municipal ward systems"
                  className="w-full h-auto"
                  style={{ filter: "drop-shadow(0 20px 40px rgba(5,150,105,0.12))" }}
                />
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════════ BILLAPURA — Featured case study with illustrations ═══════════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-200">
              {/* Header gradient with illustration */}
              <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 overflow-hidden">
                <div className="grid md:grid-cols-[1fr_280px] gap-0">
                  <div className="p-8 md:p-10">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                        <Award className="w-4 h-4" />
                        Featured Deployment
                      </div>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                      Billapura Panchayat
                    </h2>
                    <div className="flex flex-wrap gap-4 text-emerald-100 text-sm">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> Anekal Taluk, Bengaluru, Karnataka
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> ~9,600 residents · 2,000+ households
                      </span>
                    </div>
                  </div>

                  {/* Panchayat illustration inside header */}
                  <div className="hidden md:flex items-center justify-center p-6 relative">
                    <div className="absolute inset-0 bg-white/10" />
                    <img
                      src="/images/illustrations/solution-panchayat.png"
                      alt="Billapura panchayat deployment"
                      className="relative w-full max-w-[240px] h-auto"
                      style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.15))" }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 md:p-10">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 p-6 bg-emerald-50 rounded-2xl">
                  <StatsCounter value={90} suffix="%" label="Source Segregation" />
                  <StatsCounter value={2000} suffix="+" label="Households Tracked" />
                  <StatsCounter value={300} suffix="+" label="Women Adopted Reusables" />
                  <StatsCounter value={8} suffix="+" label="Panchayats Replicating" />
                </div>

                {/* Before / After — structured proof for decision makers */}
                <div className="grid lg:grid-cols-[1fr_280px] gap-6 mb-10">
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left font-semibold text-slate-700 px-6 py-3">Metric</th>
                          <th className="text-center font-semibold text-red-600 px-6 py-3">Before GreenPath</th>
                          <th className="text-center font-semibold text-emerald-600 px-6 py-3">After GreenPath</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { metric: "Source Segregation", before: "< 10%", after: "90%" },
                          { metric: "Collection Tracking", before: "Manual registers", after: "Real-time QR scans" },
                          { metric: "Waste Disposal", before: "Open dumping & burning", after: "Eliminated" },
                          { metric: "Data Visibility", before: "None", after: "Ward-level dashboards" },
                          { metric: "Collector Accountability", before: "Self-reported", after: "GPS + photo verified" },
                        ].map((row) => (
                          <tr key={row.metric} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3 font-medium text-slate-900">{row.metric}</td>
                            <td className="px-6 py-3 text-center text-red-500">{row.before}</td>
                            <td className="px-6 py-3 text-center text-emerald-600 font-semibold">{row.after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="hidden lg:flex items-center justify-center">
                    <img
                      src="/images/illustrations/feature-analytics-charts.png"
                      alt="Analytics charts showing collection and segregation trends"
                      className="w-full max-w-[260px] h-auto hover:scale-105 transition-transform duration-700"
                      style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.06))" }}
                    />
                  </div>
                </div>

                {/* Story sections */}
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Background</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Billapura, a peri-urban panchayat on Bengaluru's outskirts, struggled
                      with mixed waste dumping, roadside burning, and no structured collection
                      system. Chicken waste from local meat shops was dumped along roads at night.
                      Stray animals gathered. Plastic along roadsides was eaten by animals.
                      "Earlier, we simply didn't have enough human or material resources to manage
                      waste properly," says Manjunath, executive officer of Anekal Taluk.
                    </p>
                  </div>

                  {/* Deployment with role illustrations */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Deployment</h3>
                    <p className="text-slate-600 leading-relaxed mb-6">
                      Starting September 2024, a decentralized model was implemented in partnership
                      with Azim Premji University and Hasiru Dala:
                    </p>

                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                      {[
                        {
                          img: "/images/illustrations/role-household.png",
                          title: "Household Registration",
                          items: ["QR code stickers on every gate", "Digital identity per household", "Collection history tracked"],
                        },
                        {
                          img: "/images/illustrations/role-collector.png",
                          title: "Collection System",
                          items: ["6 local women employed as workers", "Daily QR scanning at doorsteps", "PPE kits and training provided"],
                        },
                        {
                          img: "/images/illustrations/platform-dashboard.png",
                          title: "Monitoring & Analytics",
                          items: ["Manager dashboards for oversight", "Real-time collection status", "Segregation quality tracking"],
                        },
                      ].map((phase) => (
                        <div key={phase.title} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 flex items-center justify-center h-40">
                            <img
                              src={phase.img}
                              alt={phase.title}
                              className="max-h-full w-auto object-contain"
                              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.06))" }}
                            />
                          </div>
                          <div className="p-4">
                            <h4 className="text-sm font-bold text-slate-900 mb-2">{phase.title}</h4>
                            <ul className="space-y-1.5">
                              {phase.items.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        "Women SHG member trained to drive the collection vehicle",
                        "Zero Waste Centre for composting and dry waste sorting",
                        "Roof sheets made from recycled multi-layered plastic",
                        "GreenPath app used daily for QR-based collection tracking",
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                          <span className="text-sm text-slate-600">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Results with illustration */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">Results</h3>
                    <div className="grid md:grid-cols-[1fr_220px] gap-8 items-center">
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          "90% source segregation achieved",
                          "Nearly 100% organic waste composted locally",
                          "Zero Waste Centre produces compost used in a food forest",
                          "300+ women adopted reusable menstrual products",
                          "8 neighbouring panchayats now replicating the model",
                          "Covering ~1.5 lakh people across 9 panchayats",
                        ].map((item) => (
                          <div key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                            <span className="text-sm text-slate-700 font-medium">{item}</span>
                          </div>
                        ))}
                      </div>

                      {/* Impact illustration */}
                      <div className="hidden md:block">
                        <img
                          src="/images/illustrations/impact-behaviour.png"
                          alt="Before and after — transformation from open dumping to organized waste management"
                          className="w-full h-auto"
                          style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.06))" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Press */}
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                      Press Coverage
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "The Better India", url: "https://thebetterindia.com/sustainability/azim-premji-university-college-campus-sustainability-bilapura-panchayat-waste-management-system-11074332" },
                        { label: "SustainabilityNext", url: "https://sustainabilitynext.in/billapura-panchayat-cleans-itself-in-two-years/" },
                        { label: "LinkedIn — Anjor Bhaskar", url: "https://www.linkedin.com/posts/anjor-bhaskar-4426189_zerowaste-zerowaste-sustainablewastemanagement-activity-7405693617014702082-AuUc/" },
                      ].map((link) => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition-colors"
                        >
                          {link.label}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════════ EXPANSION — with illustration ═══════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Illustration — LARGE */}
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-br from-emerald-100/30 to-teal-100/30 rounded-[2rem] blur-3xl" />
                <img
                  src="/images/illustrations/solution-panchayat-2.png"
                  alt="Multiple panchayats adopting GreenPath digital waste management"
                  className="relative w-full h-auto float-gentle"
                  style={{ filter: "drop-shadow(0 15px 35px rgba(5,150,105,0.1))" }}
                />
                {/* Urgency visual overlay */}
                <div className="absolute -top-4 -right-4 w-32 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-white hidden md:block">
                  <img
                    src="/images/illustrations/impact-crisis.png"
                    alt="India's waste crisis — urgency for digital solutions"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                    Active Expansion
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                  Multi-Panchayat Expansion
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-6">
                  <span>8 panchayats, Anekal Taluk, Bengaluru Rural</span>
                  <span>·</span>
                  <span>~1.5 lakh people</span>
                </div>
                <p className="text-slate-600 leading-relaxed mb-8">
                  Following Billapura's success, 8 neighbouring panchayats covering
                  approximately 1.5 lakh people have partnered with Azim Premji
                  University and Hasiru Dala to adopt decentralized waste management
                  using GreenPath.
                </p>
                <div className="space-y-3">
                  {[
                    "Scaling from 1 → 9 panchayats",
                    "Standardized QR-based tracking across all locations",
                    "Centralized monitoring with per-panchayat dashboards",
                    "Shared learning model accelerating adoption",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>


      <CTABanner
        heading="Want similar results in your community?"
        primaryLabel="Request Demo"
        secondaryLabel="View Solutions"
        secondaryHref="/solutions"
      />
    </PublicLayout>
  );
}
