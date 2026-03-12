import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Menu,
  X,
  LogIn,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/product", label: "Product" },
  { href: "/solutions", label: "Solutions" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "/home";
    return location.startsWith(href);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          hasScrolled
            ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100"
            : "bg-white/80 backdrop-blur-xl"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src="/logos/logo-full.svg"
                alt="GreenPath"
                className="h-9 md:h-10 w-auto"
              />
            </button>

            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => setLocation(link.href)}
                  className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive(link.href)
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Desktop CTA buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated && user ? (
                <Button
                  onClick={() => setLocation("/")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setLocation("/login")}
                    className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                  <Button
                    onClick={() => setLocation("/contact")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Request Demo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isMobileOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />

        {/* Menu panel */}
        <div
          className={`absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-xl transition-all duration-300 ${
            isMobileOpen
              ? "translate-y-0 opacity-100"
              : "-translate-y-4 opacity-0"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => setLocation(link.href)}
                  className={`text-left px-4 py-3 text-base font-medium rounded-xl transition-colors ${
                    isActive(link.href)
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 mt-3 pt-4 flex flex-col gap-2">
              {isAuthenticated && user ? (
                <Button
                  onClick={() => setLocation("/")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/login")}
                    className="w-full border-slate-200 text-slate-700 font-semibold py-3 rounded-xl"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                  <Button
                    onClick={() => setLocation("/contact")}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl"
                  >
                    Request Demo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed nav */}
      <div className="h-16 md:h-18" />
    </>
  );
}
