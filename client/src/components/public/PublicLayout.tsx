import { type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <Navbar />
      <main className="overflow-x-hidden">{children}</main>
      <PublicFooter />
    </div>
  );
}
