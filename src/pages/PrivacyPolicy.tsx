import { PrivacyPolicyContent, POLICY_VERSIONS } from '@/components/settings/LegalPolicyViewer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-6">
          <img src="/hoop-journal-logo.png" alt="Hoop Journal" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Last Updated: June 7, 2025 · v{POLICY_VERSIONS.privacy_policy}</p>
          </div>
        </div>
        <div className="prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline space-y-6 text-sm leading-relaxed">
          <PrivacyPolicyContent />
        </div>
      </div>
    </div>
  );
}
