import { useMemo } from 'react';
import { Quote } from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The only way to prove you are a good sport is to lose.", author: "Ernie Banks" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Excellence is not a singular act, but a habit.", author: "Shaquille O'Neal" },
  { text: "I've failed over and over again in my life. That is why I succeed.", author: "Michael Jordan" },
  { text: "The strength of the team is each individual member.", author: "Phil Jackson" },
  { text: "Talent wins games, but teamwork wins championships.", author: "Michael Jordan" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "The only limit to your impact is your imagination and commitment.", author: "Tony Robbins" },
  { text: "Success is no accident. It is hard work and learning from failure.", author: "Pelé" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "The more difficult the victory, the greater the happiness in winning.", author: "Pelé" },
  { text: "You can't put a limit on anything. The more you dream, the farther you get.", author: "Michael Phelps" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Pressure is a privilege.", author: "Billie Jean King" },
  { text: "Control what you can control. Let go of the rest.", author: "Unknown" },
  { text: "Play hard, play smart, play together.", author: "Dean Smith" },
  { text: "Great players are willing to give up their own personal achievement.", author: "Kareem Abdul-Jabbar" },
  { text: "One man can be a crucial ingredient on a team, but one man cannot make a team.", author: "Kareem Abdul-Jabbar" },
  { text: "Never underestimate the heart of a champion.", author: "Rudy Tomjanovich" },
  { text: "The key is not the will to win. Everyone has that. It's the will to prepare.", author: "Bobby Knight" },
  { text: "You have to expect things of yourself before you can do them.", author: "Michael Jordan" },
  { text: "What you lack in talent can be made up with desire, hustle, and effort.", author: "Don Zimmer" },
  { text: "Stay focused, stay humble, keep working.", author: "Unknown" },
  { text: "Trust the process.", author: "Joel Embiid" },
  { text: "Good things come to those who hustle.", author: "Chuck Noll" },
  { text: "Leave everything on the court.", author: "Unknown" },
  { text: "Next play mentality.", author: "Unknown" },
];

export function DailyQuote() {
  const quote = useMemo(() => {
    // Use current date as seed for consistent daily quote
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const index = dayOfYear % MOTIVATIONAL_QUOTES.length;
    return MOTIVATIONAL_QUOTES[index];
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-4 sm:p-5">
      <Quote className="absolute top-2 left-2 w-8 h-8 text-primary/20" />
      <div className="relative z-10 pl-6">
        <p className="text-sm sm:text-base font-medium italic text-foreground/90 leading-relaxed">
          "{quote.text}"
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          — {quote.author}
        </p>
      </div>
    </div>
  );
}
