package com.ticketportal.controller;

import com.ticketportal.dto.response.ApiResponse;
import com.ticketportal.service.SystemSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/settings")
@RequiredArgsConstructor
@Tag(name = "Settings", description = "Read-only application settings")
public class SettingController {

    private final SystemSettingService settingService;

    @GetMapping("/map")
    @Operation(summary = "Get application settings")
    public ResponseEntity<ApiResponse<Map<String, String>>> getSettingsMap() {
        return ResponseEntity.ok(ApiResponse.success(settingService.getAllSettingsAsMap()));
    }
}
