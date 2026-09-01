import PublicNav from '@/components/landing/PublicNav'
import Footer from '@/components/landing/Footer'

export const metadata = {
  title: 'Terms of Service — ComplyHub',
}

export default function Terms() {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <PublicNav />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[640px]">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-text-3">
            Last updated: September 2026 · Subject to legal review
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-text-2">
            <Section title="1. About ComplyHub">
              <p>
                ComplyHub is a compliance monitoring service for UK businesses. It retrieves
                publicly available filing data from Companies House, tracks filing deadlines,
                calculates compliance status and sends reminder emails. ComplyHub is operated
                by Laudem Enterprise Limited.
              </p>
              <p className="mt-2">
                By creating an account or using ComplyHub, you agree to these terms. If you do
                not agree, do not use the service.
              </p>
            </Section>

            <Section title="2. Eligibility and accounts">
              <p>
                You must be at least 18 years old to use ComplyHub. You are responsible for
                maintaining the security of your account credentials and for all activity that
                occurs under your account. You agree to provide accurate information when
                creating your account and to keep it up to date.
              </p>
            </Section>

            <Section title="3. Companies House data">
              <p>
                ComplyHub retrieves company information from the publicly available Companies
                House API. This data is provided by Companies House under the terms of the{' '}
                <span className="text-text-1">Open Government Licence</span>. We display this
                data for informational purposes and do not guarantee its accuracy, completeness
                or timeliness. You should always verify important information directly with
                Companies House.
              </p>
            </Section>

            <Section title="4. Compliance monitoring — important limitations">
              <p className="font-medium text-text-1">
                ComplyHub is a monitoring and reminder tool only. It is not a substitute for
                professional legal, accounting or company secretarial advice.
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Compliance status and health scores are calculated based on publicly available Companies House filing data and may not reflect your complete obligations.</li>
                <li>Filing deadlines shown are derived from Companies House records and should be verified independently before relying on them.</li>
                <li>You remain solely responsible for making all filings with Companies House on time and for ensuring your company meets its legal obligations.</li>
                <li>ComplyHub does not file documents on your behalf and does not interact with Companies House on your behalf.</li>
              </ul>
            </Section>

            <Section title="5. AI features">
              <p>
                Pro plan subscribers have access to AI-powered features, including the
                Compliance Advisor and Filing Assistant. These features are provided to help
                you understand your filing obligations and are subject to the following
                limitations:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>AI responses are generated based on the company data available from Companies House and curated filing guidance. They may be incomplete or inaccurate.</li>
                <li>AI features do not provide legal, financial, tax or professional advice.</li>
                <li>You should not rely solely on AI-generated responses for business decisions or regulatory compliance.</li>
                <li>AI responses are subject to usage limits as described on your plan.</li>
              </ul>
            </Section>

            <Section title="6. Plans and pricing">
              <p>
                ComplyHub offers a Free plan and a paid Pro plan. Current plan details and
                pricing are displayed on our <a href="/pricing" className="text-accent hover:underline">pricing page</a>.
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li><strong className="text-text-1">Free plan</strong> — allows you to track a limited number of companies with basic compliance monitoring and email reminders.</li>
                <li><strong className="text-text-1">Pro plan</strong> — a monthly subscription that provides expanded features including unlimited company tracking, AI features and priority alerts.</li>
              </ul>
              <p className="mt-2">
                We may change our pricing or plan features with reasonable notice. Any price
                changes will take effect at the start of your next billing period.
              </p>
            </Section>

            <Section title="7. Payment and billing">
              <p>
                Pro plan subscriptions are billed monthly through Stripe. By subscribing, you
                authorise us to charge your chosen payment method on a recurring basis. All
                prices are shown in British pounds (GBP). Taxes, where applicable, will be
                handled in accordance with applicable law.
              </p>
            </Section>

            <Section title="8. Cancellation">
              <p>
                You may cancel your Pro subscription at any time through the Stripe billing
                portal accessible from within ComplyHub. Upon cancellation, you will retain
                access to Pro features until the end of your current billing period, after
                which your account will revert to the Free plan.
              </p>
              <p className="mt-2">
                We do not offer refunds for partial billing periods, except where required by
                applicable law.
              </p>
            </Section>

            <Section title="9. Acceptable use">
              <p>You agree not to:</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Use ComplyHub for any unlawful purpose.</li>
                <li>Attempt to access accounts, data or systems that do not belong to you.</li>
                <li>Interfere with or disrupt the service or its infrastructure.</li>
                <li>Use automated tools to scrape, crawl or extract data from ComplyHub beyond normal use of the service.</li>
                <li>Misrepresent your identity or affiliation with any company.</li>
              </ul>
            </Section>

            <Section title="10. Availability and third-party services">
              <p>
                We aim to keep ComplyHub available and reliable, but we do not guarantee
                uninterrupted or error-free operation. The service depends on third-party
                providers including Companies House, Supabase, Stripe, Anthropic and Resend.
                We are not responsible for outages or issues caused by these providers.
              </p>
              <p className="mt-2">
                We may suspend or modify the service for maintenance, updates or other
                operational reasons, with reasonable notice where practicable.
              </p>
            </Section>

            <Section title="11. Intellectual property">
              <p>
                All content, design, code and branding of ComplyHub (excluding third-party
                data such as Companies House records) are owned by or licensed to us. You may
                not copy, modify, distribute or reverse-engineer any part of the service
                without our prior written consent.
              </p>
              <p className="mt-2">
                You retain ownership of any information you provide to ComplyHub (such as
                feedback). By submitting feedback, you grant us a non-exclusive, royalty-free
                licence to use it to improve the service.
              </p>
            </Section>

            <Section title="12. Limitation of liability">
              <p>
                To the maximum extent permitted by applicable law:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>ComplyHub is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, whether express or implied.</li>
                <li>We do not warrant that compliance information, health scores or AI responses are accurate, complete or up to date.</li>
                <li>We are not liable for any missed filing deadlines, penalties, fines or other consequences arising from your use of or reliance on the service.</li>
                <li>Our total liability to you for any claims arising from or related to the service is limited to the amount you have paid us in the 12 months preceding the claim.</li>
              </ul>
              <p className="mt-2">
                Nothing in these terms excludes or limits liability that cannot be excluded or
                limited under applicable law, including liability for fraud or for death or
                personal injury caused by negligence.
              </p>
            </Section>

            <Section title="13. Termination">
              <p>
                You may close your account at any time by contacting us at{' '}
                <a href="mailto:support@complyhub.uk" className="text-accent hover:underline">support@complyhub.uk</a>.
                We may suspend or terminate your account if you breach these terms or if we
                reasonably believe your use poses a risk to the service or other users.
              </p>
            </Section>

            <Section title="14. Changes to these terms">
              <p>
                We may update these terms from time to time. If we make material changes, we
                will make reasonable efforts to notify you, such as by posting a notice within
                the service. Your continued use of ComplyHub after changes take effect constitutes
                acceptance of the updated terms.
              </p>
            </Section>

            <Section title="15. Governing law">
              <p>
                These terms are governed by the laws of England and Wales.
                Any disputes will be subject to the exclusive jurisdiction of the courts
                of England and Wales.
              </p>
            </Section>

            <Section title="16. Contact">
              <p>
                If you have any questions about these terms, contact us at{' '}
                <a href="mailto:support@complyhub.uk" className="text-accent hover:underline">support@complyhub.uk</a>.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-text-1">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}