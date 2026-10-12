const fs = require("fs");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");

// Served back out by app.js at /images.
const IMAGES_DIR = path.resolve(__dirname, "../../public/uploads/images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = ["jpeg", "jpg", "png", "gif", "webp"];

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

const getOriginalExtension = (file) =>
  path.extname(file.originalname).toLowerCase().substring(1);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    // Falls back to the original (already allow-listed) extension for
    // clients that send application/octet-stream.
    const ext = MIME_TO_EXT[file.mimetype] || getOriginalExtension(file);
    // Random suffix so several files in one request never collide.
    const uniqueSuffix = crypto.randomBytes(6).toString("hex");
    cb(null, `${file.fieldname}-${Date.now()}-${uniqueSuffix}.${ext}`);
  },
});

// NOTE: extension/mimetype are client-supplied and spoofable; this is a
// best-effort filter, not a content check.
function checkFileType(file, cb) {
  const isValidExtension = ALLOWED_EXTENSIONS.includes(getOriginalExtension(file));
  const isValidMimeType =
    file.mimetype.startsWith("image/") ||
    // Some clients send this generic fallback for real images.
    file.mimetype === "application/octet-stream";

  if (isValidExtension && isValidMimeType) {
    return cb(null, true);
  }

  cb(
    new ApiError(
      httpStatus.BAD_REQUEST,
      "Only images (.jpeg, .jpg, .png, .gif, .webp) are allowed."
    )
  );
}

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
  },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).fields([{ name: "images", maxCount: 10 }]);

// Put this AFTER the auth middleware, so anonymous requests are rejected
// before anything is written to disk. multer replaces req.body with the
// form fields, so carry over the user the auth middleware attached.
const uploadImages = (req, res, next) => {
  const user = req.body?.user;
  upload(req, res, (err) => {
    if (!err && user) req.body.user = user;
    next(err);
  });
};

module.exports = uploadImages;
