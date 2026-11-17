/**
 * Self-Hosted OTT MP4 Stream Router for Cloudflare Workers
 * Supports:
 *  - https://workers.dev
 *  - https://workers.devstream/movie/{tmdb_id}.mp4
 *  - https://workers.devmovie/{tmdb_id}.mp4
 *  - https://workers.devstream/tv/{tmdb_id}/{season}/{episode}.mp4
 *  - https://workers.devtv/{tmdb_id}/{season}/{episode}.mp4
 */

// 1. Media Database: Map TMDB IDs to your hosted MP4 URLs
const MEDIA_DATABASE = {
  // Movies
  'movie_550': 'https://googleapis.com',
  'movie_27205': 'https://googleapis.com',
  'movie_157336': 'https://googleapis.com',

  // TV Shows (Format: tv_{tmdb_id}_{season}_{episode})
  'tv_1399_1_1': 'https://googleapis.com',
  'tv_1399_1_2': 'https://googleapis.com'
};

// 2. Fallback Video: Plays when an unconfigured TMDB ID or root URL is requested
const FALLBACK_VIDEO_URL = 'https://googleapis.com';

// 3. Standard CORS Headers so browser players (Video.js, Plyr, HTML5) never block playback
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Origin',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type'
};

/**
 * Resolves the incoming URL path to a target MP4 file URL
 */
function resolveMediaUrl(pathname) {
  // Clean trailing slashes (except root '/')
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  // Root path: '/' -> Serve default test video
  if (cleanPath === '/' || cleanPath === '') {
    return {
      key: 'default_root',
      url: FALLBACK_VIDEO_URL
    };
  }

  // Match TV Show patterns:
  // /stream/tv/1399/1/1.mp4 | /tv/1399/1/1.mp4 | /tv/1399/1/1
  const tvRegex = /^\/(?:stream\/)?tv\/(\d+)\/(\d+)\/(\d+)(?:\.mp4)?$/i;
  const tvMatch = cleanPath.match(tvRegex);
  if (tvMatch) {
    const [, tmdbId, season, episode] = tvMatch;
    const key = `tv_${tmdbId}_${season}_${episode}`;
    return {
      key,
      url: MEDIA_DATABASE[key] || FALLBACK_VIDEO_URL
    };
  }

  // Match Movie patterns:
  // /stream/movie/550.mp4 | /movie/550.mp4 | /movie/550 | /550.mp4 | /550
  const movieRegex = /^\/(?:stream\/)?(?:movie\/)?(\d+)(?:\.mp4)?$/i;
  const movieMatch = cleanPath.match(movieRegex);
  if (movieMatch) {
    const [, tmdbId] = movieMatch;
    const key = `movie_${tmdbId}`;
    return {
      key,
      url: MEDIA_DATABASE[key] || FALLBACK_VIDEO_URL
    };
  }

  // Fallback for any other unrecognized path
  return {
    key: 'fallback_unmatched',
    url: FALLBACK_VIDEO_URL
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Handle browser CORS preflight checks
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // Only allow GET and HEAD requests for video playback
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: CORS_HEADERS
      });
    }

    // Health check endpoint to verify deployment status
    if (url.pathname === '/health' || url.pathname === '/status') {
      return new Response(
        JSON.stringify({
          status: 'online',
          service: 'Cloudflare MP4 Stream Router',
          configured_titles: Object.keys(MEDIA_DATABASE).length
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Resolve target MP4 URL
    const resolved = resolveMediaUrl(url.pathname);

    // Build clean upstream request headers (DO NOT forward the Worker's Host header)
    const upstreamHeaders = new Headers();
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      upstreamHeaders.set('Range', rangeHeader);
    }
    upstreamHeaders.set('User-Agent', 'Cloudflare-Worker-Media-Proxy/1.0');

    try {
      const upstreamResponse = await fetch(resolved.url, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: 'follow'
      });

      // Prepare clean response headers for the video player
      const responseHeaders = new Headers();
      const passthroughHeaders = [
        'Content-Type',
        'Content-Length',
        'Content-Range',
        'Accept-Ranges',
        'Cache-Control',
        'ETag',
        'Last-Modified'
      ];

      for (const headerName of passthroughHeaders) {
        const value = upstreamResponse.headers.get(headerName);
        if (value) {
          responseHeaders.set(headerName, value);
        }
      }

      // Ensure Content-Type defaults to video/mp4 if missing
      if (!responseHeaders.has('Content-Type')) {
        responseHeaders.set('Content-Type', 'video/mp4');
      }

      // Ensure Accept-Ranges is advertised so seeking/scrubbing works
      if (!responseHeaders.has('Accept-Ranges')) {
        responseHeaders.set('Accept-Ranges', 'bytes');
      }

      // Attach CORS headers
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        responseHeaders.set(key, value);
      }

      // Debug header so you can inspect which key matched in browser DevTools
      responseHeaders.set('X-Resolved-Media-Key', resolved.key);

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: 'Upstream video fetch failed',
          details: err.message
        }),
        {
          status: 502,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
};
