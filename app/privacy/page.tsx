import PublicNav from '@/components/landing/PublicNav'
import Footer from '@/components/landing/Footer'

export const metadata = {
  title: 'Privacy Policy — ComplyHub',
}

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <PublicNav />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[640px]">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-text-3">
            Last updated: September 2026 · Subject to legal review
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-text-2">
            <Section title="1. Who we are">
              <p>
{/* Registered address to be added once confirmed by Founder */}
                ComplyHub is operated by Laudem Enterprise Limited.
                In this policy, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; refer to
                Laudem Enterprise Limited. If you have questions about how we handle your data,
                contact us at{' '}
                <a href="mailto:support@complyhub.uk" className="text-accent hover:underline">support@complyhub.uk</a>.
              </p>
            </Section>

            <Section title="2. Information we collect">
              <p>We collect the following categories of information:</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-text-1">Account information</strong> — your email address and
                  password, collected when you create an account. Authentication is managed
                  by Supabase.
                </li>
                <li>
                  <strong className="text-text-1">Company information you choose to track</strong> — Companies House
                  company numbers and the publicly available filing data we retrieve on your behalf
                  from the Companies House public API.
                </li>
                <li>
                  <strong className="text-text-1">Usage information</strong> — actions you take within
                  ComplyHub (such as searching for a company, tracking a company, or using AI features)
                  to help us understand how the service is used and to improve it.
                </li>
                <li>
                  <strong className="text-text-1">AI feature inputs</strong> — questions you submit to
                  the Compliance Advisor or Filing Assistant. These are sent to our AI service
                  provider (Anthropic) to generate responses.
                </li>
                <li>
                  <strong className="text-text-1">Payment information</strong> — if you subscribe to a
                  paid plan, payment details are collected and processed directly by Stripe. We do not
                  store your card number, expiry date or CVC on our servers. We receive your
                  subscription status and Stripe customer identifier.
                </li>
                <li>
                  <strong className="text-text-1">Feedback</strong> — any messages you submit through
                  the in-app feedback form, along with your email address so we can follow up.
                </li>
                <li>
                  <strong className="text-text-1">Email preferences</strong> — your choice of whether
                  to receive filing deadline reminder emails.
                </li>
              </ul>
            </Section>

            <Section title="3. How we use your information">
              <p>We use the information we collect to:</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Provide and maintain the ComplyHub service, including monitoring filing deadlines and calculating compliance status.</li>
                <li>Send you email reminders about upcoming or overdue filing deadlines, unless you have opted out.</li>
                <li>Process your subscription payments through Stripe.</li>
                <li>Respond to your feedback and support requests.</li>
                <li>Understand how the service is used so we can improve it.</li>
                <li>Protect against misuse and ensure the security of the service.</li>
              </ul>
            </Section>

            <Section title="4. Lawful basis for processing">
              <p>
                We process your personal data on the following bases under UK data protection law:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li><strong className="text-text-1">Contract</strong> — to provide the ComplyHub service you have signed up for, including account management, compliance monitoring and email reminders.</li>
                <li><strong className="text-text-1">Legitimate interests</strong> — to understand service usage, improve the product and protect against misuse, where those interests are not overridden by your rights.</li>
              </ul>
            </Section>

            <Section title="5. Service providers">
              <p>
                We share your information with the following third-party service providers, each of
                which processes data on our behalf for the purposes described:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li><strong className="text-text-1">Supabase</strong> — database hosting and authentication.</li>
                <li><strong className="text-text-1">Stripe</strong> — payment processing for paid subscriptions.</li>
                <li><strong className="text-text-1">Anthropic</strong> — AI processing for the Compliance Advisor and Filing Assistant features (Pro plan only).</li>
                <li><strong className="text-text-1">Resend</strong> — transactional email delivery for filing deadline reminders.</li>
                <li><strong className="text-text-1">Vercel</strong> — application hosting and deployment.</li>
                <li><strong className="text-text-1">Companies House</strong> — we query the publicly available Companies House API to retrieve company filing data. We do not share your personal data with Companies House.</li>
              </ul>
            </Section>

            <Section title="6. International transfers">
              <p>
{/* Provider-specific international transfer arrangements to be confirmed following legal review */}
                Some of our service providers may process personal data outside the United
                Kingdom. Where personal data is transferred internationally, we take steps to
                ensure that it is handled in accordance with applicable data protection law.
              </p>
            </Section>

            <Section title="7. Data retention">
              <p>
                We retain your account information and associated data for as long as your account is
                active. To request closure of your account and deletion of your personal data,
                contact us at{' '}
                <a href="mailto:support@complyhub.uk" className="text-accent hover:underline">support@complyhub.uk</a>.
                We will handle deletion requests in accordance with applicable data protection
                law, subject to any legal obligations requiring us to retain certain information.
              </p>
{/* Specific retention periods to be confirmed by Founder/legal review */}
            </Section>

            <Section title="8. Cookies and local storage">
              <p>
                ComplyHub uses essential cookies set by Supabase to manage your authentication session.
                These are strictly necessary for the service to function and cannot be disabled.
              </p>
              <p className="mt-2">
                We also use your browser&apos;s local storage to remember your theme preference
                (light, dark or system). This data stays in your browser and is not sent to our servers.
              </p>
              <p className="mt-2">
                We do not use advertising cookies, analytics cookies or tracking pixels.
              </p>
            </Section>

            <Section title="9. Security">
              <p>
                We implement appropriate technical and organisational measures to protect your
                data, including encryption in transit (HTTPS/TLS) and secure authentication via
                Supabase. However, no method of transmission or storage is completely secure.
              </p>
            </Section>

            <Section title="10. Your rights">
              <p>
                Under UK data protection law, you have the right to:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Access the personal data we hold about you.</li>
                <li>Rectify inaccurate personal data.</li>
                <li>Request erasure of your personal data.</li>
                <li>Restrict or object to certain processing.</li>
                <li>Data portability — receive your data in a structured, commonly used format.</li>
                <li>Withdraw consent where processing is based on consent.</li>
              </ul>
              <p className="mt-2">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:support@complyhub.uk" className="text-accent hover:underline">support@complyhub.uk</a>.
                You also have the right to lodge a complaint with the Information Commissioner&apos;s
                Office (ICO) at <span className="text-text-1">ico.org.uk</span>.
              </p>
            </Section>

            <Section title="11. Changes to this policy">
              <p>
                We may update this privacy policy from time to time. If we make material changes,
                we will make reasonable efforts to notify you, such as by posting a notice within
                the service. The &ldquo;Last updated&rdquo; date at the top reflects the most
                recent revision.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                If you have any questions about this privacy policy or our data practices, contact
                us at{' '}
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