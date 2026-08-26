const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/sync', requireAuth, authController.sync);

module.exports = router;
