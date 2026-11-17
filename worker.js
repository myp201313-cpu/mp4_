const mediaDatabase = {
  'movie_550': 'https://googleapis.com',
  'tv_1399_1_1': 'https://googleapis.com'
};

// Default test video if a TMDB ID is not listed above yet
const defaultVideo = 'https://googleapis.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    let mp4Url = null;

    const movieMatch = path.match(/^\/stream\/movie\/(\d+)\.mp4$/);
    if (movieMatch) {
      const [, tmdbId] = movieMatch;
      mp4Url = mediaDatabase[`movie_${tmdbId}`] || defaultVideo;
    }

    const tvMatch = path.match(/^\/stream\/tv\/(\d+)\/(\d+)\/(\d+)\.mp4$/);
    if (tvMatch) {
      const [, tmdbId, season, episode] = tvMatch;
      mp4Url = mediaDatabase[`tv_${tmdbId}_${season}_${episode}`] || defaultVideo;
    }

    if (!mp4Url) {
      return new Response('Invalid URL format', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Stream video with CORS headers for web players
    const videoResponse = await fetch(mp4Url, {
      headers: request.headers
    });

    const newHeaders = new Headers(videoResponse.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(videoResponse.body, {
      status: videoResponse.status,
      headers: newHeaders
    });
  }
};
