import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { PublicLayout } from "@/components/public/PublicLayout";
import { AnimateOnScroll } from "@/components/public/AnimateOnScroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Mail,
  Clock,
  Globe,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const orgTypes = [
  "Municipality / Urban Local Body",
  "Gram Panchayat",
  "Apartment Complex / Society",
  "Gated Community / Township",
  "Campus / Institution",
  "NGO / Impact Organization",
  "Bulk Waste Generator",
  "Other",
];

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Puducherry", "Chandigarh",
];

export default function ContactPage() {
  const { toast } = useToast();

  useSEO({
    title: "Contact — GreenPath",
    description: "Get in touch with the GreenPath team. Request a demo, discuss partnerships, or ask about deploying waste management technology in your community.",
    path: "/contact",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    orgName: "",
    orgType: "",
    households: "",
    state: "",
    contactName: "",
    email: "",
    phone: "",
    message: "",
  });

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.contactName,
          email: form.email,
          phone: form.phone,
          organizationName: form.orgName,
          organizationType: form.orgType,
          estimatedHouseholds: form.households,
          state: form.state,
          message: form.message,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast({ title: "Success!", description: "Your inquiry has been submitted. We'll be in touch within 24 hours." });
      } else {
        throw new Error("Failed to submit");
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-50 to-emerald-50/30 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-3xl">
                <span className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 block">
                  GET IN TOUCH
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                  Deploy GreenPath in your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    community
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
                  Fill in your details and our team will reach out within 24 hours.
                </p>
              </div>
              <div className="hidden lg:block relative">
                <div className="absolute -inset-10 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl animate-pulse" />
                <img
                  src="/images/illustrations/contact-deploy.png"
                  alt="Tech team collaborating with community"
                  className="relative w-full max-w-[500px] h-auto mx-auto float-slow"
                  style={{ filter: "drop-shadow(0 15px 40px rgba(5,150,105,0.12))" }}
                />
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <AnimateOnScroll>
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                  Thank you for reaching out!
                </h2>
                <p className="text-lg text-slate-600 max-w-md mx-auto">
                  We've received your inquiry and will get back to you within 24
                  hours on business days.
                </p>
              </div>
            </AnimateOnScroll>
          ) : (
            <AnimateOnScroll>
              <div className="grid lg:grid-cols-[1fr_2.2fr] gap-10 items-start">
                {/* Side Illustration */}
                <div className="hidden lg:block sticky top-32">
                  <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-100">
                    <img
                      src="/images/illustrations/contact-support.png"
                      alt="Dedicated support team"
                      className="w-full h-auto float-gentle mb-6"
                      style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.05))" }}
                    />
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <p className="text-sm text-slate-600">Free deployment consultation</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <p className="text-sm text-slate-600">Custom pricing for scale</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <p className="text-sm text-slate-600">24/7 technical support</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    {/* Left column */}
                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="orgName" className="text-sm font-medium text-slate-700">
                          Organization Name *
                        </Label>
                        <Input
                          id="orgName"
                          required
                          value={form.orgName}
                          onChange={(e) => updateForm("orgName", e.target.value)}
                          placeholder="e.g., Billapura Gram Panchayat"
                          className="mt-2 h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <Label htmlFor="orgType" className="text-sm font-medium text-slate-700">
                          Organization Type *
                        </Label>
                        <select
                          id="orgType"
                          required
                          value={form.orgType}
                          onChange={(e) => updateForm("orgType", e.target.value)}
                          className="mt-2 w-full h-12 rounded-xl border border-slate-200 px-4 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        >
                          <option value="">Select type...</option>
                          {orgTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="households" className="text-sm font-medium text-slate-700">
                          Estimated Households / Units *
                        </Label>
                        <Input
                          id="households"
                          type="number"
                          required
                          value={form.households}
                          onChange={(e) => updateForm("households", e.target.value)}
                          placeholder="e.g., 500"
                          className="mt-2 h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <Label htmlFor="state" className="text-sm font-medium text-slate-700">
                          State / Region *
                        </Label>
                        <select
                          id="state"
                          required
                          value={form.state}
                          onChange={(e) => updateForm("state", e.target.value)}
                          className="mt-2 w-full h-12 rounded-xl border border-slate-200 px-4 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        >
                          <option value="">Select state...</option>
                          {indianStates.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="contactName" className="text-sm font-medium text-slate-700">
                          Contact Person Name *
                        </Label>
                        <Input
                          id="contactName"
                          required
                          value={form.contactName}
                          onChange={(e) => updateForm("contactName", e.target.value)}
                          placeholder="Your full name"
                          className="mt-2 h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => updateForm("email", e.target.value)}
                          placeholder="you@organization.com"
                          className="mt-2 h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                          Phone Number (optional)
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => updateForm("phone", e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          className="mt-2 h-12 rounded-xl border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <Label htmlFor="message" className="text-sm font-medium text-slate-700">
                          Message / Requirements
                        </Label>
                        <textarea
                          id="message"
                          rows={4}
                          value={form.message}
                          onChange={(e) => updateForm("message", e.target.value)}
                          placeholder="Tell us about your waste management needs..."
                          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-10 py-6 text-base rounded-xl shadow-lg shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Request Deployment Consultation
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-slate-400">
                      We respond within 24 hours on business days.
                    </p>
                  </div>
                </form>
              </div>
            </AnimateOnScroll>
          )}
        </div>
      </section>

      {/* Contact info cards */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Mail, title: "Email", value: "support@greenpathorg.social" },
              { icon: Clock, title: "Response Time", value: "Within 24 hours on business days" },
              { icon: Globe, title: "Service Area", value: "Pan-India deployment support" },
            ].map((card, i) => (
              <AnimateOnScroll key={card.title} delay={i * 100}>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-center">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <card.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{card.title}</h3>
                  <p className="text-sm text-slate-500">{card.value}</p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>

          {/* Direct Contact Strip */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/918919278458?text=Hi%2C%20I%27m%20interested%20in%20deploying%20GreenPath%20in%20our%20community."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Chat on WhatsApp
            </a>
            <a
              href="mailto:support@greenpathorg.social?subject=Schedule%20a%20Call%20-%20GreenPath%20Demo"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Clock className="w-5 h-5 text-emerald-600" />
              Schedule a Call
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
