// routes/batchTransferRoutes.js
const express = require('express');
const router = express.Router();
const {
  getTransfers,
  getTransferById,
  createTransfer,
  updateTransfer,
  approveTransfer,
  rejectTransfer,
  deleteTransfer,
  getStats,
} = require('../controllers/batchTransferController');
const { protect, authorize } = require('../middlewares/authMiddleware'); // Changed from '../middleware/auth' to './middleware/auth'

// Public test route (no auth required)
router.get('/test-public', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Batch transfer test route working!',
    timestamp: new Date().toISOString()
  });
});

// Apply authentication to all routes below
router.use(protect);

// Stats route
router.get('/stats', getStats);

// Main routes
router.route('/')
  .get(getTransfers)
  .post(createTransfer);

// Routes with ID parameter
router.route('/:id')
  .get(getTransferById)
  .put(updateTransfer)
  .delete(authorize('admin'), deleteTransfer);

// Approval/Rejection routes
router.put('/:id/approve', authorize('admin'), approveTransfer);
router.put('/:id/reject', authorize('admin'), rejectTransfer);

module.exports = router;