package com.ticketportal.service;

import com.ticketportal.entity.SystemSetting;
import com.ticketportal.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemSettingService {

    private final SystemSettingRepository settingRepository;

    @Transactional(readOnly = true)
    public List<SystemSetting> getAllSettings() {
        return settingRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Map<String, String> getAllSettingsAsMap() {
        return settingRepository.findAll().stream()
            .collect(Collectors.toMap(SystemSetting::getKey, s -> s.getValue() != null ? s.getValue() : ""));
    }

    @Transactional(readOnly = true)
    public String getValue(String key, String defaultValue) {
        return settingRepository.findById(key)
            .map(SystemSetting::getValue)
            .orElse(defaultValue);
    }

    @Transactional
    public SystemSetting updateSetting(String key, String value) {
        SystemSetting setting = settingRepository.findById(key)
            .orElse(SystemSetting.builder().key(key).category("GENERAL").build());
        setting.setValue(value);
        return settingRepository.save(setting);
    }

    @Transactional
    public void updateSettings(Map<String, String> updates) {
        updates.forEach((key, value) -> {
            SystemSetting setting = settingRepository.findById(key)
                .orElse(SystemSetting.builder().key(key).category("GENERAL").build());
            setting.setValue(value);
            settingRepository.save(setting);
        });
        log.info("Updated {} system settings", updates.size());
    }

    @Transactional
    public void initializeDefaults() {
        saveIfAbsent("app.name",                "Ticket Portal",         "Application display name",          "APP");
        saveIfAbsent("app.description",         "Modern Project Management System", "App description",        "APP");
        saveIfAbsent("app.default_priority",    "MEDIUM",                "Default ticket priority",           "TICKET");
        saveIfAbsent("app.default_type",        "TASK",                  "Default ticket type",               "TICKET");
        saveIfAbsent("app.default_status",      "TODO",                  "Default ticket status on create",   "TICKET");
        saveIfAbsent("board.columns",           "TODO,IN_PROGRESS,IN_REVIEW,TESTING,DONE", "Kanban board columns (comma-separated statuses)", "BOARD");
        saveIfAbsent("board.done_column",       "DONE",                  "Column that marks ticket as done",  "BOARD");
        saveIfAbsent("ticket.max_attachments",  "10",                    "Max file attachments per ticket",   "TICKET");
        saveIfAbsent("ticket.allow_delete",     "true",                  "Allow ticket deletion",             "TICKET");
        saveIfAbsent("notif.email_enabled",     "false",                 "Enable email notifications",        "NOTIFICATION");
        saveIfAbsent("notif.mention_enabled",   "true",                  "Enable @mention notifications",     "NOTIFICATION");
    }

    private void saveIfAbsent(String key, String value, String description, String category) {
        if (!settingRepository.existsById(key)) {
            settingRepository.save(SystemSetting.builder()
                .key(key).value(value).description(description).category(category).build());
        }
    }
}
