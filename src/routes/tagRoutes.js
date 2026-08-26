const express = require('express');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/tagController');

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.list);
router.post('/', controller.create);

module.exports = router;
