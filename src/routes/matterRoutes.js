const express = require('express');
const { requireAuth } = require('../middleware/auth');
const validate = require('../validators/validate');
const { createMatterSchema, updateMatterSchema } = require('../validators/matterValidator');
const controller = require('../controllers/matterController');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.post('/', validate(createMatterSchema), controller.create);
router.get('/:id', controller.getOne);
router.patch('/:id', validate(updateMatterSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
