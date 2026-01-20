import { describe, it, expect } from 'vitest';
import { analyzePost } from './index.js';
import { OPTIMAL_LENGTH, LIMITS } from '@postmaker/shared';

describe('analyzePost', () => {
  describe('return structure', () => {
    it('returns a valid PostAnalysis object with all required fields', () => {
      const result = analyzePost('Hello world, this is a test post.');

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('engagementScores');
      expect(result).toHaveProperty('contentMetrics');
      expect(result).toHaveProperty('algorithmSignals');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('warnings');
    });

    it('returns overallScore between 0 and 1', () => {
      const shortResult = analyzePost('Hi');
      const normalResult = analyzePost('This is a normal post about technology and innovation.');
      const problematicResult = analyzePost('FOLLOW FOR FOLLOW #a #b #c #d #e');

      expect(shortResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(shortResult.overallScore).toBeLessThanOrEqual(1);
      expect(normalResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(normalResult.overallScore).toBeLessThanOrEqual(1);
      expect(problematicResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(problematicResult.overallScore).toBeLessThanOrEqual(1);
    });

    it('returns engagementScores with all required fields between 0 and 1', () => {
      const result = analyzePost('A test post for checking engagement scores.');

      const requiredFields = [
        'likeability',
        'replyability',
        'retweetability',
        'quoteability',
        'shareability',
        'dwellPotential',
        'followPotential',
      ] as const;

      for (const field of requiredFields) {
        expect(result.engagementScores).toHaveProperty(field);
        expect(result.engagementScores[field]).toBeGreaterThanOrEqual(0);
        expect(result.engagementScores[field]).toBeLessThanOrEqual(1);
      }
    });

    it('returns contentMetrics with all required fields', () => {
      const result = analyzePost('Test post #test @user https://example.com');

      expect(result.contentMetrics).toHaveProperty('characterCount');
      expect(result.contentMetrics).toHaveProperty('wordCount');
      expect(result.contentMetrics).toHaveProperty('sentenceCount');
      expect(result.contentMetrics).toHaveProperty('readingTimeSeconds');
      expect(result.contentMetrics).toHaveProperty('hasMedia');
      expect(result.contentMetrics).toHaveProperty('mediaCount');
      expect(result.contentMetrics).toHaveProperty('hasQuestion');
      expect(result.contentMetrics).toHaveProperty('questionCount');
      expect(result.contentMetrics).toHaveProperty('hasHashtags');
      expect(result.contentMetrics).toHaveProperty('hashtagCount');
      expect(result.contentMetrics).toHaveProperty('hasMentions');
      expect(result.contentMetrics).toHaveProperty('mentionCount');
      expect(result.contentMetrics).toHaveProperty('hasLinks');
      expect(result.contentMetrics).toHaveProperty('linkCount');
      expect(result.contentMetrics).toHaveProperty('hasEmojis');
      expect(result.contentMetrics).toHaveProperty('emojiCount');
      expect(result.contentMetrics).toHaveProperty('hasCTA');
      expect(result.contentMetrics).toHaveProperty('isThread');
      expect(result.contentMetrics).toHaveProperty('threadLength');
    });

    it('returns algorithmSignals with positive, negative, and neutral arrays', () => {
      const result = analyzePost('A test post.');

      expect(result.algorithmSignals).toHaveProperty('positiveSignals');
      expect(result.algorithmSignals).toHaveProperty('negativeSignals');
      expect(result.algorithmSignals).toHaveProperty('neutralSignals');
      expect(Array.isArray(result.algorithmSignals.positiveSignals)).toBe(true);
      expect(Array.isArray(result.algorithmSignals.negativeSignals)).toBe(true);
      expect(Array.isArray(result.algorithmSignals.neutralSignals)).toBe(true);
    });

    it('returns suggestions as an array sorted by priority', () => {
      const result = analyzePost('Short');

      expect(Array.isArray(result.suggestions)).toBe(true);

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < result.suggestions.length; i++) {
        const prevPriority = priorityOrder[result.suggestions[i - 1].priority];
        const currPriority = priorityOrder[result.suggestions[i].priority];
        expect(prevPriority).toBeLessThanOrEqual(currPriority);
      }
    });

    it('returns warnings as an array sorted by severity', () => {
      // Content that triggers multiple warnings
      const result = analyzePost('FOLLOW FOR FOLLOW #a #b #c #d');

      expect(Array.isArray(result.warnings)).toBe(true);

      const severityOrder = { critical: 0, warning: 1, info: 2 };
      for (let i = 1; i < result.warnings.length; i++) {
        const prevSeverity = severityOrder[result.warnings[i - 1].severity];
        const currSeverity = severityOrder[result.warnings[i].severity];
        expect(prevSeverity).toBeLessThanOrEqual(currSeverity);
      }
    });
  });

  describe('content metrics', () => {
    it('calculates character and word counts correctly', () => {
      const content = 'Hello world, this is a test.';
      const result = analyzePost(content);

      expect(result.contentMetrics.characterCount).toBe(content.length);
      expect(result.contentMetrics.wordCount).toBe(6);
    });

    it('calculates sentence count correctly', () => {
      const content = 'First sentence. Second sentence! Third sentence?';
      const result = analyzePost(content);

      expect(result.contentMetrics.sentenceCount).toBe(3);
    });

    it('handles empty-ish content gracefully', () => {
      const result = analyzePost('   ');

      expect(result.contentMetrics.characterCount).toBe(3);
      expect(result.contentMetrics.wordCount).toBe(0);
      expect(result.contentMetrics.sentenceCount).toBe(1);
    });

    it('calculates reading time based on word count', () => {
      // 200 words = 60 seconds
      const words = Array(100).fill('word').join(' ');
      const result = analyzePost(words);

      // 100 words / 200 wpm = 0.5 min = 30 seconds (ceiling)
      expect(result.contentMetrics.readingTimeSeconds).toBe(30);
    });
  });

  describe('content length variations', () => {
    it('identifies short content (under 80 chars) and adds negative signal', () => {
      const shortContent = 'This is too short.';
      expect(shortContent.length).toBeLessThan(OPTIMAL_LENGTH.min);

      const result = analyzePost(shortContent);

      expect(result.contentMetrics.characterCount).toBeLessThan(OPTIMAL_LENGTH.min);

      const hasSuboptimalLength = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'suboptimal_length'
      );
      expect(hasSuboptimalLength).toBe(true);

      const hasIncreaseLengthSuggestion = result.suggestions.some(
        (s) => s.type === 'increase_length'
      );
      expect(hasIncreaseLengthSuggestion).toBe(true);
    });

    it('identifies very short content (under 30 chars) and adds warning', () => {
      const veryShortContent = 'Hi there!';
      expect(veryShortContent.length).toBeLessThan(30);

      const result = analyzePost(veryShortContent);

      const hasTooShortWarning = result.warnings.some((w) => w.type === 'too_short');
      expect(hasTooShortWarning).toBe(true);
    });

    it('identifies optimal length content (80-280 chars) and adds positive signal', () => {
      const optimalContent =
        'This is a well-crafted post that falls within the optimal character range. ' +
        'It provides enough context and value to engage readers while remaining concise and digestible.';
      expect(optimalContent.length).toBeGreaterThanOrEqual(OPTIMAL_LENGTH.min);
      expect(optimalContent.length).toBeLessThanOrEqual(OPTIMAL_LENGTH.max);

      const result = analyzePost(optimalContent);

      const hasOptimalLength = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'optimal_length'
      );
      expect(hasOptimalLength).toBe(true);
    });

    it('identifies long content (over 280 chars) and adds warning and suggestion', () => {
      const longContent =
        'This is an extremely long post that exceeds the X character limit. ' +
        'It goes on and on with unnecessary detail that could be better expressed in a thread format. ' +
        'Users scrolling through their feed may not engage with such lengthy content as effectively. ' +
        'Breaking this into multiple tweets would improve engagement significantly.';
      expect(longContent.length).toBeGreaterThan(280);

      const result = analyzePost(longContent);

      const hasTooLongWarning = result.warnings.some((w) => w.type === 'too_long');
      expect(hasTooLongWarning).toBe(true);

      const hasReduceLengthSuggestion = result.suggestions.some(
        (s) => s.type === 'reduce_length'
      );
      expect(hasReduceLengthSuggestion).toBe(true);
    });

    it('suggests thread format for content over 500 chars without thread indicator', () => {
      const veryLongContent =
        'This is an extremely long post that goes well beyond any reasonable length. '.repeat(10);
      expect(veryLongContent.length).toBeGreaterThan(500);

      const result = analyzePost(veryLongContent);

      const hasThreadSuggestion = result.suggestions.some((s) => s.type === 'add_thread');
      expect(hasThreadSuggestion).toBe(true);
    });
  });

  describe('content with questions', () => {
    it('detects questions and adds positive signal', () => {
      const questionContent = 'What do you think about this new feature?';

      const result = analyzePost(questionContent);

      expect(result.contentMetrics.hasQuestion).toBe(true);
      expect(result.contentMetrics.questionCount).toBeGreaterThan(0);

      const hasQuestionSignal = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'has_question'
      );
      expect(hasQuestionSignal).toBe(true);
    });

    it('increases replyability score for questions', () => {
      const noQuestion = 'This is a statement about technology.';
      const withQuestion = 'This is a statement about technology. What do you think?';

      const resultNoQuestion = analyzePost(noQuestion);
      const resultWithQuestion = analyzePost(withQuestion);

      expect(resultWithQuestion.engagementScores.replyability).toBeGreaterThan(
        resultNoQuestion.engagementScores.replyability
      );
    });

    it('suggests adding a question when none exists and replyability is low', () => {
      const noQuestion = 'Here is my statement.';

      const result = analyzePost(noQuestion);

      expect(result.contentMetrics.hasQuestion).toBe(false);

      const hasAddQuestionSuggestion = result.suggestions.some(
        (s) => s.type === 'add_question'
      );
      expect(hasAddQuestionSuggestion).toBe(true);
    });

    it('detects question pattern ending with ? followed by space or end', () => {
      const questionAtEnd = 'Thoughts?';
      const questionInMiddle = 'What do you think? Let me know!';

      const resultEnd = analyzePost(questionAtEnd);
      const resultMiddle = analyzePost(questionInMiddle);

      expect(resultEnd.contentMetrics.hasQuestion).toBe(true);
      expect(resultMiddle.contentMetrics.hasQuestion).toBe(true);
    });
  });

  describe('content with hashtags', () => {
    it('detects normal hashtag usage (1-2 hashtags)', () => {
      const content = 'Check out this cool tech #coding #javascript';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasHashtags).toBe(true);
      expect(result.contentMetrics.hashtagCount).toBe(2);

      const hasTooManyHashtags = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'too_many_hashtags'
      );
      expect(hasTooManyHashtags).toBe(false);
    });

    it('detects excessive hashtags (over 2) and adds negative signal', () => {
      const content = 'Check this out #tech #coding #javascript #react #node';

      const result = analyzePost(content);

      expect(result.contentMetrics.hashtagCount).toBe(5);
      expect(result.contentMetrics.hashtagCount).toBeGreaterThan(LIMITS.maxHashtags);

      const hasTooManyHashtags = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'too_many_hashtags'
      );
      expect(hasTooManyHashtags).toBe(true);
    });

    it('adds warning for excessive hashtags', () => {
      const content = 'Spam post #a #b #c #d #e';

      const result = analyzePost(content);

      const hasWarning = result.warnings.some((w) => w.type === 'too_many_hashtags');
      expect(hasWarning).toBe(true);
    });

    it('suggests removing hashtags when excessive', () => {
      const content = 'Post #one #two #three #four';

      const result = analyzePost(content);

      const hasSuggestion = result.suggestions.some((s) => s.type === 'remove_hashtags');
      expect(hasSuggestion).toBe(true);
    });
  });

  describe('content with media', () => {
    it('detects media when mediaUrls are provided', () => {
      const content = 'Check out this photo!';
      const mediaUrls = ['https://example.com/image.jpg'];

      const result = analyzePost(content, mediaUrls);

      expect(result.contentMetrics.hasMedia).toBe(true);
      expect(result.contentMetrics.mediaCount).toBe(1);

      const hasMediaSignal = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'has_media'
      );
      expect(hasMediaSignal).toBe(true);
    });

    it('handles multiple media items', () => {
      const content = 'Here are some photos from my trip!';
      const mediaUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ];

      const result = analyzePost(content, mediaUrls);

      expect(result.contentMetrics.hasMedia).toBe(true);
      expect(result.contentMetrics.mediaCount).toBe(3);
    });

    it('handles empty media array as no media', () => {
      const content = 'No media here';
      const mediaUrls: string[] = [];

      const result = analyzePost(content, mediaUrls);

      expect(result.contentMetrics.hasMedia).toBe(false);
      expect(result.contentMetrics.mediaCount).toBe(0);
    });

    it('handles undefined media as no media', () => {
      const content = 'No media here';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasMedia).toBe(false);
      expect(result.contentMetrics.mediaCount).toBe(0);
    });

    it('suggests adding media when none exists', () => {
      const content = 'This post has no media attached to it at all.';

      const result = analyzePost(content);

      const hasSuggestion = result.suggestions.some((s) => s.type === 'add_media');
      expect(hasSuggestion).toBe(true);
    });

    it('increases engagement scores when media is present', () => {
      const content = 'Same content for comparison purposes.';

      const withoutMedia = analyzePost(content);
      const withMedia = analyzePost(content, ['https://example.com/image.jpg']);

      expect(withMedia.engagementScores.likeability).toBeGreaterThan(
        withoutMedia.engagementScores.likeability
      );
      expect(withMedia.engagementScores.dwellPotential).toBeGreaterThan(
        withoutMedia.engagementScores.dwellPotential
      );
    });
  });

  describe('content with CTAs (calls to action)', () => {
    it('detects CTA patterns', () => {
      const ctaPatterns = [
        'Follow me for more content!',
        'Like this if you agree',
        'Retweet to spread the word',
        'Share this with your friends',
        'Comment your thoughts below',
        'Subscribe for updates',
        'Check out the link below',
        'Tap to learn more',
        'Click here for details',
      ];

      for (const content of ctaPatterns) {
        const result = analyzePost(content);
        expect(result.contentMetrics.hasCTA).toBe(true);
      }
    });

    it('adds positive signal for CTA', () => {
      const content = 'Great tips here! Follow for more content like this.';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasCTA).toBe(true);

      const hasCtaSignal = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'has_cta'
      );
      expect(hasCtaSignal).toBe(true);
    });

    it('suggests adding CTA when none exists', () => {
      const content = 'Just sharing my thoughts on this topic.';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasCTA).toBe(false);

      const hasSuggestion = result.suggestions.some((s) => s.type === 'add_cta');
      expect(hasSuggestion).toBe(true);
    });
  });

  describe('content with thread indicators', () => {
    it('detects "thread" keyword', () => {
      const content = 'Thread: Here is what I learned about productivity...';

      const result = analyzePost(content);

      expect(result.contentMetrics.isThread).toBe(true);
    });

    it('detects thread emoji', () => {
      const content = '🧵 A thread about machine learning basics...';

      const result = analyzePost(content);

      expect(result.contentMetrics.isThread).toBe(true);
    });

    it('detects numbered thread format (1/n)', () => {
      const content = 'Why TypeScript is great 1/5';

      const result = analyzePost(content);

      expect(result.contentMetrics.isThread).toBe(true);
    });

    it('estimates thread length from numbered format', () => {
      const content = 'Starting a thread about React 1/7';

      const result = analyzePost(content);

      expect(result.contentMetrics.threadLength).toBe(7);
    });

    it('estimates thread length as 3 for general thread indicator', () => {
      // Use lowercase 'thread' since includes() is case-sensitive
      const content = 'thread: Something interesting...';

      const result = analyzePost(content);

      expect(result.contentMetrics.threadLength).toBe(3);
    });

    it('adds positive signal for thread content', () => {
      const content = '🧵 A deep dive into web performance optimization...';

      const result = analyzePost(content);

      const hasThreadSignal = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'is_thread'
      );
      expect(hasThreadSignal).toBe(true);
    });

    it('increases dwell potential for thread content', () => {
      const baseContent = 'Some content about web development.';
      const threadContent = '🧵 Thread: Some content about web development.';

      const baseResult = analyzePost(baseContent);
      const threadResult = analyzePost(threadContent);

      expect(threadResult.engagementScores.dwellPotential).toBeGreaterThan(
        baseResult.engagementScores.dwellPotential
      );
    });
  });

  describe('content with hooks', () => {
    it('detects hook patterns at the start of content', () => {
      const hookPatterns = [
        "Here's what nobody tells you about startups...",
        'This is the best advice I ever received.',
        'I just discovered something amazing.',
        'Breaking: Major tech news today.',
        'Unpopular opinion: Tabs are better than spaces.',
        'Hot take: JavaScript is underrated.',
        'Thread: The complete guide to APIs.',
        "Stop doing this if you're a developer.",
        'Wait until you see this hack.',
      ];

      for (const content of hookPatterns) {
        const result = analyzePost(content);
        const hasHookSignal = result.algorithmSignals.positiveSignals.some(
          (s) => s.name === 'has_hook'
        );
        expect(hasHookSignal).toBe(true);
      }
    });

    it('suggests adding a hook when none exists', () => {
      const content = 'Some normal content without a hook.';

      const result = analyzePost(content);

      const hasHookSignal = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'has_hook'
      );
      expect(hasHookSignal).toBe(false);

      const hasSuggestion = result.suggestions.some((s) => s.type === 'add_hook');
      expect(hasSuggestion).toBe(true);
    });
  });

  describe('content with mentions', () => {
    it('detects mentions correctly', () => {
      const content = 'Great post by @elonmusk and @naval about startups.';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasMentions).toBe(true);
      expect(result.contentMetrics.mentionCount).toBe(2);
    });

    it('handles no mentions', () => {
      const content = 'A post without any mentions.';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasMentions).toBe(false);
      expect(result.contentMetrics.mentionCount).toBe(0);
    });
  });

  describe('content with links', () => {
    it('detects http links', () => {
      const content = 'Check out this article: http://example.com/article';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasLinks).toBe(true);
      expect(result.contentMetrics.linkCount).toBe(1);
    });

    it('detects https links', () => {
      const content = 'Read more here: https://example.com/post';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasLinks).toBe(true);
      expect(result.contentMetrics.linkCount).toBe(1);
    });

    it('detects multiple links', () => {
      const content =
        'Resources: https://example1.com and https://example2.com and https://example3.com';

      const result = analyzePost(content);

      expect(result.contentMetrics.linkCount).toBe(3);
    });

    it('adds neutral signal for multiple links', () => {
      const content =
        'Check these: https://example1.com and https://example2.com';

      const result = analyzePost(content);

      expect(result.contentMetrics.linkCount).toBeGreaterThan(LIMITS.maxLinks);

      const hasMultipleLinksSignal = result.algorithmSignals.neutralSignals.some(
        (s) => s.name === 'multiple_links'
      );
      expect(hasMultipleLinksSignal).toBe(true);
    });

    it('suggests removing links when too many', () => {
      const content = 'Too many links: https://a.com https://b.com';

      const result = analyzePost(content);

      const hasSuggestion = result.suggestions.some((s) => s.type === 'remove_links');
      expect(hasSuggestion).toBe(true);
    });
  });

  describe('content with emojis', () => {
    it('detects emojis correctly', () => {
      const content = 'Great day! 🎉🚀💡';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasEmojis).toBe(true);
      expect(result.contentMetrics.emojiCount).toBe(3);
    });

    it('handles no emojis', () => {
      const content = 'A plain text post without emojis.';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasEmojis).toBe(false);
      expect(result.contentMetrics.emojiCount).toBe(0);
    });

    it('detects various emoji types', () => {
      const content = 'Weather: ☀️ Mood: 😊 Tech: 💻';

      const result = analyzePost(content);

      expect(result.contentMetrics.hasEmojis).toBe(true);
      expect(result.contentMetrics.emojiCount).toBeGreaterThan(0);
    });
  });

  describe('negative signals - all caps content', () => {
    it('detects all caps content and adds negative signal', () => {
      const content = 'THIS IS ALL CAPS SHOUTING!';

      const result = analyzePost(content);

      const hasAllCapsSignal = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'all_caps'
      );
      expect(hasAllCapsSignal).toBe(true);
    });

    it('adds warning for all caps content', () => {
      const content = 'STOP WHAT YOU ARE DOING!';

      const result = analyzePost(content);

      const hasWarning = result.warnings.some((w) => w.type === 'all_caps');
      expect(hasWarning).toBe(true);
    });

    it('does not flag mixed case as all caps', () => {
      const content = 'This is Normal Text with SOME emphasis.';

      const result = analyzePost(content);

      const hasAllCapsSignal = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'all_caps'
      );
      expect(hasAllCapsSignal).toBe(false);
    });
  });

  describe('negative signals - link only content', () => {
    it('detects link-only content and adds negative signal', () => {
      const content = 'https://example.com/some/article';

      const result = analyzePost(content);

      const hasLinkOnlySignal = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'link_only'
      );
      expect(hasLinkOnlySignal).toBe(true);
    });

    it('adds critical warning for link-only content', () => {
      const content = 'https://example.com';

      const result = analyzePost(content);

      const hasWarning = result.warnings.some((w) => w.type === 'link_only');
      expect(hasWarning).toBe(true);
      expect(result.warnings.find((w) => w.type === 'link_only')?.severity).toBe('critical');
    });

    it('does not flag content with link and text', () => {
      const content = 'Check out this great article: https://example.com';

      const result = analyzePost(content);

      const hasLinkOnlySignal = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'link_only'
      );
      expect(hasLinkOnlySignal).toBe(false);
    });
  });

  describe('negative signals - spam patterns', () => {
    it('detects "follow for follow" spam pattern', () => {
      const content = 'Follow for follow! I follow back everyone.';

      const result = analyzePost(content);

      const hasSpamSignal = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'spam'
      );
      expect(hasSpamSignal).toBe(true);
    });

    it('detects "f4f" spam pattern', () => {
      const content = 'F4F everyone! Just started my account.';

      const result = analyzePost(content);

      const hasSpamSignal = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'spam'
      );
      expect(hasSpamSignal).toBe(true);
    });

    it('detects "like4like" spam pattern', () => {
      const content = 'Like4like! Engage with me!';

      const result = analyzePost(content);

      const hasSpamSignal = result.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'spam'
      );
      expect(hasSpamSignal).toBe(true);
    });

    it('adds critical warning for spam patterns', () => {
      const content = 'Follow for follow everyone!';

      const result = analyzePost(content);

      const hasWarning = result.warnings.some((w) => w.type === 'spam_pattern');
      expect(hasWarning).toBe(true);
      expect(result.warnings.find((w) => w.type === 'spam_pattern')?.severity).toBe('critical');
    });

    it('detects "dm me" / "link in bio" patterns', () => {
      const dmContent = 'DM me for more info!';
      const bioContent = 'Link in bio for the full guide.';

      const dmResult = analyzePost(dmContent);
      const bioResult = analyzePost(bioContent);

      const hasDmSignal = dmResult.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'cta_spam'
      );
      const hasBioSignal = bioResult.algorithmSignals.negativeSignals.some(
        (s) => s.name === 'cta_spam'
      );

      expect(hasDmSignal).toBe(true);
      expect(hasBioSignal).toBe(true);
    });
  });

  describe('positive patterns - value content', () => {
    it('detects value-signaling language', () => {
      const valuePatterns = [
        "Here's what I learned about marketing...",
        'This is how you become a better writer.',
        'Let me explain why this matters.',
      ];

      for (const content of valuePatterns) {
        const result = analyzePost(content);
        const hasValueSignal = result.algorithmSignals.positiveSignals.some(
          (s) => s.name === 'value'
        );
        expect(hasValueSignal).toBe(true);
      }
    });

    it('suggests adding value when not detected', () => {
      const content = 'Just posting some random thoughts.';

      const result = analyzePost(content);

      const hasValueSignal = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'value'
      );
      expect(hasValueSignal).toBe(false);

      const hasSuggestion = result.suggestions.some((s) => s.type === 'add_value');
      expect(hasSuggestion).toBe(true);
    });
  });

  describe('positive patterns - controversy', () => {
    it('detects controversial framing', () => {
      const controversialPatterns = [
        'Unpopular opinion: Remote work is overrated.',
        'Hot take: JavaScript is the best language.',
        'Controversial view: College is unnecessary.',
      ];

      for (const content of controversialPatterns) {
        const result = analyzePost(content);
        const hasControversySignal = result.algorithmSignals.positiveSignals.some(
          (s) => s.name === 'controversy'
        );
        expect(hasControversySignal).toBe(true);
      }
    });

    it('increases quoteability for controversial content', () => {
      const normalContent = 'I think remote work can be good.';
      const controversialContent = 'Unpopular opinion: Remote work is overrated.';

      const normalResult = analyzePost(normalContent);
      const controversialResult = analyzePost(controversialContent);

      expect(controversialResult.engagementScores.quoteability).toBeGreaterThan(
        normalResult.engagementScores.quoteability
      );
    });

    it('suggests adding controversy when quoteability is low', () => {
      const content = 'Here is my neutral statement about technology.';

      const result = analyzePost(content);

      const hasControversy = result.algorithmSignals.positiveSignals.some(
        (s) => s.name === 'controversy'
      );
      expect(hasControversy).toBe(false);

      const hasSuggestion = result.suggestions.some((s) => s.type === 'add_controversy');
      expect(hasSuggestion).toBe(true);
    });
  });

  describe('positive patterns - listicle', () => {
    it('detects listicle format', () => {
      const listiclePatterns = [
        '5 things I learned about programming',
        '10 ways to improve your productivity',
        '3 tips for better sleep',
        '7 lessons from building a startup',
      ];

      for (const content of listiclePatterns) {
        const result = analyzePost(content);
        const hasListicleSignal = result.algorithmSignals.positiveSignals.some(
          (s) => s.name === 'listicle'
        );
        expect(hasListicleSignal).toBe(true);
      }
    });
  });

  describe('overall score calculation', () => {
    it('reduces score based on warnings', () => {
      const goodContent = 'A well-crafted post about technology and innovation.';
      const badContent = 'FOLLOW FOR FOLLOW #a #b #c #d';

      const goodResult = analyzePost(goodContent);
      const badResult = analyzePost(badContent);

      expect(badResult.overallScore).toBeLessThan(goodResult.overallScore);
    });

    it('increases score with positive signals', () => {
      const basicContent = 'Just a post.';
      const optimizedContent =
        "Here's what I learned about productivity today. What strategies work for you? 🧵";

      const basicResult = analyzePost(basicContent);
      const optimizedResult = analyzePost(optimizedContent);

      expect(optimizedResult.overallScore).toBeGreaterThan(basicResult.overallScore);
    });

    it('balances multiple factors correctly', () => {
      // Content with both positive and negative signals
      const mixedContent =
        'Unpopular opinion: Follow for follow is bad. What do you think? #tech #productivity #coding #tips';

      const result = analyzePost(mixedContent);

      // Should have both positive (controversy, question) and negative (too many hashtags)
      expect(result.algorithmSignals.positiveSignals.length).toBeGreaterThan(0);
      expect(result.algorithmSignals.negativeSignals.length).toBeGreaterThan(0);

      // Score should be moderate, not extreme
      expect(result.overallScore).toBeGreaterThan(0.1);
      expect(result.overallScore).toBeLessThan(0.9);
    });
  });

  describe('suggestion generation', () => {
    it('generates appropriate suggestion types', () => {
      const shortContent = 'Hi';
      const result = analyzePost(shortContent);

      // Short content should get increase_length suggestion
      const hasIncreaseLengthSuggestion = result.suggestions.some(
        (s) => s.type === 'increase_length'
      );
      expect(hasIncreaseLengthSuggestion).toBe(true);

      // Check suggestion structure
      for (const suggestion of result.suggestions) {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('message');
        expect(suggestion).toHaveProperty('potentialScoreIncrease');
        expect(['high', 'medium', 'low']).toContain(suggestion.priority);
        expect(suggestion.potentialScoreIncrease).toBeGreaterThan(0);
      }
    });

    it('prioritizes high-impact suggestions first', () => {
      const content = 'Short';
      const result = analyzePost(content);

      if (result.suggestions.length > 1) {
        const highPrioritySuggestions = result.suggestions.filter(
          (s) => s.priority === 'high'
        );
        const firstHighIndex = result.suggestions.findIndex((s) => s.priority === 'high');
        const firstMediumIndex = result.suggestions.findIndex(
          (s) => s.priority === 'medium'
        );

        if (highPrioritySuggestions.length > 0 && firstMediumIndex !== -1) {
          expect(firstHighIndex).toBeLessThan(firstMediumIndex);
        }
      }
    });
  });

  describe('warning generation', () => {
    it('generates warnings with correct structure', () => {
      const problematicContent = 'FOLLOW FOR FOLLOW #a #b #c #d';
      const result = analyzePost(problematicContent);

      for (const warning of result.warnings) {
        expect(warning).toHaveProperty('type');
        expect(warning).toHaveProperty('severity');
        expect(warning).toHaveProperty('message');
        expect(warning).toHaveProperty('scoreImpact');
        expect(['critical', 'warning', 'info']).toContain(warning.severity);
        expect(warning.scoreImpact).toBeLessThanOrEqual(0);
      }
    });

    it('prioritizes critical warnings first', () => {
      // Content that triggers both critical and warning severity
      const content = 'https://example.com'; // link-only (critical) when short

      const result = analyzePost(content);

      if (result.warnings.length > 1) {
        const firstCriticalIndex = result.warnings.findIndex(
          (w) => w.severity === 'critical'
        );
        const firstWarningIndex = result.warnings.findIndex(
          (w) => w.severity === 'warning'
        );

        if (firstCriticalIndex !== -1 && firstWarningIndex !== -1) {
          expect(firstCriticalIndex).toBeLessThan(firstWarningIndex);
        }
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = analyzePost('');

      expect(result.contentMetrics.characterCount).toBe(0);
      expect(result.contentMetrics.wordCount).toBe(0);
      expect(typeof result.overallScore).toBe('number');
    });

    it('handles whitespace-only content', () => {
      const result = analyzePost('   \n\t  ');

      expect(result.contentMetrics.characterCount).toBe(7);
      expect(result.contentMetrics.wordCount).toBe(0);
    });

    it('handles special characters', () => {
      const content = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\~`';

      const result = analyzePost(content);

      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });

    it('handles unicode content', () => {
      const content = 'こんにちは世界 Hello 🌍 مرحبا 你好';

      const result = analyzePost(content);

      expect(result.contentMetrics.characterCount).toBeGreaterThan(0);
      expect(result.contentMetrics.hasEmojis).toBe(true);
    });

    it('handles very long content gracefully', () => {
      const content = 'word '.repeat(1000);

      const result = analyzePost(content);

      expect(typeof result.overallScore).toBe('number');
      expect(result.contentMetrics.wordCount).toBe(1000);
      expect(result.warnings.some((w) => w.type === 'too_long')).toBe(true);
    });

    it('handles content with newlines', () => {
      const content = 'Line 1\nLine 2\nLine 3';

      const result = analyzePost(content);

      expect(result.contentMetrics.characterCount).toBe(content.length);
      expect(result.contentMetrics.wordCount).toBe(6);
    });
  });

  describe('signal score structure', () => {
    it('returns signal scores with all required properties', () => {
      const content = "Here's a thread about productivity. What do you think? 🧵";
      const result = analyzePost(content);

      for (const signal of result.algorithmSignals.positiveSignals) {
        expect(signal).toHaveProperty('name');
        expect(signal).toHaveProperty('score');
        expect(signal).toHaveProperty('weight');
        expect(signal).toHaveProperty('description');
        expect(signal).toHaveProperty('impact');
        expect(['high', 'medium', 'low']).toContain(signal.impact);
        expect(typeof signal.score).toBe('number');
        expect(typeof signal.weight).toBe('number');
      }

      for (const signal of result.algorithmSignals.negativeSignals) {
        expect(signal).toHaveProperty('name');
        expect(signal).toHaveProperty('score');
        expect(signal).toHaveProperty('weight');
        expect(signal).toHaveProperty('description');
        expect(signal).toHaveProperty('impact');
        expect(['high', 'medium', 'low']).toContain(signal.impact);
      }
    });
  });
});
