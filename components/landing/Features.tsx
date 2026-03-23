const features = [
  {
    icon: '📊',
    title: 'Compliance Score',
    description:
      'Instantly see how compliant your business is with a clear score based on your filings, policies, and obligations.',
  },
  {
    icon: '🔔',
    title: 'Smart Alerts',
    description:
      'Get notified about upcoming filing deadlines, overdue obligations, and compliance risks before they become problems.',
  },
  {
    icon: '🏢',
    title: 'Company Lookup',
    description:
      'Connect your UK company in seconds using your Companies House number. We pull your data automatically.',
  },
  {
    icon: '📄',
    title: 'AI Policy Generator',
    description:
      'Generate tailored compliance policies — GDPR, health & safety, employment — in minutes using AI.',
  },
]

export default function Features() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Everything you need to stay compliant
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            One platform for all your UK regulatory requirements.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <span className="text-4xl">{feature.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm leading-6 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
