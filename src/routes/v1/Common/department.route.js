const express = require("express");
const router = express.Router();

const { departmentController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Was completely unauthenticated on every route. Departments are purely
// internal admin org-structure data — there's no legitimate reason for
// any of this to be publicly readable or writable, so every route here
// is gated (unlike faq/contactUs, which have a genuine public GET/POST
// use case). Adjust the role tier (currently isAdmin) if needed.
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
