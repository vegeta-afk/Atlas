const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// Teacher-specific routes - Now allows both 'instructor' and 'teacher' roles
router.get('/teacher/batches', authorize('teacher', 'admin', 'instructor'), attendanceController.getTeacherBatches);
router.get('/teacher/batches/:batchId/students', authorize('teacher', 'admin', 'instructor'), attendanceController.getTeacherBatchStudents);
router.post('/teacher/mark', authorize('teacher', 'admin', 'instructor'), attendanceController.markTeacherAttendance);
router.get('/teacher/today-summary', authorize('teacher', 'admin', 'instructor'), attendanceController.getTeacherTodaySummary);
router.get('/teacher/monthly-report/:month/:year', authorize('teacher', 'admin', 'instructor'), attendanceController.getTeacherMonthlyReport);

// Student attendance route
router.get('/student/:studentId', authorize('teacher', 'admin', 'student', 'instructor'), attendanceController.getStudentAttendance);

router.post('/qr/generate', authorize('teacher', 'admin', 'instructor'), attendanceController.generateQR);
router.post('/qr/scan', authorize('student'), attendanceController.scanQR);

module.exports = router;