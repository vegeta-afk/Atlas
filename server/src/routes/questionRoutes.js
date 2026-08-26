const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Apply protect to ALL routes
router.use(protect);

// Apply authorize to EACH route (clean and clear)
router.post('/', authorize('admin', 'faculty'), questionController.addQuestion);
router.get('/', authorize('admin', 'faculty'), questionController.getQuestions);

// Bulk operations
router.post('/bulk', authorize('admin', 'faculty'), questionController.bulkAddQuestions);

// Course topics
router.get('/courses/:courseId/topics', authorize('admin', 'faculty'), questionController.getCourseTopics);

// Cross-course topic reuse — must stay ABOVE the /:id routes below,
// or GET /similar-topics gets swallowed by GET /:id (treated as an id, causes a 500)
router.get('/similar-topics', authorize('admin', 'faculty'), questionController.checkSimilarTopics);
router.post('/import', authorize('admin', 'faculty'), questionController.importQuestions);

// Dynamic /:id routes LAST
router.get('/:id', authorize('admin', 'faculty'), questionController.getQuestion);
router.put('/:id', authorize('admin', 'faculty'), questionController.updateQuestion);
router.delete('/:id', authorize('admin', 'faculty'), questionController.deleteQuestion);

module.exports = router;