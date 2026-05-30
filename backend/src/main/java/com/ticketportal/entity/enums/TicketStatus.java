package com.ticketportal.entity.enums;

public enum TicketStatus {
    TODO("To Do"),
    IN_PROGRESS("In Progress"),
    IN_REVIEW("In Review"),
    TESTING("Testing"),
    DONE("Done"),
    CLOSED("Closed"),
    ON_HOLD("On Hold"),
    CANCELLED("Cancelled");

    private final String displayName;

    TicketStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
