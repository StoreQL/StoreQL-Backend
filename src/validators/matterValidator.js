const { z } = require('zod');

const MATTER_TYPES = ['note', 'idea', 'reference', 'reminder', 'question', 'todo'];

const createMatterSchema = z.object({
  linkId: z.string().trim().min(1, 'linkId is required'),
  spaceId: z.string().trim().optional(),
  content: z.string().trim().min(1, 'content is required').max(2000),
  type: z.enum(MATTER_TYPES).optional(),
});

const updateMatterSchema = z.object({
  content: z.string().trim().min(1).max(2000).optional(),
  type: z.enum(MATTER_TYPES).optional(),
  spaceId: z.string().trim().nullable().optional(),
});

module.exports = { createMatterSchema, updateMatterSchema, MATTER_TYPES };
