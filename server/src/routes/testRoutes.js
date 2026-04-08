const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

// ══════════════════════════════════════════════
// STEP 1: All STATIC/SPECIFIC paths first
// ══════════════════════════════════════════════

router.get(
  '/student/available',
  authorize('student'),
  testController.getStudentTests
);

router.get(
  '/student/:studentId/results',
  authorize('admin', 'faculty'),
  testController.getStudentResults
);

router.get(
  '/questions/available',           // ❌ was after /:id before — unreachable
  authorize('admin', 'faculty', 'instructor'),
  testController.getAvailableQuestions
);

// ══════════════════════════════════════════════
// STEP 2: Root-level CRUD routes
// ══════════════════════════════════════════════

router.post(
  '/',
  authorize('admin', 'faculty', 'instructor'),
  testController.createTest
);

router.get(
  '/',
  authorize('admin', 'faculty', 'instructor'),
  testController.getTests
);

// ══════════════════════════════════════════════
// STEP 3: Dynamic /:id routes LAST
// ══════════════════════════════════════════════

router.get(
  '/:id/results',                   // ❌ was after /:id before — unreachable
  authorize('admin', 'faculty', 'instructor'),
  testController.getTestResults
);

router.post(
  '/:id/generate-pool',             // ❌ was after /:id before — unreachable
  authorize('admin', 'faculty', 'instructor'),
  testController.generateQuestionPool
);

router.post(
  '/:id/start',
  authorize('student'),
  testController.startTest
);

router.post(
  '/:id/submit',
  authorize('student'),
  testController.submitTest
);

router.get(
  '/:id',
  authorize('admin', 'faculty', 'instructor'),
  testController.getTest
);

router.put(
  '/:id',
  authorize('admin', 'faculty', 'instructor'),
  testController.updateTest
);

router.delete(
  '/:id',
  authorize('admin', 'faculty', 'instructor'),
  testController.deleteTest
);

module.exports = router;