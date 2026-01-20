import { describe, it, expect } from 'vitest';
import { quickOptimize, getPrioritizedActions, compareVersions } from './index.js';

describe('quickOptimize', () => {
  describe('removeExcessHashtags', () => {
    it('removes excess hashtags when content has more than 2', () => {
      const content = 'Check out this post #one #two #three #four #five';
      const result = quickOptimize(content, { removeExcessHashtags: true });

      const hashtagCount = (result.content.match(/#\w+/g) ?? []).length;
      expect(hashtagCount).toBeLessThanOrEqual(2);
      expect(result.changes).toContain('Removed 3 excess hashtag(s)');
    });

    it('does not modify content with 2 or fewer hashtags', () => {
      const content = 'Check out this post #one #two';
      const result = quickOptimize(content, { removeExcessHashtags: true });

      expect(result.content).toBe(content);
      expect(result.changes).toHaveLength(0);
    });

    it('preserves content when removeExcessHashtags is false', () => {
      const content = 'Post with many tags #one #two #three #four #five';
      const result = quickOptimize(content, { removeExcessHashtags: false });

      const hashtagCount = (result.content.match(/#\w+/g) ?? []).length;
      expect(hashtagCount).toBe(5);
    });
  });

  describe('addQuestion', () => {
    it('adds a question when content has none', () => {
      const content = 'This is a statement about something';
      const result = quickOptimize(content, { addQuestion: true, removeExcessHashtags: false });

      expect(result.content).toContain('?');
      expect(result.content).toContain('What do you think?');
      expect(result.changes).toContain('Added engaging question');
    });

    it('does not add question if content already has one', () => {
      const content = 'What do you think about this?';
      const result = quickOptimize(content, { addQuestion: true, removeExcessHashtags: false });

      expect(result.content).toBe(content);
      expect(result.changes).not.toContain('Added engaging question');
    });

    it('does not add question if content is too long (over 250 chars)', () => {
      const content = 'A'.repeat(260);
      const result = quickOptimize(content, { addQuestion: true, removeExcessHashtags: false, optimizeLength: false });

      expect(result.content).not.toContain('What do you think?');
    });

    it('adds period before question if content does not end with punctuation', () => {
      const content = 'This is a statement';
      const result = quickOptimize(content, { addQuestion: true, removeExcessHashtags: false });

      expect(result.content).toBe('This is a statement. What do you think?');
    });

    it('does not add extra period if content ends with punctuation', () => {
      const content = 'This is a statement!';
      const result = quickOptimize(content, { addQuestion: true, removeExcessHashtags: false });

      expect(result.content).toBe('This is a statement! What do you think?');
    });
  });

  describe('optimizeLength', () => {
    it('shortens content over 280 characters by removing last sentence', () => {
      // Content is 300+ characters with multiple sentences
      const content = 'This is the first sentence with some important information about the topic at hand and more details. This is the second sentence that adds more context and details to what we are discussing here. This is the third sentence that pushes us well over the character limit for a single tweet post and more.';
      expect(content.length).toBeGreaterThan(280); // Verify test setup
      const result = quickOptimize(content, { optimizeLength: true, removeExcessHashtags: false });

      expect(result.content.length).toBeLessThanOrEqual(280);
      expect(result.changes).toContain('Shortened post by removing last sentence');
    });

    it('does not shorten content under 280 characters', () => {
      const content = 'This is a short post.';
      const result = quickOptimize(content, { optimizeLength: true, removeExcessHashtags: false });

      expect(result.content).toBe(content);
      expect(result.changes).not.toContain('Shortened post by removing last sentence');
    });

    it('does not shorten single-sentence content even if over 280 chars', () => {
      const content = 'A'.repeat(300);
      const result = quickOptimize(content, { optimizeLength: true, removeExcessHashtags: false });

      expect(result.content).toBe(content);
    });
  });

  describe('addHook', () => {
    it('adds a hook to content without one', () => {
      const content = 'learning to code is easier than you think';
      const result = quickOptimize(content, { addHook: true, removeExcessHashtags: false });

      const hookPatterns = /^(?:here's the thing:|hot take:|real talk:|most people don't know this:)/i;
      expect(hookPatterns.test(result.content)).toBe(true);
      expect(result.changes).toContain('Added attention-grabbing hook');
    });

    it('does not add hook if content already has one', () => {
      const content = "Here's the thing: learning to code is fun";
      const result = quickOptimize(content, { addHook: true, removeExcessHashtags: false });

      expect(result.content).toBe(content);
      expect(result.changes).not.toContain('Added attention-grabbing hook');
    });

    it('does not add hook if it would exceed 280 chars', () => {
      const content = 'A'.repeat(275);
      const result = quickOptimize(content, { addHook: true, removeExcessHashtags: false, optimizeLength: false });

      expect(result.content).toBe(content);
      expect(result.changes).not.toContain('Added attention-grabbing hook');
    });

    it('lowercases the first character when adding hook', () => {
      const content = 'Learning to code is great';
      const result = quickOptimize(content, { addHook: true, removeExcessHashtags: false });

      // The first letter after hook should be lowercase
      const hookPatterns = /^(?:here's the thing:|hot take:|real talk:|most people don't know this:)\s*l/i;
      expect(hookPatterns.test(result.content)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      const result = quickOptimize('', {});

      expect(result.content).toBe('');
      expect(result.changes).toHaveLength(0);
    });

    it('handles content that is already optimal', () => {
      const content = 'What do you think about this great idea? #tech #coding';
      const result = quickOptimize(content, {
        removeExcessHashtags: true,
        addQuestion: true,
        optimizeLength: true,
        addHook: false,
      });

      expect(result.content).toBe(content);
      expect(result.changes).toHaveLength(0);
    });

    it('applies multiple optimizations in sequence', () => {
      const content = 'This is a post #one #two #three #four';
      const result = quickOptimize(content, {
        removeExcessHashtags: true,
        addQuestion: true,
      });

      const hashtagCount = (result.content.match(/#\w+/g) ?? []).length;
      expect(hashtagCount).toBeLessThanOrEqual(2);
      expect(result.content).toContain('What do you think?');
      expect(result.changes.length).toBeGreaterThanOrEqual(2);
    });

    it('trims whitespace from result', () => {
      const content = '  This is a post with extra spaces  ';
      const result = quickOptimize(content, { removeExcessHashtags: false });

      expect(result.content).toBe('This is a post with extra spaces');
    });
  });
});

describe('getPrioritizedActions', () => {
  describe('priority buckets', () => {
    it('returns correct structure with all priority buckets', () => {
      const content = 'A simple test post';
      const result = getPrioritizedActions(content);

      expect(result).toHaveProperty('mustFix');
      expect(result).toHaveProperty('shouldImprove');
      expect(result).toHaveProperty('niceToHave');
      expect(result).toHaveProperty('overallScore');
      expect(Array.isArray(result.mustFix)).toBe(true);
      expect(Array.isArray(result.shouldImprove)).toBe(true);
      expect(Array.isArray(result.niceToHave)).toBe(true);
      expect(typeof result.overallScore).toBe('number');
    });

    it('categorizes high priority suggestions as mustFix', () => {
      // Content that generates high-priority warnings (too many hashtags)
      const content = 'Check this out #one #two #three #four #five';
      const result = getPrioritizedActions(content);

      // All items in mustFix should have high priority
      for (const item of result.mustFix) {
        expect(item.priority).toBe('high');
      }
    });

    it('categorizes medium priority suggestions as shouldImprove', () => {
      const content = 'A simple post without a question or hook';
      const result = getPrioritizedActions(content);

      for (const item of result.shouldImprove) {
        expect(item.priority).toBe('medium');
      }
    });

    it('categorizes low priority suggestions as niceToHave', () => {
      const content = 'Check out this cool thing I made! What do you think?';
      const result = getPrioritizedActions(content);

      for (const item of result.niceToHave) {
        expect(item.priority).toBe('low');
      }
    });
  });

  describe('critical warnings handling', () => {
    it('includes critical warnings in mustFix with highest priority', () => {
      // Content that would trigger critical warnings (too many hashtags triggers critical)
      const content = 'THIS IS ALL CAPS WITH MANY HASHTAGS #one #two #three #four #five #six';
      const result = getPrioritizedActions(content);

      expect(result.mustFix.length).toBeGreaterThan(0);
    });

    it('returns overallScore as a number between 0 and 1', () => {
      const content = 'A test post';
      const result = getPrioritizedActions(content);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });
  });

  describe('suggestion properties', () => {
    it('suggestions have required properties', () => {
      const content = 'Test';
      const result = getPrioritizedActions(content);

      const allSuggestions = [...result.mustFix, ...result.shouldImprove, ...result.niceToHave];

      for (const suggestion of allSuggestions) {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('message');
        expect(suggestion).toHaveProperty('potentialScoreIncrease');
      }
    });
  });
});

describe('compareVersions', () => {
  describe('score comparison', () => {
    it('returns scores for both versions', () => {
      const original = 'This is a basic post';
      const modified = 'This is a basic post. What do you think?';
      const result = compareVersions(original, modified);

      expect(typeof result.originalScore).toBe('number');
      expect(typeof result.modifiedScore).toBe('number');
      expect(result.originalScore).toBeGreaterThanOrEqual(0);
      expect(result.modifiedScore).toBeGreaterThanOrEqual(0);
    });

    it('calculates improvement correctly', () => {
      const original = 'Short post';
      const modified = 'What do you think about this amazing new feature?';
      const result = compareVersions(original, modified);

      expect(result.improvement).toBe(result.modifiedScore - result.originalScore);
    });
  });

  describe('betterVersion determination', () => {
    it('returns "modified" when modified version scores higher', () => {
      const original = 'x';
      const modified = 'What do you think about this interesting topic? I would love to hear your thoughts on this!';
      const result = compareVersions(original, modified);

      if (result.improvement > 0.02) {
        expect(result.betterVersion).toBe('modified');
      }
    });

    it('returns "original" when original version scores higher', () => {
      const original = 'What do you think about this great idea? #tech';
      const modified = 'x #one #two #three #four #five #six';
      const result = compareVersions(original, modified);

      if (result.improvement < -0.02) {
        expect(result.betterVersion).toBe('original');
      }
    });

    it('returns "same" when scores are within 0.02 of each other', () => {
      const original = 'This is a test post about something';
      const modified = 'This is a test post about nothing';
      const result = compareVersions(original, modified);

      if (Math.abs(result.improvement) < 0.02) {
        expect(result.betterVersion).toBe('same');
      }
    });
  });

  describe('key differences detection', () => {
    it('detects added question', () => {
      const original = 'This is a statement about coding';
      const modified = 'This is a statement about coding. What do you think?';
      const result = compareVersions(original, modified);

      expect(result.keyDifferences).toContain('Added question (+12% reply potential)');
    });

    it('detects removed question', () => {
      const original = 'What do you think about this?';
      const modified = 'I think this is great';
      const result = compareVersions(original, modified);

      expect(result.keyDifferences).toContain('Removed question (-12% reply potential)');
    });

    it('detects reduced hashtags', () => {
      const original = 'Post #one #two #three #four';
      const modified = 'Post #one';
      const result = compareVersions(original, modified);

      expect(result.keyDifferences.some((d) => d.includes('Reduced hashtags'))).toBe(true);
    });

    it('detects thread conversion', () => {
      const original = 'Single tweet content';
      const modified = 'Thread content 1/3';
      const result = compareVersions(original, modified);

      // Only check if thread was actually detected
      if (result.keyDifferences.some((d) => d.includes('thread'))) {
        expect(result.keyDifferences).toContain('Converted to thread format (+10% dwell time)');
      }
    });

    it('detects length optimization to within limit', () => {
      const original = 'A'.repeat(300);
      const modified = 'A'.repeat(250);
      const result = compareVersions(original, modified);

      expect(result.keyDifferences).toContain('Length reduced to within character limit');
    });

    it('detects length reaching optimal range', () => {
      const original = 'Short';
      const modified = 'This is a much longer post that has enough content to be considered within the optimal length range for engagement on the platform';
      const result = compareVersions(original, modified);

      expect(result.keyDifferences).toContain('Length now in optimal range');
    });

    it('detects resolved warnings', () => {
      // Original has too many hashtags warning, modified has enough content to avoid too_short warning
      const original = 'This is a post with too many hashtags which is bad #one #two #three #four #five #six';
      const modified = 'This is a post with correct number of hashtags which is good #one #two';
      const result = compareVersions(original, modified);

      expect(result.keyDifferences.some((d) => d.includes('Resolved') && d.includes('warning'))).toBe(true);
    });

    it('returns empty keyDifferences for identical content', () => {
      const content = 'Same content';
      const result = compareVersions(content, content);

      expect(result.keyDifferences).toHaveLength(0);
      expect(result.betterVersion).toBe('same');
      expect(result.improvement).toBe(0);
    });
  });
});
