import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
}

export function Card({ header, children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {header && (
        <div className="border-b border-zinc-200 px-6 py-4">{header}</div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}
