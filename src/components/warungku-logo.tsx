export function WarungkuLogo({ className }: { className?: string }) {
  return (
    <img
      alt="WarungKu Logo"
      src="/warungku-logo.jpg"
      className={className ?? 'h-16 w-auto object-contain'}
    />
  )
}
