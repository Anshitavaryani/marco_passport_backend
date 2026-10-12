const express = require("express");
const router = express.Router();

const { roleController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Every authorization check depends on roles, so this is super-admin only.
const requireSuperAdmin = [
  adminAuthMiddleware.validateJWTtoken,
  roleMiddleware.isSuperAdmin,
];

router.post("/", requireSuperAdmin, roleController.createRole);
router.get("/:id", requireSuperAdmin, roleController.findRoleById);
router.get("/", requireSuperAdmin, roleController.getAllRoles);
router.put("/:id", requireSuperAdmin, roleController.updateRole);
router.delete("/:id", requireSuperAdmin, roleController.deleteRole);

module.exports = router;
