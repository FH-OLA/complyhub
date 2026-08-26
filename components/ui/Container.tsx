// ---------------------------------------------------------------------------
// Container
//
// Shared responsive page container. Centralises the max-width and horizontal
// padding used across all authenticated layouts, landing pages, pricing, and
// upgrade — so responsive padding is adjusted in one place.
//
// px-4 on mobile (320px+) → px-6 on sm (640px+)
// max-w-5xl caps content at 1024px on large screens.
// ---------------------------------------------------------------------------

interface ContainerProps {
  children: React.ReactNode
  className?: string
}

export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`mx-auto max-w-5xl w-full px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  )
}
