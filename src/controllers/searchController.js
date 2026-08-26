const searchService = require('../services/searchService');
const asyncHandler = require('../utils/asyncHandler');

const search = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;
  const results = await searchService.search(req.user.id, q, { limit: Number(limit) || 10 });
  res.json(results);
});

module.exports = { search };
