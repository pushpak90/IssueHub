package com.ticketportal.entity.enums;

public enum TicketType {
    BUG("Bug"),
    FEATURE("Feature"),
    TASK("Task"),
    IMPROVEMENT("Improvement"),
    EPIC("Epic"),
    STORY("Story"),
    TEST("Test"),
    DOCUMENTATION("Documentation");

    private final String displayName;

    TicketType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
