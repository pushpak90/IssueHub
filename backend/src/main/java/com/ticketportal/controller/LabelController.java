package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.exception.ResourceNotFoundException;
import com.ticketportal.repository.LabelRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/labels")
@RequiredArgsConstructor
@Tag(name = "Labels", description = "Label management endpoints")
public class LabelController {

    private final LabelRepository labelRepository;

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a label")
    public ResponseEntity<ApiResponse<String>> deleteLabel(@PathVariable Long id) {
        if (!labelRepository.existsById(id)) {
            throw new ResourceNotFoundException("Label", "id", id);
        }
        labelRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Label deleted"));
    }
}
