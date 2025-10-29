import { Request, Response } from 'express';
import mongoose from 'mongoose';
import RankedMovieModel from '../models/movie/RankedMovie';
import { startSession } from '../utils/comparisonSession';

export const startRerank = async (req: Request, res: Response) => {
  try {
    const userId = (req as { userId?: string }).userId as string;
    const { rankedId } = req.body as { rankedId: string };
    if (!rankedId || !mongoose.Types.ObjectId.isValid(rankedId)) {
      return res.status(400).json({ success: false, message: 'Invalid rankedId' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const doc = await RankedMovieModel.findOne({ _id: rankedId, userId: userObjectId });
    if (!doc) return res.status(404).json({ success: false, message: 'Ranked movie not found' });

    // Remove the item and close the gap
    const removedRank = doc.rank;
    const newMovie = { movieId: doc.movieId, title: doc.title, posterPath: doc.posterPath as string | undefined };
    await doc.deleteOne();
    await RankedMovieModel.updateMany({ userId: userObjectId, rank: { $gt: removedRank } }, { $inc: { rank: -1 } });

    // After removal, if list is empty, insert at rank 1 directly
    const remaining = await RankedMovieModel.find({ userId: userObjectId }).sort({ rank: 1 });
    if (remaining.length === 0) {
      const re = new RankedMovieModel({
        userId: userObjectId,
        movieId: newMovie.movieId,
        title: newMovie.title,
        posterPath: newMovie.posterPath,
        rank: 1
      });
      await re.save();
      return res.json({ success: true, status: 'added', data: re });
    }

    // Start a compare session and return mid element as first comparator
    startSession(userId, newMovie, remaining.length - 1);
    const mid = Math.floor((0 + (remaining.length - 1)) / 2);
    const cmp = remaining[mid];
    return res.json({
      success: true,
      status: 'compare',
      data: {
        compareWith: {
          id: cmp.movieId,
          title: cmp.title,
          overview: null,
          posterPath: cmp.posterPath ?? null,
          releaseDate: null,
          voteAverage: null
        }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Unable to start rerank. Please try again' });
  }
};

