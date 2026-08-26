const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/uploadController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

const router = express.Router();
router.use(requireAuth);

router.get('/signature', controller.getSignature);
router.post('/profile-image', upload.single('image'), controller.uploadProfileImage);

module.exports = router;
