import { ScheduledGame } from '@/types/basketball';
import { format, parseISO } from 'date-fns';

interface RSSGameItem {
  opponent: string;
  date: string;
  time: string;
  location: string;
  isHome: boolean;
  notes?: string;
}

/**
 * Parse RSS feed XML and extract game schedule data
 * Supports PrestoSports RSS format (used by WCAC, many high school leagues)
 */
export function parseRSSSchedule(xmlString: string, teamName?: string): RSSGameItem[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Check for parse errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid RSS feed format');
  }

  const items = xmlDoc.querySelectorAll('item');
  const games: RSSGameItem[] = [];

  items.forEach((item) => {
    try {
      // Get opponent from ps:opponent or parse from title
      const opponentEl = item.querySelector('opponent');
      const titleEl = item.querySelector('title');
      const descEl = item.querySelector('description');
      const pubDateEl = item.querySelector('pubDate');
      const dateEl = item.querySelector('date'); // dc:date
      
      let opponent = '';
      let isHome = true;
      
      // Parse opponent - PrestoSports format uses ps:opponent
      if (opponentEl) {
        opponent = opponentEl.textContent || '';
        // Check if "at" prefix indicates away game
        if (opponent.startsWith('at ')) {
          isHome = false;
          opponent = opponent.replace('at ', '').trim();
        }
      } else if (titleEl) {
        // Fallback: parse from title
        const title = titleEl.textContent || '';
        // Format: "Team A vs. Team B" or "Team A 48, Team B 45 Final"
        const vsMatch = title.match(/(.+?)\s+(?:vs\.?|,)\s+(.+?)(?:\s+\d|$)/i);
        if (vsMatch) {
          opponent = vsMatch[1].trim();
        }
      }

      if (!opponent) return;

      // Parse date/time
      let gameDate: Date | null = null;
      
      // Try dc:date first (ISO format)
      if (dateEl?.textContent) {
        gameDate = parseISO(dateEl.textContent);
      } else if (pubDateEl?.textContent) {
        gameDate = new Date(pubDateEl.textContent);
      }

      if (!gameDate || isNaN(gameDate.getTime())) return;

      // Extract time from description if available
      let timeStr = format(gameDate, 'h:mm a');
      if (descEl?.textContent) {
        const timeMatch = descEl.textContent.match(/at (\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (timeMatch) {
          timeStr = timeMatch[1];
        }
      }

      // Parse location from description or use opponent name
      let location = isHome ? 'Home' : opponent;
      if (descEl?.textContent) {
        // Try to extract tournament or venue info
        const tournamentMatch = descEl.textContent.match(/,\s*([^,]+(?:Tournament|Classic|Showcase))/i);
        if (tournamentMatch) {
          location = tournamentMatch[1].trim();
        }
      }

      // Check for score to see if game has been played (skip completed games optionally)
      const scoreEl = item.querySelector('score');
      const hasScore = scoreEl?.textContent && scoreEl.textContent.trim() !== '';
      
      games.push({
        opponent,
        date: format(gameDate, 'yyyy-MM-dd'),
        time: timeStr,
        location,
        isHome,
        notes: hasScore ? `Result: ${scoreEl?.textContent}` : undefined,
      });
    } catch (e) {
      console.warn('Failed to parse RSS item:', e);
    }
  });

  return games;
}

/**
 * Convert parsed RSS games to ScheduledGame format
 */
export function rssGamesToScheduledGames(
  rssGames: RSSGameItem[],
  generateId: () => string
): Omit<ScheduledGame, 'id'>[] {
  return rssGames.map((game) => ({
    date: game.date,
    time: game.time,
    opponent: game.opponent,
    location: game.location,
    isHome: game.isHome,
    notes: game.notes,
  }));
}

/**
 * Filter to only future games (not yet played)
 */
export function filterFutureGames(games: RSSGameItem[]): RSSGameItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return games.filter((game) => {
    const gameDate = new Date(game.date);
    return gameDate >= today;
  });
}
