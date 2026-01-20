import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import templatesRouter from './templates.js';
import { errorHandler } from '../middleware/error.js';

// Mock the database module
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      templates: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
  schema: {
    templates: { id: 'id' },
  },
}));

// Import mocked db after vi.mock
import { db } from '../db/index.js';

// Create test app
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/templates', templatesRouter);
  app.use(errorHandler);
  return app;
}

describe('Templates Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  describe('GET /api/templates/defaults', () => {
    it('returns array of default templates', async () => {
      const res = await request(app).get('/api/templates/defaults');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('each template has required fields', async () => {
      const res = await request(app).get('/api/templates/defaults');

      expect(res.status).toBe(200);
      res.body.data.forEach((template: Record<string, unknown>) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('template');
        expect(template).toHaveProperty('placeholders');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.category).toBe('string');
        expect(typeof template.template).toBe('string');
        expect(Array.isArray(template.placeholders)).toBe(true);
      });
    });

    it('IDs are prefixed with "default-"', async () => {
      const res = await request(app).get('/api/templates/defaults');

      expect(res.status).toBe(200);
      res.body.data.forEach((template: Record<string, unknown>) => {
        expect(typeof template.id).toBe('string');
        expect((template.id as string).startsWith('default-')).toBe(true);
      });
    });

    it('templates have valid categories', async () => {
      const validCategories = [
        'question',
        'thread_starter',
        'hot_take',
        'story',
        'value_bomb',
        'cta',
        'engagement_hook',
        'controversy',
        'educational',
        'personal',
      ];

      const res = await request(app).get('/api/templates/defaults');

      expect(res.status).toBe(200);
      res.body.data.forEach((template: Record<string, unknown>) => {
        expect(validCategories).toContain(template.category);
      });
    });
  });

  describe('GET /api/templates/:id (default templates)', () => {
    it('returns default template when ID starts with "default-"', async () => {
      const res = await request(app).get('/api/templates/default-0');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', 'default-0');
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('description');
      expect(res.body.data).toHaveProperty('category');
      expect(res.body.data).toHaveProperty('template');
      expect(res.body.data).toHaveProperty('placeholders');
    });

    it('returns 404 for invalid default index', async () => {
      const res = await request(app).get('/api/templates/default-999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('returns 404 for non-numeric default index', async () => {
      const res = await request(app).get('/api/templates/default-abc');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/templates', () => {
    it('returns array of templates from database', async () => {
      const mockTemplates = [
        {
          id: 'uuid-1',
          name: 'Custom Template',
          description: 'A custom template',
          category: 'question',
          template: 'Hello {{name}}',
          placeholders: [{ key: 'name', label: 'Name', description: 'Your name', type: 'text' as const, required: true }],
          createdAt: new Date(),
        },
      ];

      vi.mocked(db.query.templates.findMany).mockResolvedValue(mockTemplates);

      const res = await request(app).get('/api/templates');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('uuid-1');
      expect(res.body.data[0].name).toBe('Custom Template');
    });

    it('returns empty array when no templates exist', async () => {
      vi.mocked(db.query.templates.findMany).mockResolvedValue([]);

      const res = await request(app).get('/api/templates');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/templates/:id (database templates)', () => {
    it('returns template from database by ID', async () => {
      const mockTemplate = {
        id: 'uuid-123',
        name: 'DB Template',
        description: 'From database',
        category: 'hot_take',
        template: 'Test {{var}}',
        placeholders: [],
        createdAt: new Date(),
      };

      vi.mocked(db.query.templates.findFirst).mockResolvedValue(mockTemplate);

      const res = await request(app).get('/api/templates/uuid-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('uuid-123');
      expect(res.body.data.name).toBe('DB Template');
    });

    it('returns 404 when template not found in database', async () => {
      vi.mocked(db.query.templates.findFirst).mockResolvedValue(undefined);

      const res = await request(app).get('/api/templates/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/templates', () => {
    const validTemplate = {
      name: 'New Template',
      description: 'A new template description',
      category: 'question',
      template: 'What do you think about {{topic}}?',
      placeholders: [
        { key: 'topic', label: 'Topic', description: 'The topic to discuss', type: 'text', required: true },
      ],
    };

    it('creates template with valid data', async () => {
      const res = await request(app).post('/api/templates').send(validTemplate);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe(validTemplate.name);
      expect(res.body.data.description).toBe(validTemplate.description);
      expect(res.body.data.category).toBe(validTemplate.category);
      expect(res.body.data.template).toBe(validTemplate.template);
      expect(res.body.data.placeholders).toEqual(validTemplate.placeholders);
    });

    it('returns 400 when name is missing', async () => {
      const { name: _, ...templateWithoutName } = validTemplate;

      const res = await request(app).post('/api/templates').send(templateWithoutName);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when description is missing', async () => {
      const { description: _, ...templateWithoutDesc } = validTemplate;

      const res = await request(app).post('/api/templates').send(templateWithoutDesc);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when category is missing', async () => {
      const { category: _, ...templateWithoutCategory } = validTemplate;

      const res = await request(app).post('/api/templates').send(templateWithoutCategory);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when template field is missing', async () => {
      const { template: _, ...templateWithoutTemplate } = validTemplate;

      const res = await request(app).post('/api/templates').send(templateWithoutTemplate);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when placeholders is missing', async () => {
      const { placeholders: _, ...templateWithoutPlaceholders } = validTemplate;

      const res = await request(app).post('/api/templates').send(templateWithoutPlaceholders);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 with invalid category', async () => {
      const invalidTemplate = {
        ...validTemplate,
        category: 'invalid_category',
      };

      const res = await request(app).post('/api/templates').send(invalidTemplate);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when name exceeds max length', async () => {
      const invalidTemplate = {
        ...validTemplate,
        name: 'a'.repeat(101),
      };

      const res = await request(app).post('/api/templates').send(invalidTemplate);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('returns 400 when description exceeds max length', async () => {
      const invalidTemplate = {
        ...validTemplate,
        description: 'a'.repeat(501),
      };

      const res = await request(app).post('/api/templates').send(invalidTemplate);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('returns 400 with empty name', async () => {
      const invalidTemplate = {
        ...validTemplate,
        name: '',
      };

      const res = await request(app).post('/api/templates').send(invalidTemplate);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('returns 400 with invalid placeholder type', async () => {
      const invalidTemplate = {
        ...validTemplate,
        placeholders: [
          { key: 'topic', label: 'Topic', description: 'Desc', type: 'invalid', required: true },
        ],
      };

      const res = await request(app).post('/api/templates').send(invalidTemplate);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');
    });

    it('accepts all valid category values', async () => {
      const validCategories = [
        'question',
        'thread_starter',
        'hot_take',
        'story',
        'value_bomb',
        'cta',
        'engagement_hook',
        'controversy',
        'educational',
        'personal',
      ];

      for (const category of validCategories) {
        vi.clearAllMocks();
        const templateWithCategory = { ...validTemplate, category };
        const res = await request(app).post('/api/templates').send(templateWithCategory);
        expect(res.status).toBe(201);
      }
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('returns 400 when trying to delete default template', async () => {
      const res = await request(app).delete('/api/templates/default-0');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot delete default templates');
      expect(res.body.code).toBe('INVALID_OPERATION');
    });

    it('returns 400 for any default template ID', async () => {
      const res = await request(app).delete('/api/templates/default-999');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot delete default templates');
      expect(res.body.code).toBe('INVALID_OPERATION');
    });

    it('deletes template from database', async () => {
      vi.mocked(db.query.templates.findFirst).mockResolvedValue({
        id: 'uuid-to-delete',
        name: 'Template',
        description: 'Desc',
        category: 'question',
        template: 'Test',
        placeholders: [],
        createdAt: new Date(),
      });

      const res = await request(app).delete('/api/templates/uuid-to-delete');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe('uuid-to-delete');
    });

    it('returns 404 when template not found in database', async () => {
      vi.mocked(db.query.templates.findFirst).mockResolvedValue(undefined);

      const res = await request(app).delete('/api/templates/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Template not found');
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
