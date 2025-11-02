interface CompareSession {
  newMovie: {
    movieId: number;
    title: string;
    posterPath?: string;
  };
  low: number;
  high: number;
}

const sessionStore = new Map<string, CompareSession>();

export const startSession = (
  userId: string,
  movie: CompareSession['newMovie'],
  maxIndex: number
) => {
  sessionStore.set(userId, {
    newMovie: movie,
    low: 0,
    high: maxIndex,
  });
};

export const getSession = (userId: string) => sessionStore.get(userId);

export const updateSession = (userId: string, low: number, high: number) => {
  const s = sessionStore.get(userId);
  if (!s) return;
  s.low = low;
  s.high = high;
};

export const endSession = (userId: string) => {
  sessionStore.delete(userId);
};
