package com.ticketportal.service;

import com.ticketportal.dto.response.AttachmentResponse;
import com.ticketportal.entity.Attachment;
import com.ticketportal.entity.Ticket;
import com.ticketportal.entity.User;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.AttachmentRepository;
import com.ticketportal.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final AttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final UserService userService;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @Transactional
    public AttachmentResponse uploadFile(Long ticketId, MultipartFile file) throws IOException {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", ticketId));
        User currentUser = userService.getCurrentUser();

        String originalName = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf(".")) : "";
        String fileName = UUID.randomUUID() + extension;

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);
        Path targetPath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        Attachment attachment = Attachment.builder()
            .fileName(fileName)
            .originalName(originalName)
            .fileSize(file.getSize())
            .contentType(file.getContentType())
            .filePath(targetPath.toString())
            .ticket(ticket)
            .uploadedBy(currentUser)
            .build();

        Attachment saved = attachmentRepository.save(attachment);
        return AttachmentResponse.builder()
            .id(saved.getId())
            .fileName(saved.getFileName())
            .originalName(saved.getOriginalName())
            .fileSize(saved.getFileSize())
            .contentType(saved.getContentType())
            .downloadUrl("/api/files/download/" + saved.getFileName())
            .uploadedBy(userService.toResponse(currentUser))
            .createdAt(saved.getCreatedAt())
            .build();
    }

    public Resource loadFile(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(fileName);
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new RuntimeException("File not found: " + fileName);
        } catch (MalformedURLException e) {
            throw new RuntimeException("File not found: " + fileName, e);
        }
    }

    @Transactional
    public void deleteFile(Long attachmentId) throws IOException {
        Attachment attachment = attachmentRepository.findById(attachmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Attachment", "id", attachmentId));
        Path filePath = Paths.get(attachment.getFilePath());
        Files.deleteIfExists(filePath);
        attachmentRepository.delete(attachment);
    }

    /** Upload a standalone inline image (not tied to a ticket) — for use in comments/descriptions */
    public String uploadImage(MultipartFile file) throws IOException {
        String originalName = StringUtils.cleanPath(
            file.getOriginalFilename() != null ? file.getOriginalFilename() : "image");
        String extension = originalName.contains(".")
            ? originalName.substring(originalName.lastIndexOf(".")) : ".png";
        String fileName = "img_" + UUID.randomUUID() + extension;

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);
        Files.copy(file.getInputStream(), uploadPath.resolve(fileName),
            StandardCopyOption.REPLACE_EXISTING);
        return fileName;
    }
}
