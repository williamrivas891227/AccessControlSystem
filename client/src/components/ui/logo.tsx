export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/2atech.png"
        alt="2A Tech Logo"
        className="h-12 w-auto"
      />
    </div>
  );
}