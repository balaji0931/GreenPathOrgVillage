import { PublicLayout } from "@/components/public/PublicLayout";
import { useSEO } from "@/hooks/useSEO";
import { AnimateOnScroll } from "@/components/public/AnimateOnScroll";
import { SectionHeading } from "@/components/public/SectionHeading";
import { CTABanner } from "@/components/public/CTABanner";
import {
  Landmark,
  TreePine,
  Building,
  Factory,
  Heart,
  CheckCircle2,
  ArrowRight,
  QrCode,
  Smartphone,
  BarChart3,
  Shield,
  WifiOff,
  Users,
  AlertTriangle,
  Leaf,
  Languages,
} from "lucide-react";

const css = `
  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  .float-gentle { animation: gentleFloat 6s ease-in-out infinite; }
`;

const solutions = [
  {
    icon: Landmark,
    title: "For Municipalities",
    subtitle: "Urban local bodies managing ward-level waste collection across hundreds of wards",
    scale: "5,000–25,000 households per deployment",
    color: "from-blue-500 to-indigo-500",
    bgScene: "from-blue-50 via-indigo-50/30 to-white",
    img: "/images/illustrations/solution-municipality.png",
    problem:
      "Urban local bodies manage waste across hundreds of wards with limited digital infrastructure. Most rely on manual registers, making it impossible to track collector performance, segregation quality, or citizen complaints.",
    capabilities: [
      { icon: QrCode, text: "Digitize every ward with QR-based household tracking" },
      { icon: BarChart3, text: "Ward-wise performance dashboards with real-time data" },
      { icon: Shield, text: "Operational reports for ward-level performance and collection coverage" },
      { icon: AlertTriangle, text: "Flag underperforming wards and households needing attention" },
      { icon: Users, text: "Scale progressively - add wards without system overhaul" },
    ],
    outcomes: [
      "Real-time visibility of daily waste collection across wards",
      "Ward-wise segregation performance benchmarking",
      "Faster identification of service gaps and missed households",
      "Digitized citizen issue tracking and resolution workflow",
      "Audit trail of every household collection event",
      "Data-backed planning for route optimization and resource allocation",
    ],
  },
  {
    icon: TreePine,
    title: "For Panchayats",
    subtitle: "Rural and peri-urban local governments digitizing waste management with minimal budgets",
    scale: "1,000–5,000 households per deployment",
    color: "from-emerald-500 to-teal-500",
    bgScene: "from-emerald-50 via-teal-50/30 to-white",
    img: "/images/illustrations/solution-panchayat-2.png",
    problem:
      "Rural and peri-urban panchayats operate with minimal budgets, volunteer-based collectors, and no digital tracking. Open dumping and burning remain the default disposal methods.",
    capabilities: [
      { icon: Smartphone, text: "Low-cost per-household model - just ₹4/household/month" },
      { icon: WifiOff, text: "Offline-capable app for areas with poor connectivity" },
      { icon: Users, text: "Women SHG members trained and employed as collectors" },
      { icon: Leaf, text: "Zero Waste Centre integration for composting and dry waste" },
      { icon: Languages, text: "Multi-language UI - Kannada, Telugu, Tamil, Hindi, English and more" },
    ],
    outcomes: [
      "Transition from untracked dumping to structured waste collection",
      "Improved source segregation through continuous monitoring",
      "Local employment generation through organized collection systems",
      "Operational visibility for panchayat leaders and field supervisors",
      "Revenue opportunities from composting and dry waste recovery",
      "Digital record of village-level waste management performance",
    ],
  },
  {
    icon: Building,
    title: "For Apartments & Gated Communities",
    subtitle: "Residential complexes managing internal waste collection across hundreds of flats",
    scale: "200–2,000 units per deployment",
    color: "from-teal-500 to-cyan-500",
    bgScene: "from-teal-50 via-cyan-50/30 to-white",
    img: "/images/illustrations/solution-apartment.png",
    problem:
      "Large residential complexes manage waste internally but lack tracking tools. Resident compliance is inconsistent, composting is underutilized, and bulk waste generators face regulatory pressure.",
    capabilities: [
      { icon: QrCode, text: "Flat-wise QR codes for individual tracking per unit" },
      { icon: BarChart3, text: "Daily collection status visible to all residents" },
      { icon: Leaf, text: "Material logging for composting and dry waste output" },
      { icon: Shield, text: "Waste generation tracking with verifiable data" },
      { icon: AlertTriangle, text: "Automatic flags for non-compliant flats" },
    ],
    outcomes: [
      "Flat-level accountability for segregation practices",
      "Daily visibility of collection completion status for residents",
      "Reduced waste sent to landfill through better monitoring",
      "Structured tracking of composting and recyclable material output",
      "Transparent waste records for resident welfare associations",
      "Improved participation in internal sustainability initiatives",
    ],
  },
  {
    icon: Factory,
    title: "For Bulk Waste Generators & Campuses",
    subtitle: "Hotels, universities, markets, and institutions with regulatory waste compliance needs",
    scale: "50–500 units / waste points per deployment",
    color: "from-amber-500 to-orange-500",
    bgScene: "from-amber-50 via-orange-50/30 to-white",
    img: "/images/illustrations/solution-campus.png",
    problem:
      "Hotels, restaurants, markets, and campuses generate large volumes of waste and face regulatory mandates to process waste on-site. Most lack digital proof of compliance for audits.",
    capabilities: [
      { icon: BarChart3, text: "Daily waste volume logging with photo evidence" },
      { icon: Shield, text: "Digital audit trail for waste handling verification" },
      { icon: Leaf, text: "Integration with waste processing facility tracking" },
      { icon: CheckCircle2, text: "Digital records for operational audits" },
    ],
    outcomes: [
      "Clear tracking of daily waste generation volumes",
      "Documented proof of internal waste handling processes",
      "Improved operational control over multiple waste points",
      "Reduced processing and transportation inefficiencies",
      "Structured digital records for internal audits and reviews",
      "Better coordination between housekeeping and waste vendors",
    ],
  },
  {
    icon: Heart,
    title: "For NGOs & Impact Programs",
    subtitle: "Organizations seeking measurable, verifiable outcomes for waste management interventions",
    scale: "Multi-location deployments across regions",
    color: "from-rose-500 to-pink-500",
    bgScene: "from-rose-50 via-pink-50/30 to-white",
    img: "/images/illustrations/solution-ngo.png",
    problem:
      "NGOs and donor-funded programs running waste management initiatives need verifiable outcome data to prove impact, justify funding, and scale interventions to new regions.",
    capabilities: [
      { icon: BarChart3, text: "Real-time deployment dashboards for program monitoring" },
      { icon: Users, text: "Household-level behavior change tracking (segregation scores)" },
      { icon: CheckCircle2, text: "Community engagement and participation metrics" },
      { icon: Shield, text: "Exportable data for grant applications and impact reports" },
    ],
    outcomes: [
      "Measurable waste diversion and segregation improvement data",
      "Household-level behavior change tracking across program areas",
      "Real-time visibility into field implementation progress",
      "Evidence-based reporting for donors and stakeholders",
      "Replication-ready operational model for scaling interventions",
      "Structured datasets for impact documentation and research",
    ],
  },
];

export default function SolutionsPage() {
  useSEO({
    title: "Solutions - GreenPath",
    description: "Tailored waste management for municipalities, panchayats, apartments, townships, and NGOs. Offline-first, multi-language, QR-based tracking for every community type.",
    path: "/solutions",
  });

  return (
    <PublicLayout>
      <style>{css}</style>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <AnimateOnScroll>
              <div className="max-w-xl">
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  SOLUTIONS
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6">
                  Tailored for your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    community type
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                  Whether you're a gated-community, village panchayat or a city municipality,
                  GreenPath fits your waste management workflow - with features
                  that work at every scale.
                </p>
              </div>
            </AnimateOnScroll>

            {/* Hero illustration - panchayat scene */}
            <AnimateOnScroll delay={200} className="hidden lg:block">
              <div className="relative float-gentle">
                <img
                  src="/images/illustrations/solution-panchayat.png"
                  alt="GreenPath deployed in a rural panchayat with women collectors and QR tracking"
                  className="w-full h-auto"
                  style={{ filter: "drop-shadow(0 20px 40px rgba(5,150,105,0.12))" }}
                />
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* SOLUTION BLOCKS */}
      <div className="divide-y divide-slate-100">
        {solutions.map((sol, i) => (
          <section key={sol.title} className="py-8 md:py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimateOnScroll>
                {/* Scene illustration - FULL WIDTH at top, like a story panel */}
                <div className={`relative rounded-3xl bg-gradient-to-br ${sol.bgScene} p-8 md:p-12 mb-10 overflow-hidden`}>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Illustration - LARGE, at designed 500×350 size */}
                    <div className={`flex-shrink-0 ${i % 2 !== 0 ? 'md:order-2' : ''}`}>
                      <img
                        src={sol.img}
                        alt={sol.title}
                        className="w-full max-w-[500px] h-auto hover:scale-[1.03] transition-transform duration-700"
                        style={{ filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.08))" }}
                      />
                    </div>

                    {/* Title + problem overlaid on the scene */}
                    <div className={`flex-1 min-w-0 ${i % 2 !== 0 ? 'md:order-1' : ''}`}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sol.color} flex items-center justify-center shadow-lg`}>
                          <sol.icon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{sol.title}</h2>
                          <p className="text-sm text-slate-500 mt-1">{sol.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{sol.problem}</p>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>

              {/* Capabilities + Outcomes */}
              <AnimateOnScroll delay={150}>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* What GreenPath provides */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 mb-6 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      How GreenPath Solves It
                    </h3>
                    <div className="space-y-4">
                      {sol.capabilities.map((cap) => (
                        <div key={cap.text} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <cap.icon className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="text-sm text-slate-700 leading-relaxed">{cap.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expected outcomes */}
                  <div className={`bg-gradient-to-br ${sol.bgScene} rounded-2xl p-8`}>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 mb-6 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Expected Outcomes
                    </h3>
                    <div className="space-y-4">
                      {sol.outcomes.map((item) => (
                        <div key={item} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-sm text-slate-700 font-medium leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            </div>
          </section>
        ))}
      </div>

      <CTABanner
        heading="Find the right solution for your community"
        primaryLabel="Request Demo"
        secondaryLabel="See case studies"
        secondaryHref="/case-studies"
      />
    </PublicLayout>
  );
}
