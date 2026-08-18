const express = require("express");
const router = express.Router();

const { roleController } = require("../../../controllers");
const { adminAuthMiddleware, roleMiddleware } = require("../../../middlewares");

// Was completely unauthenticated on every route — the most severe
// finding in this batch. Roles are the foundational primitive every
// authorization check in this app resolves against (role.middleware.js's
// isSuperAdmin/isAdmin/isEditor/etc. all query the roles table). With no
// auth here, anyone could create, rename, or delete roles with no login
// at all — which would undermine every other access control built on
// top of it. Gated to isSuperAdmin specifically, the most restrictive
// tier available, since this is the resource everything else depends on.
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
