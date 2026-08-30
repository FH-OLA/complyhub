const features = [
  {
    icon: CalendarIcon,
    title: 'Deadline Monitoring',
    description:
      'Track Confirmation Statement and Annual Accounts deadlines for every company you manage. See exactly how many days remain.',
  },
  {
    icon: ShieldIcon,
    title: 'Company Health',
    description:
      'Live compliance scores based on real Companies House data. Instantly see which companies need attention.',
  },
  {
    icon: StarIcon,
    title: 'AI Compliance Advisor',
    tag: 'Pro',
    description:
      'Ask questions about your company\'s compliance status and get answers grounded in verified company data and curated guidance.',
  },
  {
    icon: FileIcon,
    title: 'AI Filing Assistant',
    tag: 'Pro',
    description:
      'Step-by-step preparation guides for Confirmation Statements and Annual Accounts, with links to official filing destinations.',
  },
  {
    icon: BellIcon,
    title: 'Email Alerts',
    description:
      'Daily notifications about upcoming deadlines and overdue filings, delivered before problems become penalties.',
  },
]

export default function Features() {
  return (
    <section className="border-t border-border-light bg-surface px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[960px]">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">
            Everything you need to stay compliant
          </h2>
          <p className="mt-3 text-base text-text-2">
            One platform for your UK regulatory obligations.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-[800px] gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--card-radius)] bg-accent-muted text-accent">
                <feature.icon />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-1">{feature.title}</h3>
                {feature.tag && (
                  <span className="rounded-[var(--pill-radius)] bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
                    {feature.tag}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-text-2">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="14" height="14" rx="2" />
      <path d="M3 8h14M7 2v4M13 2v4" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2l7 3v5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V5l7-3z" />
      <path d="M7.5 10l2 2 3.5-4" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2l1.5 5H17l-4 3.5 1.5 5.5L10 13l-4.5 3 1.5-5.5L3 7h5.5z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7l-5-5z" />
      <path d="M12 2v5h5M7 11h6M7 14h4" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2a5 5 0 00-5 5v3l-1.5 2.5h13L15 10V7a5 5 0 00-5-5zM8.5 16.5a1.5 1.5 0 003 0" />
    </svg>
  )
}
