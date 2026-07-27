const express = require('express');
const router = express.Router();
const controller = require('../controllers/facultyAttendance.controller');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/qr/generate', authorize('admin'), controller.generateFacultyQR);
router.post('/qr/scan', authorize('instructor'), controller.scanFacultyQR);
router.get('/today', authorize('admin'), controller.getTodayFacultyAttendance);
router.get('/vapid-public-key', authorize('admin'), controller.getVapidPublicKey);
router.post('/push-subscribe', authorize('admin'), controller.subscribePush);

module.exports = router;