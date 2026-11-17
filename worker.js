// Map TMDB IDs to your hosted MP4 files
const mediaDatabase = {
  'movie_550': 'https://googleapis.com',
  'tv_1399_1_1': 'https://googleapis.com'
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Match Movie URL: /stream/movie/{tmdb_id}.mp4
    const movieMatch = path.match(/^\/stream\/movie\/(\d+)\.mp4$/);
    if (movieMatch) {
      const [, tmdbId] = movieMatch;
      const mp4Url = mediaDatabase[`movie_${tmdbId}`];

      if (!mp4Url) {
        return new Response('MP4 not found', { status: 404 });
      }
      return Response.redirect(mp4Url, 302);
    }

    // Match TV URL: /stream/tv/{tmdb_id}/{season}/{episode}.mp4
    const tvMatch = path.match(/^\/stream\/tv\/(\d+)\/(\d+)\/(\d+)\.mp4$/);
    if (tvMatch) {
      const [, tmdbId, season, episode] = tvMatch;
      const mp4Url = mediaDatabase[`tv_${tmdbId}_${season}_${episode}`];

      if (!mp4Url) {
        return new Response('Episode MP4 not found', { status: 404 });
      }
      return Response.redirect(mp4Url, 302);
    }

    return new Response('Stream server is active. Use /stream/movie/{id}.mp4 or /stream/tv/{id}/{season}/{episode}.mp4', {
      status: 200
    });
  }
};
