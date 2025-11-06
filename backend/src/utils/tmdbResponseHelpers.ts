/**
 * Helper functions for normalizing and handling TMDB API responses
 */

// Type definitions for TMDB responses
interface TmdbMovie {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  vote_average?: number;
}

interface TmdbVideo {
  key?: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
}

interface TmdbCastMember {
  name?: string;
}

interface MovieDetails {
  id?: number;
  title?: string;
  overview?: string | null;
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
}

/**
 * Normalize TMDB movie details response
 */
export function normalizeMovieDetails(data: any): MovieDetails {
  return {
    id: data?.id,
    title: data?.title,
    overview: data?.overview || null,
    posterPath: data?.poster_path || null,
    releaseDate: data?.release_date || null,
    voteAverage: data?.vote_average || null
  };
}

/**
 * Normalize cast array from TMDB credits response
 */
export function normalizeCastArray(castData: any[] | undefined): string[] {
  if (!Array.isArray(castData)) {
    return [];
  }
  return castData
    .slice(0, 5)
    .map((c: unknown) => {
      const castMember = c as TmdbCastMember;
      return castMember.name;
    })
    .filter(Boolean) as string[];
}

/**
 * Find the best trailer from a list of YouTube videos
 * Priority: Official Trailer > Trailer > Teaser > First video
 */
export function findBestTrailer(youtubeVideos: TmdbVideo[]): TmdbVideo | null {
  // Try to find official trailer first
  const officialTrailer = youtubeVideos.find(
    (v) => v.type === 'Trailer' && v.official
  );
  if (officialTrailer) return officialTrailer;

  // Try to find any trailer
  const anyTrailer = youtubeVideos.find((v) => v.type === 'Trailer');
  if (anyTrailer) return anyTrailer;

  // Try to find teaser
  const teaser = youtubeVideos.find((v) => v.type === 'Teaser');
  if (teaser) return teaser;

  // Return first video if available
  return youtubeVideos[0] || null;
}

/**
 * Filter videos to only YouTube videos
 */
export function filterYoutubeVideos(videos: any[]): TmdbVideo[] {
  if (!Array.isArray(videos)) {
    return [];
  }
  return videos.filter((v: unknown) => {
    const video = v as TmdbVideo;
    return video.site === 'YouTube';
  });
}
