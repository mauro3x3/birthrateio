import { cn } from "@/lib/utils";

/** Gold pyramid on navy — readable at favicon size, matches the header tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="7" fill="#0a2540" />
      <rect x="7" y="7" width="18" height="18" rx="5" fill="none" stroke="#c9a24d" strokeWidth="1.25" />
      <rect x="13" y="9.5" width="6" height="3.5" rx="0.6" fill="#c9a24d" />
      <rect x="10.5" y="14.25" width="11" height="3.5" rx="0.6" fill="#c9a24d" />
      <rect x="8" y="19" width="16" height="3.5" rx="0.6" fill="#c9a24d" />
    </svg>
  );
}
