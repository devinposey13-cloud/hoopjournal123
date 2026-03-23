import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Brain, Mic, Search, ShieldCheck, ServerCrash } from 'lucide-react';

interface AIDisclosureScreenProps {
  open: boolean;
  onClose: () => void;
}

const aiProviders = [
  {
    name: 'Google Gemini',
    icon: Brain,
    purpose: 'Text generation, image generation & data extraction',
    features: [
      'AI coaching conversations & post-game recaps',
      'Avatar generation from profile photos',
      'Schedule image parsing & stat extraction from natural language',
    ],
    dataProcessed: [
      'Basketball performance stats (points, rebounds, assists, etc.)',
      'User-composed chat messages to the AI coach',
      'Uploaded schedule images for text extraction',
    ],
    notSent: 'Email, phone number, real name, or account credentials',
  },
  {
    name: 'ElevenLabs',
    icon: Mic,
    purpose: 'Voice synthesis, speech recognition & sound effects',
    features: [
      'Coach voice playback (text-to-speech)',
      'Voice-based stat entry (speech-to-text)',
      'Celebratory sound effects',
    ],
    dataProcessed: [
      'Text strings for voice synthesis',
      'Audio recordings for transcription',
    ],
    notSent: 'Personal profile data or account information',
  },
  {
    name: 'Perplexity AI',
    icon: Search,
    purpose: 'Basketball knowledge search & player comparisons',
    features: [
      'Real-time basketball news and information',
      'Player comparison lookups',
    ],
    dataProcessed: [
      'Search queries about basketball topics',
      'Player names for comparison (public NBA/WNBA players only)',
    ],
    notSent: 'Personal stats, profile data, or account information',
  },
];

export function AIDisclosureScreen({ open, onClose }: AIDisclosureScreenProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Third-Party AI Services
          </DialogTitle>
          <DialogDescription>
            Hoop Journal uses the following AI services to power smart features. All calls are routed through our secure backend — no data is sent directly from your device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {aiProviders.map((provider) => (
            <div key={provider.name} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <provider.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{provider.name}</h4>
                  <p className="text-xs text-muted-foreground">{provider.purpose}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground mb-1">Used for:</p>
                <ul className="space-y-1">
                  {provider.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground mb-1">Data processed:</p>
                <ul className="space-y-1">
                  {provider.dataProcessed.map((d) => (
                    <li key={d} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-start gap-1.5 bg-primary/5 rounded-md px-2.5 py-1.5">
                <ServerCrash className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-medium">Never sent:</span> {provider.notSent}
                </p>
              </div>
            </div>
          ))}

          <Separator />

          <div className="space-y-2 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Privacy
              </Badge>
              <span className="text-xs text-muted-foreground">No PII is transmitted to any AI provider</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Training
              </Badge>
              <span className="text-xs text-muted-foreground">Your data is not used for AI model training</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Routing
              </Badge>
              <span className="text-xs text-muted-foreground">All AI calls go through authenticated server-side functions</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
