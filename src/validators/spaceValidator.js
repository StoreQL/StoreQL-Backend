const { z } = require('zod');

const PRESET_CATEGORIES = [
  'General', 'Education', 'Business', 'Sports', 'Travel',
  'Lessons', 'Notes', 'Tools', 'Design', 'Entertainment',
];

const createSpaceSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(80),
  description: z.string().trim().max(300).optional(),
  icon: z.string().trim().max(50).optional(),
  coverImageUrl: z.string().url().optional(),
  color: z.string().trim().max(20).optional(),
  category: z.string().trim().max(40).optional(),
});

const updateSpaceSchema = createSpaceSchema.partial().extend({
  order: z.number().int().min(0).optional(),
});

module.exports = { createSpaceSchema, updateSpaceSchema, PRESET_CATEGORIES };
