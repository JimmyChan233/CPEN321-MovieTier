/**
 * Helper functions for normalizing and handling TMDB API responses
 */

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

interface TmdbMovieDetailsResponse {
  id?: number;
  title?: string;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
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
export function normalizeMovieDetails(data: unknown): MovieDetails {
  const details =
    typeof data === "object" && data !== null
      ? (data as TmdbMovieDetailsResponse)
      : undefined;

  return {
    id: details?.id,
    title: details?.title,
    overview: details?.overview ?? null,
    posterPath: details?.poster_path ?? null,
    releaseDate: details?.release_date ?? null,
    voteAverage: details?.vote_average ?? null,
  };
}

/**
 * Normalize cast array from TMDB credits response
 */
export function normalizeCastArray(castData: unknown): string[] {
  if (!Array.isArray(castData)) {
    return [];
  }
  return castData
    .slice(0, 5)
    .map((castMember) => {
      if (typeof castMember !== "object" || castMember === null) {
        return undefined;
      }
      const { name } = castMember as TmdbCastMember;
      return typeof name === "string" ? name : undefined;
    })
    .filter((name): name is string => Boolean(name));
}

/**
 * Find the best trailer from a list of YouTube videos
 * Priority: Official Trailer > Trailer > Teaser > First video
 */
export function findBestTrailer(youtubeVideos: TmdbVideo[]): TmdbVideo | null {
  // Try to find official trailer first
  const officialTrailer = youtubeVideos.find(
    (v) => v.type === "Trailer" && v.official,
  );
  if (officialTrailer) return officialTrailer;

  // Try to find any trailer
  const anyTrailer = youtubeVideos.find((v) => v.type === "Trailer");
  if (anyTrailer) return anyTrailer;

  // Try to find teaser
  const teaser = youtubeVideos.find((v) => v.type === "Teaser");
  if (teaser) return teaser;

  // Return first video if available
  return youtubeVideos[0] || null;
}

/**
 * Filter videos to only YouTube videos
 */
export function filterYoutubeVideos(videos: unknown): TmdbVideo[] {
  if (!Array.isArray(videos)) {
    return [];
  }
  return videos.filter(isYoutubeVideo);
}

function isYoutubeVideo(video: unknown): video is TmdbVideo {
  if (typeof video !== "object" || video === null) {
    return false;
  }
  const candidate = video as TmdbVideo;
  return typeof candidate.site === "string" && candidate.site === "YouTube";
}
