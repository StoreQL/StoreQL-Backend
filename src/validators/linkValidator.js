const { z } = require('zod');

const SOURCES = [
  'instagram',
  'chrome',
  'safari',
  'whatsapp',
  'telegram',
  'youtube',
  'tiktok',
  'reddit',
  'manual',
  'share_sheet',
  'other',
];

const createLinkSchema = z.object({
  url: z.string().trim().url('Must be a valid URL'),
  spaceId: z.string().trim().optional(),
  title: z.string().trim().max(300).optional(),
  description: z.string().trim().max(1000).optional(),
  faviconUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  source: z.enum(SOURCES).optional(),
  tags: z.array(z.string().trim().min(1)).max(10).optional(),
  matter: z.string().trim().max(2000).optional(),
  matterType: z.enum(['note', 'idea', 'reference', 'reminder', 'question', 'todo']).optional(),
});

const updateLinkSchema = z.object({
  url: z.string().trim().url('Must be a valid URL').optional(),
  title: z.string().trim().max(300).optional(),
  description: z.string().trim().max(1000).optional(),
  faviconUrl: z.string().url().optional(),
  spaceId: z.string().trim().nullable().optional(),
  thumbnailUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1)).max(10).optional(),
});

const previewSchema = z.object({
  url: z.string().trim().url('Must be a valid URL'),
});

module.exports = { createLinkSchema, updateLinkSchema, previewSchema, SOURCES };
