import { PublicLayout } from "@/components/public/PublicLayout";
import { useSEO } from "@/hooks/useSEO";
import { AnimateOnScroll } from "@/components/public/AnimateOnScroll";
import { SectionHeading } from "@/components/public/SectionHeading";
import { CTABanner } from "@/components/public/CTABanner";
import {
  QrCode,
  Eye,
  BarChart3,
  Heart,
  Shield,
  Users,
  ExternalLink,
  Tag,
} from "lucide-react";

const css = `
  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  .float-gentle { animation: gentleFloat 6s ease-in-out infinite; }
  .float-delayed { animation: gentleFloat 6s ease-in-out 1.5s infinite; }
`;

const articles = [
  {
    title: "How a Karnataka Village Achieved 90% Waste Segregation & Grew a Food Forest",
    source: "The Better India",
    category: "Field Deployment",
    description:
      "When students and faculty from Azim Premji University stepped beyond campus, they worked with a panchayat near Bengaluru to rethink waste, composting, and shared responsibility.",
    url: "https://thebetterindia.com/sustainability/azim-premji-university-college-campus-sustainability-bilapura-panchayat-waste-management-system-11074332",
    date: "2025",
  },
  {
    title: "Billapura Panchayat Cleans Itself in Two Years",
    source: "SustainabilityNext",
    category: "Waste Governance",
    description:
      "The story of how Billapura Panchayat transformed from open dumping and burning to a 90% source segregation model with community participation.",
    url: "https://sustainabilitynext.in/billapura-panchayat-cleans-itself-in-two-years/",
    date: "2025",
  },
  {
    title: "Bengaluru's Billapura Panchayat Achieves Zero Waste Success",
    source: "LinkedIn",
    category: "Sanitation Innovation",
    description:
      "Nearly 90% source segregation, Zero Waste Centre with recycled plastic roofing, women SHG members driving collection — the full story of transformation.",
    url: "https://www.linkedin.com/posts/anjor-bhaskar-4426189_zerowaste-zerowaste-sustainablewastemanagement-activity-7405693617014702082-AuUc/",
    date: "2025",
  },
];

export default function AboutPage() {
  useSEO({
    title: "About — GreenPath",
    description: "Born from the field, not a boardroom. Built through Azim Premji University collaboration with Billapura Panchayat. Technology that serves communities.",
    path: "/about",
  });

  return (
    <PublicLayout>
      <style>{css}</style>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative bg-gradient-to-br from-slate-50 to-emerald-50/30 py-20 md:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="max-w-3xl">
              <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                ABOUT GREENPATH
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6">
                Technology that serves{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                  communities
                </span>
                , not the other way around
              </h1>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                We're building the digital infrastructure for accountable,
                transparent waste management — one panchayat at a time.
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════════ OUR STORY — Large origin illustration ═══════════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimateOnScroll>
              <div>
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  OUR STORY
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
                  Born from the field, not a boardroom
                </h2>
                <div className="space-y-4 text-slate-600 leading-relaxed">
                  <p>
                    GreenPath wasn't built as a startup pitch. It was built
                    because a community needed it.
                  </p>
                  <p>
                    In 2023, when students and faculty from Azim Premji
                    University began working with Billapura Panchayat on waste
                    management, they discovered the core problem wasn't
                    collection — it was <strong>visibility</strong>. No one could
                    answer basic questions: How many households were served? How
                    well was waste being segregated? Was the collector showing up?
                  </p>
                  <p>
                    That gap between action and accountability is what GreenPath fills.
                  </p>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={200}>
              <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-[2rem] blur-3xl" />
                <img
                  src="/images/illustrations/about-origin.png"
                  alt="GreenPath origin — university students collaborating with panchayat community"
                  className="relative w-full h-auto float-gentle"
                  style={{ filter: "drop-shadow(0 15px 40px rgba(5,150,105,0.12))" }}
                />
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-emerald-100/50 float-delayed">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { year: "2023", event: "University-Panchayat collaboration" },
                      { year: "2024", event: "GreenPath developed & deployed" },
                      { year: "2025", event: "8+ panchayats adopting" },
                    ].map((item) => (
                      <div key={item.year} className="text-center">
                        <div className="text-sm font-bold text-emerald-600">{item.year}</div>
                        <div className="text-[10px] text-slate-500 leading-tight">{item.event}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>

          <AnimateOnScroll delay={100}>
            <div className="mt-12 bg-emerald-50 rounded-3xl p-8 md:p-10 max-w-4xl">
              <p className="text-slate-700 leading-relaxed">
                Built by <strong>Balaji Nayak</strong> (B.Tech Computer Science, LPU)
                during his internship, alongside <strong>Sreeja Gummula</strong> (BA
                History, Azim Premji University) — GreenPath was designed as a practical
                tool rooted in the needs of real communities. Every feature exists because
                a collector, manager, or panchayat leader asked for it.
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ═══════════ FOUNDERS ═══════════ */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading label="TEAM" title="The team behind GreenPath" />
          </AnimateOnScroll>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: "Balaji Nayak Bardawal",
                title: "Co-Founder & CEO",
                education: "B.Tech Computer Science, Lovely Professional University",
                bio: "Built GreenPath's entire technology stack during his internship with Azim Premji University. Leads product development, engineering, and platform scaling. Designed the offline-first architecture and multi-language system.",
                photo: "/images/founders/balaji.png",
              },
              {
                name: "Sreeja Gummula",
                title: "Co-Founder & CDO",
                education: "BA History, Azim Premji University",
                bio: "Co-created GreenPath through a course on Sustainable Waste Management. Leads partnerships, deployment strategy, and community engagement. Drives field operations and collector training programs.",
                photo: "/images/founders/sreeja.png",
              },
            ].map((founder, i) => (
              <AnimateOnScroll key={founder.name} delay={i * 150}>
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="p-8">
                    <div className="flex items-center gap-5 mb-6">
                      <img
                        src={founder.photo}
                        alt={founder.name}
                        className="w-20 h-20 rounded-2xl object-cover shadow-lg"
                      />
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{founder.name}</h3>
                        <p className="text-sm font-semibold text-emerald-600">{founder.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{founder.education}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{founder.bio}</p>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PARTNERS ═══════════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <SectionHeading
              label="ECOSYSTEM"
              title="Collaborating with institutions that share our mission"
            />
          </AnimateOnScroll>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Azim Premji University", role: "Academic partner, research collaboration, field deployment", initial: "APU", color: "from-blue-500 to-indigo-500" },
              { name: "Hasiru Dala", role: "On-ground waste management expertise, collector training", initial: "HD", color: "from-emerald-500 to-teal-500" },
              { name: "Billapura Gram Panchayat", role: "First deployment partner — 2000+ households, 90% segregation", initial: "BGP", color: "from-teal-500 to-cyan-500" },
            ].map((partner, i) => (
              <AnimateOnScroll key={partner.name} delay={i * 100}>
                <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all duration-300 text-center hover:-translate-y-1">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${partner.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <span className="text-lg font-bold text-white">{partner.initial}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{partner.name}</h3>
                  <p className="text-sm text-slate-500">{partner.role}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PRESS & INSIGHTS — Merged from BlogPage ═══════════ */}
      <section id="press" className="bg-slate-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
              <div>
                <SectionHeading
                  label="PRESS & INSIGHTS"
                  title="Featured in national media"
                  subtitle="Dispatches from the intersection of technology, waste management, and community action."
                />
              </div>
              <div className="hidden lg:block">
                <img
                  src="/images/illustrations/community-meeting-ngo.png"
                  alt="Community meeting with NGO partners discussing waste management"
                  className="w-full max-w-[400px] h-auto mx-auto hover:scale-105 transition-transform duration-700"
                  style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.06))" }}
                />
              </div>
            </div>
          </AnimateOnScroll>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {articles.map((article, i) => (
              <AnimateOnScroll key={article.title} delay={i * 100}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full"
                >
                  <div className="bg-gradient-to-br from-emerald-100 to-teal-50 h-36 flex items-center justify-center">
                    <div className="text-center px-6">
                      <ExternalLink className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <span className="text-sm font-medium text-emerald-600">
                        {article.source}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <Tag className="w-3 h-3" />
                        {article.category}
                      </span>
                      <span className="text-xs text-slate-400">{article.date}</span>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                      {article.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600">
                      Read article
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </a>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ OUR AMBITION ═══════════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="grid lg:grid-cols-[1fr_300px] gap-10 items-center mb-10">
              <SectionHeading
                label="OUR AMBITION"
                title="Where we're building toward"
              />
              <div className="hidden lg:block">
                <img
                  src="/images/illustrations/impact-circular.png"
                  alt="Circular economy — waste transformed into resources"
                  className="w-full max-w-[280px] h-auto mx-auto float-gentle"
                  style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.06))" }}
                />
              </div>
            </div>
          </AnimateOnScroll>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                emoji: "🌐",
                title: "India's Largest Decentralized Waste Data Network",
                desc: "Every household digitized, every collection tracked — building the data layer for waste governance at national scale.",
              },
              {
                emoji: "🌱",
                title: "Enable Climate Financing & Carbon Reporting",
                desc: "Verified waste diversion data to unlock carbon credits, ESG reporting, and green financing for communities.",
              },
              {
                emoji: "🏛️",
                title: "Digital Backbone of Local Sanitation Governance",
                desc: "Become the standard operating system for SBM, SLWM, and municipal waste management compliance across India.",
              },
            ].map((item, i) => (
              <AnimateOnScroll key={item.title} delay={i * 100}>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className="text-3xl mb-4">{item.emoji}</div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ VISION — Dark immersive ═══════════ */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-emerald-950" />
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400 mb-4 block">
                VISION
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
                Where we're going
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
                Our long-term vision is to build zero-waste digital infrastructure
                for every community in India.
              </p>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: QrCode, text: "Every household has a digital waste identity" },
                { icon: Eye, text: "Every collection is tracked and transparent" },
                { icon: BarChart3, text: "Every community accesses its own data" },
                { icon: Heart, text: "Waste workers are recognized and compensated" },
                { icon: Shield, text: "Data drives governance, not guesswork" },
                { icon: Users, text: "Communities own their waste transformation" },
              ].map((item) => (
                <div key={item.text} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 flex items-start gap-3">
                  <item.icon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200}>
            <p className="text-center text-slate-400 mt-10 italic text-lg">
              We're starting with panchayats. We're building for cities.
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      <CTABanner
        heading="Want to join our mission?"
        primaryLabel="Deploy GreenPath"
        secondaryLabel="Get in touch"
        secondaryHref="/contact"
      />
    </PublicLayout>
  );
}
