const express = require('express');

const authRoutes = require('./authRoutes');
const spaceRoutes = require('./spaceRoutes');
const linkRoutes = require('./linkRoutes');
const matterRoutes = require('./matterRoutes');
const tagRoutes = require('./tagRoutes');
const searchRoutes = require('./searchRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/spaces', spaceRoutes);
router.use('/links', linkRoutes);
router.use('/matters', matterRoutes);
router.use('/tags', tagRoutes);
router.use('/search', searchRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;
