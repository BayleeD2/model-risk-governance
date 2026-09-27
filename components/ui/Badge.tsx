type BadgeVariant = "draft" | "active" | "retired" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  draft: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  active: "bg-green-100 text-green-700 ring-green-200",
  retired: "bg-red-100 text-red-600 ring-red-200",
  default: "bg-blue-100 text-blue-700 ring-blue-200",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
