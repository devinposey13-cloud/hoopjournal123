import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

export const POLICY_VERSIONS = {
  privacy_policy: '1.0.0',
  terms_of_service: '1.0.0',
} as const;

export type PolicyType = keyof typeof POLICY_VERSIONS;

interface LegalPolicyViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  lastUpdated: string;
  policyType: PolicyType;
  children: React.ReactNode;
}

async function recordPolicyView(policyType: PolicyType) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('policy_views').insert({
      user_id: user.id,
      policy_type: policyType,
      policy_version: POLICY_VERSIONS[policyType],
    });
  } catch (e) {
    console.error('Failed to record policy view:', e);
  }
}

export function LegalPolicyViewer({ open, onClose, title, lastUpdated, policyType, children }: LegalPolicyViewerProps) {
  const recorded = useRef(false);

  useEffect(() => {
    if (open && !recorded.current) {
      recorded.current = true;
      recordPolicyView(policyType);
    }
    if (!open) recorded.current = false;
  }, [open, policyType]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col"
        >
          {/* Sticky header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">Last Updated: {lastUpdated} · v{POLICY_VERSIONS[policyType]}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Scrollable content */}
          <ScrollArea className="flex-1">
            <div className="px-5 py-6 max-w-2xl mx-auto">
              <div className="prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline space-y-6 text-sm leading-relaxed">
                {children}
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Privacy Policy Content ─── */
export function PrivacyPolicyContent() {
  return (
    <>
      <p className="text-muted-foreground">
        Hoop Journal™ ("we," "our," or "us") respects your privacy. This Privacy Policy explains what information we collect, how we use it, and how we protect it.
      </p>
      <p className="text-muted-foreground">
        Hoop Journal is a basketball habit tracking and performance analytics platform designed to help athletes reflect, improve, and build consistency.
      </p>

      <Section title="1. Information We Collect">
        <p>We collect only the information necessary to operate and improve Hoop Journal.</p>
        
        <h4 className="font-semibold text-foreground mt-4 mb-2 text-sm">A. Information You Provide</h4>
        <ul>
          <li>Preferred name or username</li>
          <li>Email address</li>
          <li>Game logs and performance statistics</li>
          <li>Written reflections</li>
          <li>Optional profile photos</li>
          <li>Payment information (processed securely through third-party providers)</li>
        </ul>

        <h4 className="font-semibold text-foreground mt-4 mb-2 text-sm">B. Automatically Collected Information</h4>
        <ul>
          <li>Device type and operating system</li>
          <li>IP address</li>
          <li>App usage data</li>
          <li>Error and crash logs</li>
        </ul>

        <p className="mt-3"><strong>We do not collect:</strong></p>
        <ul>
          <li>Government ID numbers</li>
          <li>Precise geolocation</li>
          <li>Biometric identifiers</li>
          <li>Social Security numbers</li>
        </ul>
      </Section>

      <Section title="2. Information from Children Under 13">
        <ul>
          <li>Hoop Journal is designed for athletes 13 years and older.</li>
          <li>If a user under 13 uses Hoop Journal, parental or guardian approval is required.</li>
          <li>We do not knowingly collect personal information from children under 13 without parental consent.</li>
        </ul>
        <p className="mt-2">Parents or guardians may:</p>
        <ul>
          <li>Request access to their child's information</li>
          <li>Request correction</li>
          <li>Request deletion</li>
        </ul>
        <ContactLine />
      </Section>

      <Section title="3. How We Use Information">
        <p>We use collected information to:</p>
        <ul>
          <li>Provide habit tracking and performance analytics</li>
          <li>Generate AI-powered feedback</li>
          <li>Improve our AI systems</li>
          <li>Maintain security</li>
          <li>Process subscriptions</li>
        </ul>
        <p className="mt-2 font-medium text-foreground">We do not sell personal data.</p>
        <p className="font-medium text-foreground">We do not serve third-party behavioral advertising.</p>
      </Section>

      <Section title="4. AI Processing">
        <p>Hoop Journal uses artificial intelligence to generate performance insights based on user-entered data.</p>
        <p>AI-generated responses are informational only and are not professional coaching, medical, or training advice.</p>
      </Section>

      <Section title="5. Data Sharing">
        <p>We do not sell or rent personal information.</p>
        <p>We may share information only:</p>
        <ul>
          <li>With service providers necessary to operate the platform</li>
          <li>If required by law</li>
          <li>To protect users or platform integrity</li>
        </ul>
      </Section>

      <Section title="6. Data Security">
        <p>We use commercially reasonable safeguards to protect your information.</p>
        <p>No system can guarantee absolute security.</p>
      </Section>

      <Section title="7. Data Retention">
        <p>
          Users may request account deletion at any time by contacting{' '}
          <MailLink />.
        </p>
        <p>We retain data only as long as necessary to operate the service.</p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p>We may update this Privacy Policy periodically.</p>
        <p>Continued use of the app constitutes acceptance of updates.</p>
      </Section>

      <Section title="9. Contact">
        <p>Questions about this policy may be directed to:</p>
        <MailLink />
      </Section>
    </>
  );
}

/* ─── Terms of Service Content ─── */
export function TermsOfServiceContent() {
  return (
    <>
      <p className="text-muted-foreground">
        Welcome to Hoop Journal™.
      </p>
      <p className="text-muted-foreground">
        By accessing or using Hoop Journal, you agree to these Terms of Service. If you do not agree, do not use the app.
      </p>

      <Section title="1. Use of the Service">
        <p>Hoop Journal provides habit tracking and performance analytics tools for athletes.</p>
        <p>You agree to use the service lawfully and responsibly. You may not:</p>
        <ul>
          <li>Upload unlawful or harmful content</li>
          <li>Attempt to disrupt or hack the service</li>
          <li>Impersonate another individual</li>
        </ul>
      </Section>

      <Section title="2. Age Requirements">
        <ul>
          <li>Users must be 13 years or older.</li>
          <li>Users under 13 require parental or guardian approval.</li>
        </ul>
      </Section>

      <Section title="3. Account Responsibility">
        <p>You are responsible for maintaining the confidentiality of your login credentials.</p>
        <p>You are responsible for all activity under your account.</p>
      </Section>

      <Section title="4. AI Disclaimer">
        <p>AI-generated insights are automated and provided for informational purposes only.</p>
        <p>They are not professional coaching, medical advice, or guarantees of athletic improvement.</p>
      </Section>

      <Section title="5. Subscription & Payments">
        <ul>
          <li>Certain features require a paid subscription.</li>
          <li>Payments are processed through secure third-party providers.</li>
          <li>Subscriptions renew automatically unless canceled.</li>
          <li>You may cancel according to the terms shown during checkout.</li>
        </ul>
      </Section>

      <Section title="6. Intellectual Property">
        <p>All Hoop Journal™ content, branding, and software are the property of Hoop Journal™.</p>
        <p>Users retain ownership of the content they submit but grant Hoop Journal™ a limited license to use it for operating the platform.</p>
      </Section>

      <Section title="7. Limitation of Liability">
        <p>To the maximum extent permitted by law, Hoop Journal shall not be liable for:</p>
        <ul>
          <li>Indirect or consequential damages</li>
          <li>Loss of performance outcomes</li>
          <li>Injury related to athletic activity</li>
        </ul>
        <p className="mt-2 font-medium text-foreground">Use of the service is at your own risk.</p>
      </Section>

      <Section title="8. Termination">
        <p>We may suspend or terminate accounts that violate these Terms.</p>
        <p>
          Users may delete their account at any time by contacting{' '}
          <MailLink />.
        </p>
      </Section>

      <Section title="9. Changes to Terms">
        <p>We may update these Terms from time to time.</p>
        <p>Continued use of the service constitutes acceptance of updated Terms.</p>
      </Section>

      <Section title="10. Contact">
        <p>Questions about these Terms may be directed to:</p>
        <MailLink />
      </Section>
    </>
  );
}

/* ─── Helpers ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

function MailLink() {
  return (
    <a href="mailto:support@hoopjournal.me" className="text-primary hover:underline font-medium">
      support@hoopjournal.me
    </a>
  );
}

function ContactLine() {
  return (
    <p className="mt-2">
      Contact: <MailLink />
    </p>
  );
}
