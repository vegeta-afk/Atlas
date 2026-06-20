const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const { protect } = require("../middlewares/authMiddleware"); // add if your other routes use this

router.get("/", materialController.getMaterials);
router.post("/", materialController.createMaterial);
router.delete("/:id", materialController.deleteMaterial);
router.get("/issues", materialController.getIssues);
router.put("/issues/toggle", materialController.toggleIssue);

module.exports = router;