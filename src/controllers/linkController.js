const linkService = require('../services/linkService');
const { fetchMetadata, fetchAndAttachMetadata } = require('../services/metadataService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { spaceId, tag, source, cursor, limit } = req.query;
  const result = await linkService.listLinks(req.user.id, { spaceId, tag, source, cursor, limit });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const link = await linkService.getLinkById(req.user.id, req.params.id);
  res.json({ link });
});

const create = asyncHandler(async (req, res) => {
  const link = await linkService.createLink(req.user.id, req.body);
  res.status(201).json({ link });
});

const update = asyncHandler(async (req, res) => {
  const link = await linkService.updateLink(req.user.id, req.params.id, req.body);
  res.json({ link });
});

const remove = asyncHandler(async (req, res) => {
  await linkService.deleteLink(req.user.id, req.params.id);
  res.status(204).send();
});

// POST /api/links/preview — used by the Quick Save screen to show
// title/description/thumbnail BEFORE the user taps Save. Does not
// persist anything. Never blocks or fails the save flow — if this
// times out, the client just saves the bare URL instead.
const preview = asyncHandler(async (req, res) => {
  const meta = await fetchMetadata(req.body.url);
  res.json(meta);
});

// POST /api/links/:id/refresh-meta — re-fetches metadata for an existing link
const refreshMeta = asyncHandler(async (req, res) => {
  const link = await linkService.getLinkById(req.user.id, req.params.id);
  linkService.triggerMetadataRefresh(link.id, link.url);
  res.json({ ok: true, message: 'Metadata refresh triggered' });
});

module.exports = { list, getOne, create, update, remove, preview, refreshMeta };
