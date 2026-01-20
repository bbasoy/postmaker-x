import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { PostAnalysis } from '@postmaker/shared';

vi.mock('../db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    query: {
      analysisHistory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  },
  schema: {
    analysisHistory: { id: 'id' },
  },
}));

import analyzeRouter from './analyze.js';
import { errorHandler } from '../middleware/error.js';
import { db } from '../db/index.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/analyze', analyzeRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with PostAnalysis data', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/analyze')
      .send({ content: 'This is a great test post!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('returns correct analysis structure', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/analyze')
      .send({ content: 'Testing the analysis endpoint with meaningful content' });

    expect(response.status).toBe(200);
    const analysis: PostAnalysis = response.body.data;

    expect(analysis).toHaveProperty('overallScore');
    expect(typeof analysis.overallScore).toBe('number');
    expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
    expect(analysis.overallScore).toBeLessThanOrEqual(100);

    expect(analysis).toHaveProperty('engagementScores');
    expect(analysis.engagementScores).toHaveProperty('likeability');
    expect(analysis.engagementScores).toHaveProperty('replyability');
    expect(analysis.engagementScores).toHaveProperty('retweetability');
    expect(analysis.engagementScores).toHaveProperty('quoteability');
    expect(analysis.engagementScores).toHaveProperty('shareability');
    expect(analysis.engagementScores).toHaveProperty('dwellPotential');
    expect(analysis.engagementScores).toHaveProperty('followPotential');

    expect(analysis).toHaveProperty('contentMetrics');
    expect(analysis.contentMetrics).toHaveProperty('characterCount');
    expect(analysis.contentMetrics).toHaveProperty('wordCount');
    expect(analysis.contentMetrics).toHaveProperty('hasMedia');

    expect(analysis).toHaveProperty('algorithmSignals');
    expect(analysis.algorithmSignals).toHaveProperty('positiveSignals');
    expect(analysis.algorithmSignals).toHaveProperty('negativeSignals');
    expect(analysis.algorithmSignals).toHaveProperty('neutralSignals');

    expect(analysis).toHaveProperty('suggestions');
    expect(Array.isArray(analysis.suggestions)).toBe(true);

    expect(analysis).toHaveProperty('warnings');
    expect(Array.isArray(analysis.warnings)).toBe(true);
  });

  it('validates content is required (empty string fails)', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/analyze')
      .send({ content: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'content',
          message: 'Content is required',
        }),
      ])
    );
  });

  it('validates content max length (10000 chars)', async () => {
    const app = createApp();
    const longContent = 'a'.repeat(10001);
    const response = await request(app)
      .post('/api/analyze')
      .send({ content: longContent });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'content',
          message: 'Content too long',
        }),
      ])
    );
  });

  it('validates missing content field returns 400', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/api/analyze')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation Error');
  });

  it('handles hasMedia boolean parameter', async () => {
    const app = createApp();

    const responseWithMedia = await request(app)
      .post('/api/analyze')
      .send({ content: 'Post with media attached', hasMedia: true });

    expect(responseWithMedia.status).toBe(200);
    expect(responseWithMedia.body.data.contentMetrics.hasMedia).toBe(true);

    const responseWithoutMedia = await request(app)
      .post('/api/analyze')
      .send({ content: 'Post without media', hasMedia: false });

    expect(responseWithoutMedia.status).toBe(200);
    expect(responseWithoutMedia.body.data.contentMetrics.hasMedia).toBe(false);
  });

  it('handles saveHistory boolean parameter (default true)', async () => {
    const app = createApp();
    const insertMock = vi.mocked(db.insert);

    await request(app)
      .post('/api/analyze')
      .send({ content: 'Test post for history' });

    expect(insertMock).toHaveBeenCalled();
  });

  it('does not save to history when saveHistory is false', async () => {
    const app = createApp();
    const insertMock = vi.mocked(db.insert);
    insertMock.mockClear();

    await request(app)
      .post('/api/analyze')
      .send({ content: 'Test post without saving', saveHistory: false });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it('accepts content at exactly max length (10000 chars)', async () => {
    const app = createApp();
    const maxContent = 'a'.repeat(10000);
    const response = await request(app)
      .post('/api/analyze')
      .send({ content: maxContent });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('GET /api/analyze/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with array of history items', async () => {
    const app = createApp();
    const response = await request(app).get('/api/analyze/history');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('returns empty array when no history exists', async () => {
    const app = createApp();
    const response = await request(app).get('/api/analyze/history');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('returns history items with correct structure', async () => {
    const mockAnalysis: PostAnalysis = {
      overallScore: 75,
      engagementScores: {
        likeability: 70,
        replyability: 65,
        retweetability: 80,
        quoteability: 75,
        shareability: 72,
        dwellPotential: 68,
        followPotential: 60,
      },
      contentMetrics: {
        characterCount: 50,
        wordCount: 10,
        sentenceCount: 2,
        readingTimeSeconds: 5,
        hasMedia: false,
        mediaCount: 0,
        hasQuestion: false,
        questionCount: 0,
        hasHashtags: false,
        hashtagCount: 0,
        hasMentions: false,
        mentionCount: 0,
        hasLinks: false,
        linkCount: 0,
        hasEmojis: false,
        emojiCount: 0,
        hasCTA: false,
        isThread: false,
        threadLength: 1,
      },
      algorithmSignals: {
        positiveSignals: [],
        negativeSignals: [],
        neutralSignals: [],
      },
      suggestions: [],
      warnings: [],
    };

    const mockHistory = [
      {
        id: 'test-id-1',
        postContent: 'Test post content',
        analysis: JSON.stringify(mockAnalysis),
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    vi.mocked(db.query.analysisHistory.findMany).mockResolvedValueOnce(mockHistory);

    const app = createApp();
    const response = await request(app).get('/api/analyze/history');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);

    const historyItem = response.body.data[0];
    expect(historyItem).toHaveProperty('id', 'test-id-1');
    expect(historyItem).toHaveProperty('postContent', 'Test post content');
    expect(historyItem).toHaveProperty('analysis');
    expect(historyItem).toHaveProperty('createdAt');
    expect(historyItem.analysis.overallScore).toBe(75);
  });

  it('parses analysis JSON string from database', async () => {
    const mockAnalysis: PostAnalysis = {
      overallScore: 85,
      engagementScores: {
        likeability: 80,
        replyability: 75,
        retweetability: 90,
        quoteability: 85,
        shareability: 82,
        dwellPotential: 78,
        followPotential: 70,
      },
      contentMetrics: {
        characterCount: 100,
        wordCount: 20,
        sentenceCount: 3,
        readingTimeSeconds: 10,
        hasMedia: true,
        mediaCount: 1,
        hasQuestion: true,
        questionCount: 1,
        hasHashtags: false,
        hashtagCount: 0,
        hasMentions: false,
        mentionCount: 0,
        hasLinks: false,
        linkCount: 0,
        hasEmojis: true,
        emojiCount: 2,
        hasCTA: true,
        isThread: false,
        threadLength: 1,
      },
      algorithmSignals: {
        positiveSignals: [
          { name: 'has_question', score: 10, weight: 1.5, description: 'Post contains a question', impact: 'high' },
        ],
        negativeSignals: [],
        neutralSignals: [],
      },
      suggestions: [
        { type: 'add_media', priority: 'medium', message: 'Add media', potentialScoreIncrease: 5 },
      ],
      warnings: [],
    };

    const mockHistory = [
      {
        id: 'test-id-2',
        postContent: 'Another test post?',
        analysis: JSON.stringify(mockAnalysis),
        createdAt: new Date('2024-01-02T00:00:00Z'),
      },
    ];

    vi.mocked(db.query.analysisHistory.findMany).mockResolvedValueOnce(mockHistory);

    const app = createApp();
    const response = await request(app).get('/api/analyze/history');

    expect(response.status).toBe(200);
    const parsedAnalysis = response.body.data[0].analysis;
    expect(parsedAnalysis.overallScore).toBe(85);
    expect(parsedAnalysis.engagementScores.likeability).toBe(80);
    expect(parsedAnalysis.contentMetrics.hasQuestion).toBe(true);
    expect(parsedAnalysis.algorithmSignals.positiveSignals).toHaveLength(1);
    expect(parsedAnalysis.suggestions).toHaveLength(1);
  });

  it('handles analysis already as object (not stringified)', async () => {
    const mockAnalysis: PostAnalysis = {
      overallScore: 60,
      engagementScores: {
        likeability: 55,
        replyability: 50,
        retweetability: 65,
        quoteability: 60,
        shareability: 58,
        dwellPotential: 52,
        followPotential: 45,
      },
      contentMetrics: {
        characterCount: 30,
        wordCount: 5,
        sentenceCount: 1,
        readingTimeSeconds: 3,
        hasMedia: false,
        mediaCount: 0,
        hasQuestion: false,
        questionCount: 0,
        hasHashtags: false,
        hashtagCount: 0,
        hasMentions: false,
        mentionCount: 0,
        hasLinks: false,
        linkCount: 0,
        hasEmojis: false,
        emojiCount: 0,
        hasCTA: false,
        isThread: false,
        threadLength: 1,
      },
      algorithmSignals: {
        positiveSignals: [],
        negativeSignals: [],
        neutralSignals: [],
      },
      suggestions: [],
      warnings: [],
    };

    const mockHistory = [
      {
        id: 'test-id-3',
        postContent: 'Short post',
        analysis: mockAnalysis,
        createdAt: new Date('2024-01-03T00:00:00Z'),
      },
    ];

    vi.mocked(db.query.analysisHistory.findMany).mockResolvedValueOnce(mockHistory);

    const app = createApp();
    const response = await request(app).get('/api/analyze/history');

    expect(response.status).toBe(200);
    expect(response.body.data[0].analysis.overallScore).toBe(60);
  });
});
