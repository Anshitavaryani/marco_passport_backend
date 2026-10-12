const express = require("express");
const router = express.Router();

const { departmentController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Internal org data: every route is admin-only.
const requireAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isAdmin,
];

router.post("/", requireAdmin, departmentController.createDepartment);
router.get("/", requireAdmin, departmentController.getAllDeparments);
router.get("/:id", requireAdmin, departmentController.findDepartmentById);
router.put("/:id", requireAdmin, departmentController.updateDepartment);
router.delete("/:id", requireAdmin, departmentController.deleteDepartment);

module.exports = router;
