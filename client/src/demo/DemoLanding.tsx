import { useLocation } from "wouter";
import { Briefcase, Truck, Home, ClipboardCheck, ArrowRight, Shield, RefreshCw, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/public/PublicLayout";
import { useSEO } from "@/hooks/useSEO";
import type { DemoRole } from "./DemoContext";

const ROLES: Array<{
  role: DemoRole;
  label: string;
  icon: typeof Briefcase;
  color: string;
  bgColor: string;
  description: string;
  features: string[];
}> = [
  {
    role: "manager",
    label: "Village Manager",
    icon: Briefcase,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    description: "Oversee waste collection operations, track performance, and manage your village team.",
    features: [
      "Real-time collection dashboard",
      "Household performance analytics",
      "Collector & vehicle management",
      "Issue tracking & announcements",
    ],
  },
  {
    role: "collector",
    label: "Waste Collector",
    icon: Truck,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Record daily collections, scan QR codes, and manage your route efficiently.",
    features: [
      "QR-based collection logging",
      "Daily route & progress view",
      "Household waste rating",
      "Attendance & shift tracking",
    ],
  },
  {
    role: "generator",
    label: "Household",
    icon: Home,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Track your waste collection history, rate service quality, and stay informed.",
    features: [
      "Collection history & ratings",
      "Segregation score tracking",
      "Issue reporting to manager",
      "Vehicle arrival notifications",
    ],
  },
  {
    role: "fieldworker",
    label: "Field Worker",
    icon: ClipboardCheck,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Map QR codes to households and help digitize village waste tracking.",
    features: [
      "QR code → Household mapping",
      "GPS location tagging",
      "Batch QR assignment",
      "Progress tracking",
    ],
  },
];

export default function DemoLanding() {
  const [, setLocation] = useLocation();

  useSEO({
    title: "GreenPath Demo — Interactive Waste Management Dashboard",
    description: "Try GreenPath's waste management platform — explore Manager, Collector, Household, and Field Worker dashboards with realistic demo data. No signup required.",
    path: "/demo",
  });

  return (
    <PublicLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Zap className="w-3.5 h-3.5" />
            Interactive Demo — No signup needed
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Experience GreenPath in Action
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mb-2">
            Explore every feature of our waste management system. Pick a role below and interact
            with a fully working dashboard — powered by realistic demo data.
          </p>
          <p className="text-slate-400 text-sm">
            All data resets on refresh • No real information is stored
          </p>
        </div>

        {/* Role Cards */}
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {ROLES.map(({ role, label, icon: Icon, color, bgColor, description, features }) => (
              <button
                key={role}
                onClick={() => setLocation(`/demo/${role}`)}
                className="group text-left bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5"
              >
                {/* Icon + Title */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`${bgColor} p-2.5 rounded-xl group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">{label}</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{description}</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 ml-1 mb-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={`flex items-center gap-1.5 ${color} font-semibold text-sm group-hover:gap-2.5 transition-all`}>
                  Explore Dashboard
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { icon: Lock, label: "No signup required", sub: "Jump right in" },
                { icon: Shield, label: "No real data", sub: "100% mock data" },
                { icon: Zap, label: "Fully interactive", sub: "Click everything" },
                { icon: RefreshCw, label: "Resets on refresh", sub: "Start fresh anytime" },
              ].map(({ icon: TIcon, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <TIcon className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-800">{label}</span>
                  <span className="text-xs text-slate-400">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-5xl mx-auto px-4 pb-16 text-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Ready to digitize your village?
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            GreenPath is trusted by municipalities and NGOs across India
          </p>
          <Button
            onClick={() => setLocation("/contact")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            Contact Us to Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
