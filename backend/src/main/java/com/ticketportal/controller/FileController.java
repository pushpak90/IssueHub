package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.dto.response.AttachmentResponse;
import com.ticketportal.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
@Tag(name = "Files", description = "File upload/download endpoints")
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload/{ticketId}")
    @Operation(summary = "Upload file attachment to ticket")
    public ResponseEntity<ApiResponse<AttachmentResponse>> uploadFile(
            @PathVariable Long ticketId,
            @RequestParam("file") MultipartFile file) throws IOException {
        AttachmentResponse response = fileStorageService.uploadFile(ticketId, file);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("File uploaded", response));
    }

    @GetMapping("/download/{fileName:.+}")
    @Operation(summary = "Download file by name")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        Resource resource = fileStorageService.loadFile(fileName);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
            .body(resource);
    }

    @DeleteMapping("/{attachmentId}")
    @Operation(summary = "Delete attachment")
    public ResponseEntity<ApiResponse<String>> deleteFile(@PathVariable Long attachmentId) throws IOException {
        fileStorageService.deleteFile(attachmentId);
        return ResponseEntity.ok(ApiResponse.success("File deleted"));
    }

    @PostMapping("/images")
    @Operation(summary = "Upload an inline image (for use in comments/descriptions)")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> uploadImage(
            @RequestParam("file") MultipartFile file) throws IOException {
        String[] allowed = { "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml" };
        String ct = file.getContentType();
        boolean ok = ct != null && java.util.Arrays.stream(allowed).anyMatch(ct::startsWith);
        if (!ok) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Only image files are allowed (JPG, PNG, GIF, WEBP, SVG)"));
        }
        String saved = fileStorageService.uploadImage(file);
        java.util.Map<String, String> result = new java.util.LinkedHashMap<>();
        result.put("url", "/api/files/images/" + saved);
        result.put("fileName", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Image uploaded", result));
    }

    @GetMapping("/images/{fileName:.+}")
    @Operation(summary = "Serve an inline image")
    public ResponseEntity<Resource> serveImage(@PathVariable String fileName) {
        Resource resource = fileStorageService.loadFile(fileName);
        String ct = fileName.endsWith(".png") ? "image/png"
            : fileName.endsWith(".gif") ? "image/gif"
            : fileName.endsWith(".svg") ? "image/svg+xml"
            : fileName.endsWith(".webp") ? "image/webp"
            : "image/jpeg";
        return ResponseEntity.ok()
            .contentType(org.springframework.http.MediaType.parseMediaType(ct))
            .body(resource);
    }
}
