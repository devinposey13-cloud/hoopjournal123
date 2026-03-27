import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const legalLinks = [
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/terms', label: 'Terms of Service' },
  { path: '/eula', label: 'EULA' },
];

export function LegalPageNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors shrink-0"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <img src="/hoop-journal-logo.png" alt="Hoop Journal" className="w-8 h-8 rounded-lg shrink-0" />
        <nav className="flex items-center gap-4 overflow-x-auto text-sm">
          {legalLinks.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`whitespace-nowrap transition-colors ${
                pathname === path
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
