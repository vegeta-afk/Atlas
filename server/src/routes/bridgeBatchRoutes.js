// routes/bridgeBatch.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const bridgeBatchController = require('../controllers/bridgeBatchController');

// Admin: create + manage bridge batches
router.post('/request', protect, bridgeBatchController.requestBridgeBatch);
router.get('/', protect, authorize('admin'), bridgeBatchController.getAllBridgeBatches);
router.get('/pending-topics', protect, bridgeBatchController.getPendingTopicsForStudent);
router.get('/student-batch-info', protect, bridgeBatchController.getStudentBatchInfo);
router.get('/:id/students', protect, bridgeBatchController.getBridgeBatchStudents);
router.get('/student/:studentId', protect, bridgeBatchController.getBridgeBatchesForStudent);
router.put('/:id/approve', protect, authorize('admin'), bridgeBatchController.approveBridgeBatch);
router.put('/:id/reject', protect, authorize('admin'), bridgeBatchController.rejectBridgeBatch);
router.put('/:id/merge', protect, authorize('admin'), bridgeBatchController.mergeBridgeBatch);
router.delete('/:id', protect, authorize('admin'), bridgeBatchController.deleteBridgeBatch);
router.put('/:id/revert-approval', protect, authorize('admin'), bridgeBatchController.revertApproval);
router.put('/:id/revert-merge', protect, authorize('admin'), bridgeBatchController.revertMerge);
router.get('/by-faculty', protect, authorize('admin'), bridgeBatchController.getBridgeBatchesForFacultyTab);
router.put('/:id/cancel', protect, authorize('admin'), bridgeBatchController.cancelBridgeBatch);

// Admin: notifications
router.get('/notifications/list', protect, authorize('admin'), bridgeBatchController.getNotifications);

// Temp faculty: session workflow
router.get('/my-bridge-batches', protect, bridgeBatchController.getMyBridgeBatches);
router.get('/:id', protect, bridgeBatchController.getBridgeBatchById);
router.post('/attendance/mark', protect, bridgeBatchController.markBridgeAttendance);
router.post('/topics/save', protect, bridgeBatchController.saveBridgeTopicCompletion);



module.exports = router;