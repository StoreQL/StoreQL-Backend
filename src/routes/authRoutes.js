const express = require('express');
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/sync', requireAuth, authController.sync);
router.patch('/profile', requireAuth, authController.updateProfile);
router.delete('/account', requireAuth, authController.deleteAccount);

module.exports = router;

