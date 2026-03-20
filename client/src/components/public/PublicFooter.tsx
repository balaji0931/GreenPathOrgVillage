import { useLocation } from "wouter";

const productLinks = [
  { label: "Household Tracking", href: "/product" },
  { label: "Collector Operations", href: "/product" },
  { label: "Analytics & Reporting", href: "/product" },
  { label: "Offline Mode", href: "/product" },
  { label: "Issue Management", href: "/product" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Data Protection", href: "/data-protection" },
];

export function PublicFooter() {
  const [, setLocation] = useLocation();

  return (
    <footer className="bg-slate-900 text-slate-400">
      {/* Press mentions bar */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <span className="text-slate-500 font-medium">Decentralised waste initiative context featured in</span>
            <a
              href="https://thebetterindia.com/sustainability/azim-premji-university-college-campus-sustainability-bilapura-panchayat-waste-management-system-11074332"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition-colors font-medium"
            >
              The Better India
            </a>
            <span className="text-slate-700">·</span>
            <a
              href="https://sustainabilitynext.in/billapura-panchayat-cleans-itself-in-two-years/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition-colors font-medium"
            >
              SustainabilityNext
            </a>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => setLocation("/")} className="block mb-4">
              <img
                src="/logos/logo-dark.svg"
                alt="GreenPath"
                className="h-8 w-auto"
              />
            </button>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Digital waste management for communities across India.
            </p>
            <p className="text-sm text-slate-500">
              support@greenpathorg.social
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => setLocation(link.href)}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => setLocation(link.href)}
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} GreenPath. All rights reserved.</span>
            <span>Built in India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
