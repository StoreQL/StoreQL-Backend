const tagService = require('../services/tagService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const list = asyncHandler(async (req, res) => {
  const tags = await tagService.listTags(req.user.id);
  res.json({ tags });
});

const create = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('name is required');
  const [tag] = await tagService.findOrCreateMany(req.user.id, [name]);
  res.status(201).json({ tag });
});

module.exports = { list, create };
