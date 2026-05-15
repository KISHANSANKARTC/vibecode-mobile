import { Hono } from "hono";

const uploadRouter = new Hono();

/**
 * POST /api/upload
 * Accepts multipart form data with a "file" field
 * Forwards the file to Vibecode's storage service
 * Returns the uploaded file data with CDN URL
 */
uploadRouter.post("/", async (c) => {
  try {
    // Get the multipart form data
    const formData = await c.req.formData();
    const file = formData.get("file");

    console.log("[upload] Received upload request, file:", file ? "yes" : "no");

    // Validate file exists
    if (!file) {
      console.log("[upload] No file provided");
      return c.json(
        {
          error: {
            message: "No file provided. Please include a 'file' field in the form data.",
            code: "FILE_NOT_PROVIDED",
          },
        },
        { status: 400 }
      );
    }

    // Validate that file is actually a File object
    if (!(file instanceof File)) {
      console.log("[upload] File is not a File object:", typeof file);
      return c.json(
        {
          error: {
            message: "Invalid file format. Expected a File object.",
            code: "INVALID_FILE_FORMAT",
          },
        },
        { status: 400 }
      );
    }

    console.log("[upload] File validation passed:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Validate file size (max 500MB - Vibecode limit)
    const maxFileSize = 500 * 1024 * 1024;
    if (file.size === 0) {
      console.log("[upload] File is empty");
      return c.json(
        {
          error: {
            message: "File is empty.",
            code: "EMPTY_FILE",
          },
        },
        { status: 400 }
      );
    }

    if (file.size > maxFileSize) {
      console.log("[upload] File exceeds size limit:", file.size);
      return c.json(
        {
          error: {
            message: `File size exceeds maximum limit of ${maxFileSize / 1024 / 1024}MB.`,
            code: "FILE_TOO_LARGE",
          },
        },
        { status: 413 }
      );
    }

    // Create a new FormData object to send to Vibecode
    const vibecodeFormData = new FormData();
    vibecodeFormData.append("file", file);

    // Forward to Vibecode storage service
    const storageUrl = "https://storage.vibecodeapp.com/v1/files/upload";
    console.log("[upload] Forwarding to Vibecode storage:", storageUrl);

    let response: Response;
    try {
      response = await fetch(storageUrl, {
        method: "POST",
        body: vibecodeFormData,
      });
    } catch (error) {
      console.error("[upload] Failed to connect to Vibecode storage service:", error);
      return c.json(
        {
          error: {
            message: "Failed to connect to storage service. Please try again later.",
            code: "STORAGE_SERVICE_ERROR",
          },
        },
        { status: 503 }
      );
    }

    console.log("[upload] Vibecode storage response status:", response.status);

    // Handle storage service errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[upload] Vibecode storage service returned ${response.status}: ${errorText}`
      );

      if (response.status === 413) {
        return c.json(
          {
            error: {
              message: "File size exceeds the storage service limit.",
              code: "STORAGE_FILE_TOO_LARGE",
            },
          },
          { status: 413 }
        );
      }

      if (response.status === 400) {
        return c.json(
          {
            error: {
              message: "Invalid file format or corrupted file.",
              code: "INVALID_FILE",
            },
          },
          { status: 400 }
        );
      }

      return c.json(
        {
          error: {
            message: `Upload failed with status ${response.status}. Please try again.`,
            code: "UPLOAD_FAILED",
          },
        },
        { status: response.status as any }
      );
    }

    // Parse response from storage service
    let uploadData: any;
    try {
      uploadData = await response.json();
      console.log("[upload] Parsed Vibecode response:", JSON.stringify(uploadData).substring(0, 200));
    } catch (parseError) {
      console.error("[upload] Failed to parse storage service JSON response:", parseError);
      return c.json(
        {
          error: {
            message: "Storage service returned invalid JSON.",
            code: "INVALID_RESPONSE",
          },
        },
        { status: 502 }
      );
    }

    // Handle Vibecode storage response - should have `file` property
    const vibecodeFile = uploadData.file;
    if (!vibecodeFile) {
      console.error("[upload] No 'file' property in Vibecode response:", uploadData);
      return c.json(
        {
          error: {
            message: "Storage service response missing file data.",
            code: "INVALID_RESPONSE_FORMAT",
          },
        },
        { status: 502 }
      );
    }

    // Extract URL - try both `url` and fallback
    const fileUrl = vibecodeFile.url;
    if (!fileUrl) {
      console.error("[upload] No URL in file response:", vibecodeFile);
      return c.json(
        {
          error: {
            message: "Storage service did not return a file URL.",
            code: "INVALID_RESPONSE_FORMAT",
          },
        },
        { status: 502 }
      );
    }

    // Transform Vibecode response to normalized format
    const normalizedData = {
      id: vibecodeFile.id || "unknown",
      name: vibecodeFile.originalFilename || file.name,
      size: vibecodeFile.sizeBytes || file.size,
      mimeType: vibecodeFile.contentType || file.type,
      url: fileUrl,
      cdnUrl: fileUrl, // Vibecode's storage already serves via CDN
      createdAt: vibecodeFile.created || new Date().toISOString(),
    };

    console.log("[upload] Upload successful, returning normalized data:", {
      id: normalizedData.id,
      url: normalizedData.url,
      name: normalizedData.name,
    });

    // Return response with data envelope
    return c.json({ data: normalizedData });
  } catch (error) {
    console.error("[upload] Upload handler error:", error);

    return c.json(
      {
        error: {
          message: "An unexpected error occurred during upload.",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
});

export { uploadRouter };
