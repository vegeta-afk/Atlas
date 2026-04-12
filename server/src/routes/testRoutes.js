const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

// ══════════════════════════════════════════════
// STEP 1: All STATIC/SPECIFIC paths first
// ══════════════════════════════════════════════

router.get('/student/available', authorize('student'), testController.getStudentTests);
router.get('/student/my-results', authorize('student'), testController.getMyResults);       // ✅ moved up
router.get('/student/marksheet', authorize('student'), testController.getMyMarksheet);      // ✅ moved up
router.get('/student/:studentId/results', authorize('admin', 'instructor'), testController.getStudentResults);
router.get('/questions/available', authorize('admin', 'faculty', 'instructor'), testController.getAvailableQuestions);

// Submissions publish (static path — must be before /:id)
router.put('/submissions/:submissionId/publish', authorize('admin'), testController.publishResult); // ✅ moved up

// ══════════════════════════════════════════════
// STEP 2: Root-level CRUD routes
// ══════════════════════════════════════════════

router.post('/', authorize('admin', 'faculty', 'instructor'), testController.createTest);
router.get('/', authorize('admin', 'faculty', 'instructor'), testController.getTests);

// ══════════════════════════════════════════════
// STEP 3: Dynamic /:id routes LAST
// ══════════════════════════════════════════════

router.get('/:id/results', authorize('admin', 'faculty', 'instructor'), testController.getTestResults);
router.get('/:id/submissions', authorize('admin', 'instructor'), testController.getTestSubmissions); // ✅ moved here
router.post('/:id/generate-pool', authorize('admin', 'faculty', 'instructor'), testController.generateQuestionPool);
router.post('/:id/start', authorize('student'), testController.startTest);
router.post('/:id/submit', authorize('student'), testController.submitTest);

router.get('/:id', authorize('admin', 'faculty', 'instructor'), testController.getTest);
router.put('/:id', authorize('admin', 'faculty', 'instructor'), testController.updateTest);
router.delete('/:id', authorize('admin'), testController.deleteTest);

module.exports = router;