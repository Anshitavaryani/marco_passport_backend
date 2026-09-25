const httpStatus = require("http-status");

const catchAsync = require("../../utils/catchAsync");
const ApiError = require("../../utils/ApiError");
const responseWrapper = require("../../config/responseWrapper");

// Standalone single-image upload — used by rich text editors (CKEditor,
// TinyMCE) when someone drops/embeds an image directly inside the
// content body, not the featured_image/gallery flow on create/update.
// Returns just a URL, which is what the editor's upload adapter needs
// to insert an <img> tag at the cursor position.
const uploadImage = catchAsync(async (req, res) => {
  const uploadedFile = req.files?.images?.[0];

  if (!uploadedFile) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No image file provided.");
  }

  const url = `/images/${uploadedFile.filename}`;

  return responseWrapper(
    res,
    { url },
    "Image uploaded successfully",
    httpStatus.CREATED
  );
});

module.exports = {
  uploadImage,
};