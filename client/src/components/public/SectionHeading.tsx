interface SectionHeadingProps {
  label?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  dark?: boolean;
}

export function SectionHeading({ 
  label, 
  title, 
  subtitle, 
  align = "center",
  dark = false 
}: SectionHeadingProps) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-3xl ${alignment} mb-12 md:mb-16`}>
      {label && (
        <span className={`inline-block text-sm font-semibold uppercase tracking-widest mb-4 ${
          dark ? "text-emerald-400" : "text-emerald-600"
        }`}>
          {label}
        </span>
      )}
      <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 ${
        dark ? "text-white" : "text-slate-900"
      }`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-lg md:text-xl leading-relaxed ${
          dark ? "text-slate-300" : "text-slate-600"
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
