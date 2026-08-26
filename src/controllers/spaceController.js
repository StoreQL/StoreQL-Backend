const spaceService = require('../services/spaceService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const spaces = await spaceService.listSpaces(req.user.id);
  res.json({ spaces });
});

const getOne = asyncHandler(async (req, res) => {
  const space = await spaceService.getSpaceById(req.user.id, req.params.id);
  res.json({ space });
});

const create = asyncHandler(async (req, res) => {
  const space = await spaceService.createSpace(req.user.id, req.body);
  res.status(201).json({ space });
});

const update = asyncHandler(async (req, res) => {
  const space = await spaceService.updateSpace(req.user.id, req.params.id, req.body);
  res.json({ space });
});

const remove = asyncHandler(async (req, res) => {
  await spaceService.deleteSpace(req.user.id, req.params.id);
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
