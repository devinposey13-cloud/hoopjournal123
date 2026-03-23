export default function EULA() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-6">
          <img src="/hoop-journal-logo.png" alt="Hoop Journal" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-foreground">End User License Agreement</h1>
            <p className="text-xs text-muted-foreground">Apple Standard EULA</p>
          </div>
        </div>
        <div className="prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline space-y-4 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            Hoop Journal™ is licensed under Apple's Standard End User License Agreement (EULA) for Licensed Applications.
          </p>
          <p className="text-muted-foreground">
            By downloading, installing, or using Hoop Journal™, you agree to the terms outlined in Apple's Standard EULA.
          </p>
          <a
            href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity no-underline hover:no-underline"
          >
            View Apple's Standard EULA →
          </a>
        </div>
      </div>
    </div>
  );
}
