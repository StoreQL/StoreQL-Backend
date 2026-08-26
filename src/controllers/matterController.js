const matterService = require('../services/matterService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { spaceId, linkId, cursor, limit } = req.query;
  const result = await matterService.listMatters(req.user.id, { spaceId, linkId, cursor, limit });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const matter = await matterService.getMatterById(req.user.id, req.params.id);
  res.json({ matter });
});

const create = asyncHandler(async (req, res) => {
  const matter = await matterService.createMatter(req.user.id, req.body);
  res.status(201).json({ matter });
});

const update = asyncHandler(async (req, res) => {
  const matter = await matterService.updateMatter(req.user.id, req.params.id, req.body);
  res.json({ matter });
});

const remove = asyncHandler(async (req, res) => {
  await matterService.deleteMatter(req.user.id, req.params.id);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
