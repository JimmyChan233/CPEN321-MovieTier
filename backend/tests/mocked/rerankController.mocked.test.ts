import { startRerank } from '../../src/controllers/rerankController';
import RankedMovieModel from '../../src/models/movie/RankedMovie';
import { startSession } from '../../src/utils/comparisonSession';
import mongoose from 'mongoose';

jest.mock('../../src/models/movie/RankedMovie');
jest.mock('../../src/utils/comparisonSession');

const mockReq = (body: any, userId?: string) => ({ body, userId });
const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('startRerank (mocked)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 if user not authorized', async () => {
    const req = mockReq({}, undefined);
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 for invalid rankedId', async () => {
    const req = mockReq({ rankedId: 'abc' }, '507f1f77bcf86cd799439011');
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 if movie not found', async () => {
    (RankedMovieModel.findOne as any).mockResolvedValue(null);
    const req = mockReq(
      { rankedId: new mongoose.Types.ObjectId().toString() },
      '507f1f77bcf86cd799439011'
    );
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 if cmp undefined (compareWith missing)', async () => {
    (RankedMovieModel.findOne as any).mockResolvedValue({
      _id: 'x',
      userId: new mongoose.Types.ObjectId(),
      rank: 1,
      movieId: 123,
      title: 'Test Movie',
      posterPath: '/x.jpg',
      deleteOne: jest.fn()
    });
    (RankedMovieModel.updateMany as any).mockResolvedValue({});
    (RankedMovieModel.find as any).mockResolvedValue([null]);
    const req = mockReq(
      { rankedId: new mongoose.Types.ObjectId().toString() },
      '507f1f77bcf86cd799439011'
    );
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('handles thrown error gracefully', async () => {
    (RankedMovieModel.findOne as any).mockRejectedValue(new Error('DB error'));
    const req = mockReq(
      { rankedId: new mongoose.Types.ObjectId().toString() },
      '507f1f77bcf86cd799439011'
    );
    const res = mockRes();
    await startRerank(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 if compareWith movie is undefined', async () => {
  const mockDoc = {
    _id: 'x',
    userId: new mongoose.Types.ObjectId(),
    rank: 1,
    movieId: 123,
    title: 'Test Movie',
    posterPath: '/x.jpg',
    deleteOne: jest.fn().mockResolvedValue({})
  };
  
  (RankedMovieModel.findOne as any).mockResolvedValue(mockDoc);
  (RankedMovieModel.updateMany as any).mockResolvedValue({});
  
  // Mock find to return an array with at least one element, but mock .at() to return undefined
  const mockFind = jest.fn().mockReturnValue({
    sort: jest.fn().mockResolvedValue({
      length: 1,
      at: jest.fn().mockReturnValue(undefined) // This triggers the error on line 46
    })
  });
  (RankedMovieModel.find as any) = mockFind;
  
  const req = mockReq(
    { rankedId: new mongoose.Types.ObjectId().toString() },
    '507f1f77bcf86cd799439011'
  );
  const res = mockRes();
  
  await startRerank(req as any, res as any);
  
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    message: 'Unable to find comparison movie'
  });
});

});
