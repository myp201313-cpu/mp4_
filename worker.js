const mediaDatabase = {
  'movie_550': 'https://googleapis.com',
  'tv_1399_1_1': 'https://googleapis.com'
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    let mp4Url = null;

    const movieMatch = path.match(/^\/stream\/movie\/(\d+)\.mp4$/);
    if (movieMatch) {
      mp4Url = mediaDatabase[`movie_${movieMatch}`];
    }

    const tvMatch = path.match(/^\/stream\/tv\/(\d+)\/(\d+)\/(\d+)\.mp4$/);
    if (tvMatch) {
      const [, tmdbId, season, episode] = tvMatch;
      mp4Url = mediaDatabase[`tv_${tmdbId}_${season}_${episode}`];
    }

    if (!mp4Url) {
      return new Response('MP4 not found', {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Fetch and stream the video with CORS headers so web players don't block it
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
