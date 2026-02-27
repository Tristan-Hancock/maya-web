import React from "react";
import SEO from "../../components/seo/seo";

function LegalShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[repeating-linear-gradient(to_bottom,#EAEBFF_0%,#FFFFFF_40%,#EAEBFF_80%)] px-4 py-10 sm:px-6">
      <SEO title={title} description={description} />
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <a href="/" className="text-sm font-semibold text-[#1B2245] hover:underline">
            Back to Maya
          </a>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <a href="/terms-and-conditions" className="hover:underline">
              Terms
            </a>
            <a href="/privacy-policy" className="hover:underline">
              Privacy
            </a>
            <a href="/cookie-policy" className="hover:underline">
              Cookies
            </a>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-[#1B2245]">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-gray-700">{children}</div>
    </section>
  );
}

export function LegalIndexPage() {
  return (
    <LegalShell title="Legal Information" description="Terms, privacy, and cookie policies for Maya.">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1B2245]">Legal Information</h1>
      <p className="mb-6 text-sm text-gray-600">Last updated: February 27, 2026</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <a href="/terms-and-conditions" className="rounded-xl border border-gray-200 p-4 hover:border-[#BBBFFE]">
          <h3 className="text-sm font-semibold text-[#1B2245]">Terms and Conditions</h3>
          <p className="mt-2 text-xs text-gray-600">Rules for using Maya and subscription services.</p>
        </a>
        <a href="/privacy-policy" className="rounded-xl border border-gray-200 p-4 hover:border-[#BBBFFE]">
          <h3 className="text-sm font-semibold text-[#1B2245]">Privacy Policy</h3>
          <p className="mt-2 text-xs text-gray-600">How data is collected, used, stored, and protected.</p>
        </a>
        <a href="/cookie-policy" className="rounded-xl border border-gray-200 p-4 hover:border-[#BBBFFE]">
          <h3 className="text-sm font-semibold text-[#1B2245]">Cookie Policy</h3>
          <p className="mt-2 text-xs text-gray-600">How cookies and local storage are used on this site.</p>
        </a>
      </div>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell
      title="Terms and Conditions"
      description="Terms and conditions for using Maya by Ovelia Health."
    >
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1B2245]">Terms and Conditions</h1>
      <p className="mb-6 text-sm text-gray-600">Last updated: February 27, 2026</p>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using Maya, you agree to these Terms and Conditions. If you do not agree, do not use the
          service.
        </p>
      </Section>

      <Section title="2. Service Description">
        <p>
          Maya is an AI-powered wellness support product by Ovelia Health. Maya is not a replacement for professional
          medical care, diagnosis, or emergency services.
        </p>
      </Section>

      <Section title="3. Accounts and Security">
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity
          under your account.
        </p>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree not to misuse the service, including attempts to disrupt, reverse engineer, abuse, or access data you do not own.</p>
      </Section>

      <Section title="5. Subscriptions, Billing, and Refunds">
        <p>
          Paid plans and add-ons are billed through Stripe. Pricing, plan limits, and billing periods are displayed
          in-product. Refunds and credits are handled according to applicable law and our billing policies.
        </p>
      </Section>

      <Section title="6. Termination">
        <p>We may suspend or terminate access for violations of these terms, abuse, fraud, or security risks.</p>
      </Section>

      <Section title="7. Disclaimer and Limitation of Liability">
        <p>
          The service is provided on an "as is" basis. To the extent permitted by law, Ovelia Health disclaims
          warranties and limits liability for indirect or consequential damages.
        </p>
      </Section>

      <Section title="8. Changes to Terms">
        <p>
          We may update these terms from time to time. Continued use after updates means you accept the revised terms.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>Questions about these terms: info@ovelia.health</p>
      </Section>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" description="Privacy policy for Maya by Ovelia Health.">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1B2245]">Privacy Policy</h1>
      <p className="mb-6 text-sm text-gray-600">Last updated: February 27, 2026</p>

      <Section title="1. Information We Collect">
        <p>
          We collect account information (such as email), usage and subscription records, and data needed to operate,
          secure, and improve Maya.
        </p>
      </Section>

      <Section title="2. How We Use Information">
        <p>
          We use information to provide the service, authenticate users, process billing, prevent abuse, and improve
          product quality and reliability.
        </p>
      </Section>

      <Section title="3. Sharing of Information">
        <p>
          We share data with service providers needed to operate Maya (for example, cloud infrastructure and payment
          providers). We do not sell personal information.
        </p>
      </Section>

      <Section title="4. Data Retention">
        <p>
          We retain data for as long as needed to operate the service, meet legal obligations, resolve disputes, and
          enforce agreements.
        </p>
      </Section>

      <Section title="5. Security">
        <p>
          We implement technical and organizational safeguards, but no system is completely secure. You should also
          protect your account credentials.
        </p>
      </Section>

      <Section title="6. Your Rights">
        <p>
          Depending on your location, you may have rights to access, correct, delete, or restrict processing of your
          personal information.
        </p>
      </Section>

      <Section title="7. Children">
        <p>Maya is not intended for children under 13 (or higher age where required by local law).</p>
      </Section>

      <Section title="8. Policy Updates">
        <p>
          We may update this Privacy Policy from time to time. Continued use after updates indicates acceptance of the
          revised policy.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>Privacy questions: info@ovelia.health</p>
      </Section>
    </LegalShell>
  );
}

export function CookiePage() {
  return (
    <LegalShell title="Cookie Policy" description="Cookie and local storage policy for Maya.">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1B2245]">Cookie Policy</h1>
      <p className="mb-6 text-sm text-gray-600">Last updated: February 27, 2026</p>

      <Section title="1. What We Use">
        <p>
          Maya uses cookies and browser storage (including localStorage/sessionStorage) to keep users signed in,
          maintain session state, improve reliability, and support core product features.
        </p>
      </Section>

      <Section title="2. Why We Use Them">
        <p>We use these technologies for authentication, security, preferences, and service performance.</p>
      </Section>

      <Section title="3. Third-Party Services">
        <p>
          Some providers (for example billing and infrastructure services) may also use cookies or similar mechanisms
          as part of their integrations.
        </p>
      </Section>

      <Section title="4. Your Choices">
        <p>
          You can control cookies through browser settings. Disabling essential cookies/storage may prevent parts of
          Maya from working correctly.
        </p>
      </Section>

      <Section title="5. Contact">
        <p>Questions about this policy: info@ovelia.health</p>
      </Section>
    </LegalShell>
  );
}

export function getLegalPageForPath(pathname: string): React.ReactNode | null {
  const normalized = (pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";

  if (normalized === "/legal") return <LegalIndexPage />;
  if (normalized === "/terms" || normalized === "/terms-and-conditions") return <TermsPage />;
  if (normalized === "/privacy" || normalized === "/privacy-policy") return <PrivacyPage />;
  if (normalized === "/cookies" || normalized === "/cookie-policy") return <CookiePage />;

  return null;
}
