import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import timingRouter from './timing.js';
import {
  OPTIMAL_HOURS,
  DAY_MULTIPLIERS,
  type DayOfWeek,
} from '@postmaker/shared';

const DAYS: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/timing', timingRouter);
  return app;
}

describe('Timing Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createApp();
  });

  describe('GET /', () => {
    it('returns success response with correct structure', async () => {
      const res = await request(app).get('/api/timing');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('contains optimalHours array with correct properties', async () => {
      const res = await request(app).get('/api/timing');

      expect(res.body.data.optimalHours).toBeInstanceOf(Array);
      expect(res.body.data.optimalHours.length).toBeGreaterThan(0);

      const firstHour = res.body.data.optimalHours[0];
      expect(firstHour).toHaveProperty('hour');
      expect(firstHour).toHaveProperty('score');
      expect(firstHour).toHaveProperty('engagementMultiplier');
      expect(firstHour).toHaveProperty('audienceActivity');

      expect(typeof firstHour.hour).toBe('number');
      expect(typeof firstHour.score).toBe('number');
      expect(typeof firstHour.engagementMultiplier).toBe('number');
      expect(['low', 'medium', 'high', 'peak']).toContain(
        firstHour.audienceActivity
      );
    });

    it('filters optimalHours to only high/peak activity times', async () => {
      const res = await request(app).get('/api/timing');

      const activities = res.body.data.optimalHours.map(
        (h: { audienceActivity: string }) => h.audienceActivity
      );
      expect(activities.every((a: string) => a === 'high' || a === 'peak')).toBe(
        true
      );
    });

    it('contains dayOfWeek array for all 7 days', async () => {
      const res = await request(app).get('/api/timing');

      expect(res.body.data.dayOfWeek).toBeInstanceOf(Array);
      expect(res.body.data.dayOfWeek.length).toBe(7);

      const days = res.body.data.dayOfWeek.map(
        (d: { day: string }) => d.day
      );
      expect(days).toEqual(DAYS);
    });

    it('each day has bestHours, overallScore, and reasoning', async () => {
      const res = await request(app).get('/api/timing');

      for (const day of res.body.data.dayOfWeek) {
        expect(day).toHaveProperty('day');
        expect(day).toHaveProperty('bestHours');
        expect(day).toHaveProperty('overallScore');
        expect(day).toHaveProperty('reasoning');

        expect(DAYS).toContain(day.day);
        expect(day.bestHours).toBeInstanceOf(Array);
        expect(day.bestHours.length).toBeGreaterThan(0);
        expect(typeof day.overallScore).toBe('number');
        expect(typeof day.reasoning).toBe('string');
        expect(day.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('day scores reflect DAY_MULTIPLIERS from shared constants', async () => {
      const res = await request(app).get('/api/timing');

      for (const day of res.body.data.dayOfWeek) {
        const expectedScore = Math.round(DAY_MULTIPLIERS[day.day as DayOfWeek] * 100);
        expect(day.overallScore).toBe(expectedScore);
      }
    });

    it('weekday bestHours match OPTIMAL_HOURS.weekday', async () => {
      const res = await request(app).get('/api/timing');

      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const expectedWeekdayHours = [
        ...OPTIMAL_HOURS.weekday.morning,
        ...OPTIMAL_HOURS.weekday.lunch,
        ...OPTIMAL_HOURS.weekday.evening,
      ].sort((a, b) => a - b);

      for (const dayData of res.body.data.dayOfWeek) {
        if (weekdays.includes(dayData.day)) {
          expect(dayData.bestHours).toEqual(expectedWeekdayHours);
        }
      }
    });

    it('weekend bestHours match OPTIMAL_HOURS.weekend', async () => {
      const res = await request(app).get('/api/timing');

      const expectedWeekendHours = [
        ...OPTIMAL_HOURS.weekend.morning,
        ...OPTIMAL_HOURS.weekend.afternoon,
        ...OPTIMAL_HOURS.weekend.evening,
      ].sort((a, b) => a - b);

      for (const dayData of res.body.data.dayOfWeek) {
        if (dayData.day === 'saturday' || dayData.day === 'sunday') {
          expect(dayData.bestHours).toEqual(expectedWeekendHours);
        }
      }
    });

    it('handles timezone parameter and returns it in response', async () => {
      const res = await request(app).get('/api/timing?timezone=America/New_York');

      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('America/New_York');
    });

    it('defaults timezone to UTC when not provided', async () => {
      const res = await request(app).get('/api/timing');

      expect(res.body.data.timezone).toBe('UTC');
    });

    it('contains reasoning array with engagement tips', async () => {
      const res = await request(app).get('/api/timing');

      expect(res.body.data.reasoning).toBeInstanceOf(Array);
      expect(res.body.data.reasoning.length).toBeGreaterThan(0);
      expect(
        res.body.data.reasoning.every((r: unknown) => typeof r === 'string')
      ).toBe(true);
    });

    it('reasoning includes advice about weekday evenings', async () => {
      const res = await request(app).get('/api/timing');

      const hasEveningAdvice = res.body.data.reasoning.some((r: string) =>
        r.toLowerCase().includes('evening')
      );
      expect(hasEveningAdvice).toBe(true);
    });
  });

  describe('GET /now', () => {
    it('returns current timing analysis', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('contains isOptimalTime boolean', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.body.data).toHaveProperty('isOptimalTime');
      expect(typeof res.body.data.isOptimalTime).toBe('boolean');
    });

    it('contains currentScore number', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.body.data).toHaveProperty('currentScore');
      expect(typeof res.body.data.currentScore).toBe('number');
      expect(res.body.data.currentScore).toBeGreaterThanOrEqual(0);
      expect(res.body.data.currentScore).toBeLessThanOrEqual(100);
    });

    it('contains nextOptimalTime as ISO date string', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.body.data).toHaveProperty('nextOptimalTime');
      const nextTime = new Date(res.body.data.nextOptimalTime);
      expect(nextTime).toBeInstanceOf(Date);
      expect(isNaN(nextTime.getTime())).toBe(false);
    });

    it('contains waitTimeMinutes number', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.body.data).toHaveProperty('waitTimeMinutes');
      expect(typeof res.body.data.waitTimeMinutes).toBe('number');
      expect(res.body.data.waitTimeMinutes).toBeGreaterThanOrEqual(0);
    });

    it('contains appropriate recommendation string', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.body.data).toHaveProperty('recommendation');
      expect(typeof res.body.data.recommendation).toBe('string');
      expect(res.body.data.recommendation.length).toBeGreaterThan(0);
    });

    it('recommendation reflects optimal time status', async () => {
      const res = await request(app).get('/api/timing/now');

      if (res.body.data.isOptimalTime) {
        expect(res.body.data.recommendation.toLowerCase()).toContain('great time');
        expect(res.body.data.waitTimeMinutes).toBe(0);
      } else {
        expect(res.body.data.recommendation.toLowerCase()).toContain('waiting');
      }
    });

    it('contains currentTime as valid ISO date string', async () => {
      const beforeRequest = new Date();
      const res = await request(app).get('/api/timing/now');
      const afterRequest = new Date();

      expect(res.body.data).toHaveProperty('currentTime');
      const currentTime = new Date(res.body.data.currentTime);
      expect(isNaN(currentTime.getTime())).toBe(false);
      // Current time should be between before and after request
      expect(currentTime.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime() - 1000);
      expect(currentTime.getTime()).toBeLessThanOrEqual(afterRequest.getTime() + 1000);
    });

    it('contains nextOptimalScore number', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.body.data).toHaveProperty('nextOptimalScore');
      expect(typeof res.body.data.nextOptimalScore).toBe('number');
      expect(res.body.data.nextOptimalScore).toBeGreaterThanOrEqual(0);
      expect(res.body.data.nextOptimalScore).toBeLessThanOrEqual(100);
    });

    it('handles timezone parameter', async () => {
      const res = await request(app).get('/api/timing/now?timezone=Europe/London');

      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('Europe/London');
    });

    it('defaults timezone to UTC', async () => {
      const res = await request(app).get('/api/timing/now');

      expect(res.body.data.timezone).toBe('UTC');
    });

    describe('optimal time detection', () => {
      it('isOptimalTime is true when waitTimeMinutes is 0', async () => {
        const res = await request(app).get('/api/timing/now');

        // When it's optimal time, wait time should be 0
        if (res.body.data.isOptimalTime) {
          expect(res.body.data.waitTimeMinutes).toBe(0);
        }
        // When not optimal, wait time should be positive
        if (!res.body.data.isOptimalTime) {
          expect(res.body.data.waitTimeMinutes).toBeGreaterThan(0);
        }
      });

      it('recommendation matches optimal time status', async () => {
        const res = await request(app).get('/api/timing/now');

        if (res.body.data.isOptimalTime) {
          expect(res.body.data.recommendation.toLowerCase()).toContain('great time');
        } else {
          expect(res.body.data.recommendation.toLowerCase()).toContain('waiting');
        }
      });

      it('nextOptimalTime is in the future when not optimal', async () => {
        const res = await request(app).get('/api/timing/now');

        if (!res.body.data.isOptimalTime) {
          const currentTime = new Date(res.body.data.currentTime);
          const nextOptimal = new Date(res.body.data.nextOptimalTime);
          expect(nextOptimal.getTime()).toBeGreaterThan(currentTime.getTime());
        }
      });

      it('nextOptimalScore is a valid score between 0 and 100', async () => {
        const res = await request(app).get('/api/timing/now');

        expect(res.body.data.nextOptimalScore).toBeGreaterThanOrEqual(0);
        expect(res.body.data.nextOptimalScore).toBeLessThanOrEqual(100);
      });

      it('waitTimeMinutes is consistent with time difference', async () => {
        const res = await request(app).get('/api/timing/now');

        if (!res.body.data.isOptimalTime && res.body.data.waitTimeMinutes > 0) {
          const currentTime = new Date(res.body.data.currentTime);
          const nextOptimal = new Date(res.body.data.nextOptimalTime);
          const calculatedWait = Math.round(
            (nextOptimal.getTime() - currentTime.getTime()) / (1000 * 60)
          );
          expect(res.body.data.waitTimeMinutes).toBe(calculatedWait);
        }
      });
    });

    describe('score calculations', () => {
      it('currentScore is within valid range (0-100)', async () => {
        const res = await request(app).get('/api/timing/now');

        expect(res.body.data.currentScore).toBeGreaterThanOrEqual(0);
        expect(res.body.data.currentScore).toBeLessThanOrEqual(100);
      });

      it('nextOptimalScore reflects day multiplier effect', async () => {
        const res = await request(app).get('/api/timing/now');

        // Next optimal score should reflect the day's multiplier
        // Wednesday has 1.10 multiplier, Saturday has 0.85
        // So optimal scores should be between ~77 (0.85 * 90) and ~99 (1.10 * 90)
        expect(res.body.data.nextOptimalScore).toBeGreaterThanOrEqual(70);
        expect(res.body.data.nextOptimalScore).toBeLessThanOrEqual(100);
      });

      it('scores are integers', async () => {
        const res = await request(app).get('/api/timing/now');

        expect(Number.isInteger(res.body.data.currentScore)).toBe(true);
        expect(Number.isInteger(res.body.data.nextOptimalScore)).toBe(true);
      });
    });
  });
});
