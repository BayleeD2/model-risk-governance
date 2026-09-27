export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
          A
        </span>
        <span className="text-xl font-semibold text-zinc-900">Model Risk Governance</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
