const mediaDatabase = {
  'movie_550': 'https://googleapis.com',
  'tv_1399_1_1': 'https://googleapis.com'
};

const defaultVideo = 'https://googleapis.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    let mp4Url = defaultVideo;

    // Matches /stream/tv/1399/1/1.mp4 or /tv/1399/1/1
    const tvMatch = path.match(/\/tv\/(\d+)\/(\d+)\/(\d+)/);
    if (tvMatch) {
      const [, tmdbId, season, episode] = tvMatch;
      mp4Url = mediaDatabase[`tv_${tmdbId}_${season}_${episode}`] || defaultVideo;
    } else {
      // Matches /stream/movie/550.mp4, /movie/550, or /550.mp4
      const movieMatch = path.match(/\/(?:movie\/)?(\d+)/);
      if (movieMatch) {
        const [, tmdbId] = movieMatch;
        mp4Url = mediaDatabase[`movie_${tmdbId}`] || defaultVideo;
      }
    }

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
