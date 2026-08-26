const express = require('express');
const { requireAuth } = require('../middleware/auth');
const validate = require('../validators/validate');
const { createSpaceSchema, updateSpaceSchema } = require('../validators/spaceValidator');
const controller = require('../controllers/spaceController');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.post('/', validate(createSpaceSchema), controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', validate(updateSpaceSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
