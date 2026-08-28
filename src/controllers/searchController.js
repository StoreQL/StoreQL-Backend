const searchService = require('../services/searchService');
const asyncHandler = require('../utils/asyncHandler');

const search = asyncHandler(async (req, res) => {
  const { q, page, limit, sortBy, type, spaceId, tag, domain } = req.query;
  const sanitizedType =
    !type || type === 'undefined' || type === 'null' || type === 'all' || type === ''
      ? undefined
      : type;

  const results = await searchService.search(req.user.id, q, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    sortBy: sortBy || 'relevance',
    type: sanitizedType,
    spaceId: spaceId === 'undefined' || spaceId === 'null' || !spaceId ? undefined : spaceId,
    tag: tag === 'undefined' || tag === 'null' || !tag ? undefined : tag,
    domain: domain === 'undefined' || domain === 'null' || !domain ? undefined : domain,
  });
  res.json(results);
});

module.exports = { search };
