import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

// Allowed URL patterns for schedule fetching (to prevent SSRF)
const ALLOWED_DOMAINS = [
  'calendar.google.com',
  'drive.google.com',
  'outlook.live.com',
  'outlook.office365.com',
  'calendar.yahoo.com',
  'ical.mac.com',
];

// Convert Google Drive view/share URLs to direct download URLs
function convertGoogleDriveUrl(urlString: string): string {
  const url = new URL(urlString);
  
  // Handle drive.google.com/file/d/{fileId}/view URLs
  const fileMatch = urlString.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  
  // Handle drive.google.com/open?id={fileId} URLs
  const openMatch = url.searchParams.get('id');
  if (url.hostname === 'drive.google.com' && openMatch) {
    return `https://drive.google.com/uc?export=download&id=${openMatch}`;
  }
  
  return urlString;
}

const isAllowedUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    // Allow HTTPS only
    if (url.protocol !== 'https:') {
      return false;
    }
    // Block localhost and private IPs
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client and verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format and security
    if (!isAllowedUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or disallowed URL. Only HTTPS URLs to external services are allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${userId} - Fetching schedule from: ${url}`);

    // Convert Google Drive URLs to direct download format
    const fetchUrl = convertGoogleDriveUrl(url);
    console.log(`Resolved fetch URL: ${fetchUrl}`);

    // Fetch the schedule content with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'HoopJournal/1.0 (Schedule Import)',
        'Accept': 'text/calendar, application/xml, text/xml, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = await response.text();
    
    // Limit response size (max 1MB)
    if (content.length > 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Response too large. Maximum size is 1MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${userId} - Schedule fetched successfully (${content.length} bytes)`);

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Fetch schedule error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch schedule';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
