const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { previewLimiter } = require('../middleware/rateLimiter');
const validate = require('../validators/validate');
const { createLinkSchema, updateLinkSchema, previewSchema } = require('../validators/linkValidator');
const controller = require('../controllers/linkController');

const router = express.Router();
router.use(requireAuth);

// IMPORTANT: /preview must be declared before /:id so it isn't
// swallowed by the dynamic param route.
router.post('/preview', previewLimiter, validate(previewSchema), controller.preview);

router.get('/', controller.list);
router.post('/', validate(createLinkSchema), controller.create);
router.get('/:id', controller.getOne);
router.post('/:id/refresh-meta', controller.refreshMeta);
router.patch('/:id', validate(updateLinkSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
