const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Apply protect to ALL routes
router.use(protect);

// Apply authorize to EACH route (clean and clear)
router.post('/', authorize('admin', 'faculty'), questionController.addQuestion);
router.get('/', authorize('admin', 'faculty'), questionController.getQuestions);
router.get('/:id', authorize('admin', 'faculty'), questionController.getQuestion);
router.put('/:id', authorize('admin', 'faculty'), questionController.updateQuestion);
router.delete('/:id', authorize('admin', 'faculty'), questionController.deleteQuestion);

// Bulk operations
router.post('/bulk', authorize('admin', 'faculty'), questionController.bulkAddQuestions);

// Course topics
router.get('/courses/:courseId/topics', authorize('admin', 'faculty'), questionController.getCourseTopics);

module.exports = router;