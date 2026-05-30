package com.ticketportal.entity.enums;

public enum ProjectStatus {
    ACTIVE("Active"),
    ARCHIVED("Archived"),
    COMPLETED("Completed"),
    ON_HOLD("On Hold");

    private final String displayName;

    ProjectStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
