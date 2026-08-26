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
router.get('/regular/courses', authorize('admin', 'faculty', 'instructor'), testController.getRegularExamCourses);
router.get('/regular/topics', authorize('admin', 'faculty', 'instructor'), testController.getRegularExamTopics);
router.get('/regular/students', authorize('admin', 'faculty', 'instructor'), testController.getRegularExamStudents);

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
router.get('/:id/submissions', authorize('admin', 'instructor'), testController.getTestSubmissions);
router.get('/:id/eligibility-report', authorize('admin', 'faculty', 'instructor'), testController.getTestEligibilityReport); // ✅ moved here
router.post('/:id/generate-pool', authorize('admin', 'faculty', 'instructor'), testController.generateQuestionPool);
router.post('/:id/start', authorize('student'), testController.startTest);
router.post('/:id/submit', authorize('student'), testController.submitTest);

router.get('/:id', authorize('admin', 'faculty', 'instructor'), testController.getTest);
router.put('/:id/activate-student/:studentId', authorize('admin', 'faculty', 'instructor'), testController.toggleStudentActivation);
router.put('/:id', authorize('admin', 'faculty', 'instructor'), testController.updateTest);
router.put('/:id/mark-due/:studentId', authorize('admin', 'faculty', 'instructor'), testController.toggleStudentDueStatus);
router.delete('/:id', authorize('admin'), testController.deleteTest);

module.exports = router;