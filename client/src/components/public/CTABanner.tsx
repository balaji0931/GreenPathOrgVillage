import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { useLocation } from "wouter";

interface CTABannerProps {
  heading?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function CTABanner({
  heading = "Ready to deploy GreenPath in your community?",
  subtitle = "Get in touch with our team and start your deployment journey.",
  primaryLabel = "Book a Consultation",
  primaryHref = "/contact",
  secondaryLabel = "View Pricing",
  secondaryHref = "/pricing",
}: CTABannerProps) {
  const [, setLocation] = useLocation();

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
          {heading}
        </h2>
        <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation(primaryHref)}
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <CalendarCheck className="w-5 h-5 mr-2" />
            {primaryLabel}
          </Button>
          <Button
            onClick={() => setLocation(secondaryHref)}
            variant="outline"
            size="lg"
            className="border-slate-500 hover:bg-white/10 hover:text-white font-semibold px-8 py-6 text-lg rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            {secondaryLabel}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
