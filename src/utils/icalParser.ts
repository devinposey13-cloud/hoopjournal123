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
      
      // First, check for (Home) or (Away) suffix - this is the most reliable indicator
      // Format: "Varsity Boys Basketball vs. Gonzaga College High School (Home)"
      const homeAwayMatch = summary.match(/\((Home|Away)\)\s*$/i);
      if (homeAwayMatch) {
        isHome = homeAwayMatch[1].toLowerCase() === 'home';
        // Remove the (Home) or (Away) suffix
        opponent = summary.replace(/\s*\((Home|Away)\)\s*$/i, '').trim();
      }
      
      // Now extract the opponent name from common patterns
      // Pattern: "Team Name vs. Opponent" or "Event vs. Opponent"
      // Handle both "vs " and "vs. " (with or without period)
      const vsMatch = opponent.match(/\s+vs\.?\s+(.+)$/i);
      if (vsMatch) {
        opponent = vsMatch[1].trim();
      } else if (opponent.toLowerCase().startsWith('vs ') || opponent.toLowerCase().startsWith('vs. ')) {
        opponent = opponent.replace(/^vs\.?\s+/i, '').trim();
        if (!homeAwayMatch) isHome = true;
      } else if (opponent.toLowerCase().startsWith('@ ') || opponent.toLowerCase().startsWith('at ')) {
        opponent = opponent.replace(/^@\s+|^at\s+/i, '').trim();
        if (!homeAwayMatch) isHome = false;
      } else if (opponent.includes(' @ ')) {
        // Format: "Our Team @ Opponent"
        const parts = opponent.split(/\s+@\s+/);
        if (parts.length === 2) {
          opponent = parts[1].trim();
          if (!homeAwayMatch) isHome = false;
        }
      }

      // Check description for additional home/away indicators (only if not already determined)
      if (!homeAwayMatch && description) {
        const descLower = description.toLowerCase();
        if (descLower.includes('home game') || descLower.includes('(home)')) {
          isHome = true;
        } else if (descLower.includes('away game') || descLower.includes('(away)') || descLower.includes('road game')) {
          isHome = false;
        }
      }

      // Clean up opponent name - remove score if present
      opponent = opponent.replace(/\s*\d+\s*-\s*\d+\s*$/, '').trim();
      // Remove any remaining parenthetical notes (but keep the name clean)
      opponent = opponent.replace(/\s*\([^)]*\)\s*$/, '').trim();
      
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
 * Handles properties with parameters like DTSTART;TZID=America/New_York:20240101T190000
 * or DTSTART;VALUE=DATE:20240101
 */
function extractProperty(eventBlock: string, property: string): string | null {
  // Handle property with parameters (e.g., DTSTART;TZID=America/New_York:20240101T190000)
  // or DTSTART;VALUE=DATE:20240101
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
 * Supports: 20240101, 20240101T190000, 20240101T190000Z, VALUE=DATE:20240101
 */
function parseICalDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remove timezone identifier if present
  let cleanDate = dateStr.replace(/Z$/, '');
  
  // Handle VALUE=DATE format (e.g., from DTSTART;VALUE=DATE:20240101)
  // The property extraction already handles this, but clean up just in case
  cleanDate = cleanDate.replace(/^VALUE=DATE:/i, '');

  try {
    // Format: YYYYMMDD (8 digits, no time component)
    if (/^\d{8}$/.test(cleanDate)) {
      const year = parseInt(cleanDate.slice(0, 4));
      const month = parseInt(cleanDate.slice(4, 6)) - 1;
      const day = parseInt(cleanDate.slice(6, 8));
      return new Date(year, month, day, 12, 0, 0); // Default to noon for all-day events
    }
    
    // Format: YYYYMMDDTHHMMSS (with time)
    if (cleanDate.includes('T')) {
      const datePart = cleanDate.split('T')[0];
      const timePart = cleanDate.split('T')[1];
      
      if (datePart.length >= 8) {
        const year = parseInt(datePart.slice(0, 4));
        const month = parseInt(datePart.slice(4, 6)) - 1;
        const day = parseInt(datePart.slice(6, 8));
        const hour = timePart ? parseInt(timePart.slice(0, 2)) : 12;
        const minute = timePart ? parseInt(timePart.slice(2, 4)) : 0;
        const second = timePart && timePart.length >= 6 ? parseInt(timePart.slice(4, 6)) : 0;
        
        return new Date(year, month, day, hour, minute, second);
      }
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
