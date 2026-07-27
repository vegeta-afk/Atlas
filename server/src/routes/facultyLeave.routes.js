const express = require('express');
const router = express.Router();
const controller = require('../controllers/facultyLeave.controller');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', authorize('instructor'), controller.createLeaveRequest);
router.get('/me', authorize('instructor'), controller.getMyLeaves);
router.get('/', authorize('admin'), controller.getAllLeaves);
router.put('/:id/approve', authorize('admin'), controller.approveLeave);
router.put('/:id/reject', authorize('admin'), controller.rejectLeave);
router.put('/:id/end-now', authorize('admin'), controller.endLeaveNow);
router.put('/:id/extend', authorize('admin'), controller.extendLeave);

module.exports = router;