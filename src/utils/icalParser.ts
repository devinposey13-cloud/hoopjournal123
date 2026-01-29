import { format } from 'date-fns';

interface ICalGameItem {
  opponent: string;
  date: string;
  time: string;
  location: string;
  isHome: boolean;
  notes?: string;
}

/**
 * Parse iCal (.ics) format and extract game schedule data
 * Supports standard iCal VEVENT format
 */
export function parseICalSchedule(icalString: string, teamName?: string): ICalGameItem[] {
  const games: ICalGameItem[] = [];
  
  // Split into events
  const eventMatches = icalString.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
  
  if (!eventMatches || eventMatches.length === 0) {
    throw new Error('No events found in iCal feed');
  }

  eventMatches.forEach((eventBlock) => {
    try {
      // Extract properties
      const summary = extractProperty(eventBlock, 'SUMMARY');
      const dtstart = extractProperty(eventBlock, 'DTSTART');
      const dtend = extractProperty(eventBlock, 'DTEND');
      const location = extractProperty(eventBlock, 'LOCATION');
      const description = extractProperty(eventBlock, 'DESCRIPTION');
      
      if (!summary || !dtstart) return;

      // Parse date/time
      const startDate = parseICalDate(dtstart);
      if (!startDate) return;

      // Determine opponent and home/away from summary
      let opponent = summary;
      let isHome = true;
      
      // Common patterns: "vs Team", "@ Team", "Team (Home)", "Team (Away)", "at Team"
      if (summary.toLowerCase().startsWith('vs ') || summary.toLowerCase().startsWith('vs. ')) {
        opponent = summary.replace(/^vs\.?\s+/i, '').trim();
        isHome = true;
      } else if (summary.toLowerCase().startsWith('@ ') || summary.toLowerCase().startsWith('at ')) {
        opponent = summary.replace(/^@\s+|^at\s+/i, '').trim();
        isHome = false;
      } else if (summary.includes(' vs ') || summary.includes(' vs. ')) {
        // Format: "Our Team vs Opponent" or "Opponent vs Our Team"
        const parts = summary.split(/\s+vs\.?\s+/i);
        if (parts.length === 2) {
          // If we know our team name, use it to determine which side is opponent
          if (teamName && parts[0].toLowerCase().includes(teamName.toLowerCase())) {
            opponent = parts[1].trim();
            isHome = true;
          } else if (teamName && parts[1].toLowerCase().includes(teamName.toLowerCase())) {
            opponent = parts[0].trim();
            isHome = false;
          } else {
            // Default: assume second part is opponent
            opponent = parts[1].trim();
            isHome = true;
          }
        }
      } else if (summary.includes(' @ ')) {
        // Format: "Our Team @ Opponent"
        const parts = summary.split(/\s+@\s+/);
        if (parts.length === 2) {
          opponent = parts[1].trim();
          isHome = false;
        }
      }

      // Check description for additional home/away indicators
      if (description) {
        const descLower = description.toLowerCase();
        if (descLower.includes('home game') || descLower.includes('(home)')) {
          isHome = true;
        } else if (descLower.includes('away game') || descLower.includes('(away)') || descLower.includes('road game')) {
          isHome = false;
        }
      }

      // Clean up opponent name - remove score if present
      opponent = opponent.replace(/\s*\d+\s*-\s*\d+\s*$/, '').trim();
      opponent = opponent.replace(/\s*\(.*\)\s*$/, '').trim();
      
      if (!opponent) return;

      // Parse location
      let gameLocation = location || (isHome ? 'Home' : opponent);
      
      // Format time
      const timeStr = format(startDate, 'h:mm a');
      const dateStr = format(startDate, 'yyyy-MM-dd');

      games.push({
        opponent,
        date: dateStr,
        time: timeStr,
        location: gameLocation,
        isHome,
        notes: description?.slice(0, 200),
      });
    } catch (e) {
      console.warn('Failed to parse iCal event:', e);
    }
  });

  return games;
}

/**
 * Extract a property value from an iCal event block
 */
function extractProperty(eventBlock: string, property: string): string | null {
  // Handle property with parameters (e.g., DTSTART;TZID=America/New_York:20240101T190000)
  const regex = new RegExp(`${property}(?:;[^:]*)?:([^\\r\\n]+)`, 'i');
  const match = eventBlock.match(regex);
  
  if (!match) return null;
  
  // Handle line folding (lines that start with space are continuations)
  let value = match[1];
  
  // Unescape common iCal escapes
  value = value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
  
  return value.trim();
}

/**
 * Parse iCal date format
 * Supports: 20240101, 20240101T190000, 20240101T190000Z
 */
function parseICalDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remove timezone identifier if present
  const cleanDate = dateStr.replace(/Z$/, '');

  try {
    // Format: YYYYMMDD
    if (cleanDate.length === 8) {
      const year = parseInt(cleanDate.slice(0, 4));
      const month = parseInt(cleanDate.slice(4, 6)) - 1;
      const day = parseInt(cleanDate.slice(6, 8));
      return new Date(year, month, day);
    }
    
    // Format: YYYYMMDDTHHMMSS
    if (cleanDate.length >= 15 && cleanDate.includes('T')) {
      const datePart = cleanDate.split('T')[0];
      const timePart = cleanDate.split('T')[1];
      
      const year = parseInt(datePart.slice(0, 4));
      const month = parseInt(datePart.slice(4, 6)) - 1;
      const day = parseInt(datePart.slice(6, 8));
      const hour = parseInt(timePart.slice(0, 2));
      const minute = parseInt(timePart.slice(2, 4));
      const second = parseInt(timePart.slice(4, 6)) || 0;
      
      return new Date(year, month, day, hour, minute, second);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Filter to only future games (not yet played)
 */
export function filterFutureICalGames(games: ICalGameItem[]): ICalGameItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return games.filter((game) => {
    const gameDate = new Date(game.date);
    return gameDate >= today;
  });
}

/**
 * Detect if content is iCal or RSS format
 */
export function detectScheduleFormat(content: string): 'ical' | 'rss' | 'unknown' {
  const trimmed = content.trim();
  
  if (trimmed.startsWith('BEGIN:VCALENDAR') || trimmed.includes('BEGIN:VEVENT')) {
    return 'ical';
  }
  
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<rss') || trimmed.includes('<channel>')) {
    return 'rss';
  }
  
  return 'unknown';
}
