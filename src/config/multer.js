const fs = require("fs");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const PUBLIC_DIR = path.resolve(__dirname, "../../public");

// Renamed 'audios' -> 'songs' to match app.js, which serves this content
// back out at the `/songs` static route pointing at `uploads/songs`. In the
// original code these two files disagreed (multer wrote to `uploads/audios`,
// app.js only served `/songs` -> `uploads/songs`), so uploaded audio files
// were saved but never reachable.
const UPLOAD_DIRS = ["videos", "images", "gifs", "docs", "songs"];

// Ensure every upload directory exists up front. Without this, multer's
// diskStorage throws ENOENT the first time it tries to write into a
// directory that was never created (e.g. a fresh clone/deploy).
for (const dir of UPLOAD_DIRS) {
  fs.mkdirSync(path.join(PUBLIC_DIR, "uploads", dir), { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (UPLOAD_DIRS.includes(file.fieldname)) {
      cb(null, path.join(PUBLIC_DIR, "uploads", file.fieldname));
    } else {
      cb(new Error("Invalid fieldname"));
    }
  },
  filename: function (req, file, cb) {
    const ext = getFileExtension(file);
    // Date.now() alone can collide when multiple files land in the same
    // field in one request (this config allows up to 10 per field) —
    // added a random suffix so simultaneous uploads never overwrite
    // each other.
    const uniqueSuffix = crypto.randomBytes(6).toString("hex");
    cb(null, `${file.fieldname}-${Date.now()}-${uniqueSuffix}.${ext}`);
  },
});

function checkFileType(file, cb) {
  const allowedFiletypes = [
    "jpeg",
    "jpg",
    "png",
    "gif",
    "mp4",
    "mov",
    "pdf",
    "mp3",
    "doc",
    "docx",
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isValidExtension = allowedFiletypes.includes(
    fileExtension.substring(1)
  );

  const isValidMimeType =
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("application/pdf") ||
    file.mimetype.startsWith("audio/") ||
    file.mimetype === "application/msword" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isValidExtension && isValidMimeType) {
    return cb(null, true);
  }
  // multer 2.x requires an Error object here, not a string — the
  // previous code passed a plain string, which multer 1.x tolerated but
  // 2.x's error handling expects a real Error.
  cb(
    new Error(
      "Only images (.jpeg, .jpg, .png, .gif), videos (.mp4, .mov), audio (.mp3), and documents (.pdf, .doc, .docx) are allowed."
    )
  );
}

function getFileExtension(file) {
  const mimeToExtMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/mov": "mov",
    "application/pdf": "pdf",
    "audio/mpeg": "mp3",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
  };
  return mimeToExtMap[file.mimetype] || "txt";
}

// NOTE: mimetype/extension checks trust client-supplied values, which are
// spoofable — someone can rename a malicious file to .jpg and set the
// mimetype header to image/jpeg. That's an acceptable baseline for most
// starter apps, but since these files get served back out publicly via
// /images, /videos, /docs, worth eventually adding real content sniffing
// (e.g. the `file-type` package, reading magic bytes from the buffer) if
// this becomes a public-facing upload feature. Flagging rather than adding
// it now to avoid pulling in an untested dependency in this pass.
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file — unbounded uploads were a storage/DoS risk
  },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
}).fields([
  { name: "gifs", maxCount: 10 },
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 10 },
  { name: "docs", maxCount: 10 },
  { name: "songs", maxCount: 10 },
]);

module.exports = upload;
