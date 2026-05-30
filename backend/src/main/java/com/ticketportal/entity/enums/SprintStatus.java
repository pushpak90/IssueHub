package com.ticketportal.entity.enums;

public enum SprintStatus {
    PLANNING("Planning"),
    ACTIVE("Active"),
    COMPLETED("Completed");

    private final String displayName;
    SprintStatus(String displayName) { this.displayName = displayName; }
    public String getDisplayName() { return displayName; }
}
