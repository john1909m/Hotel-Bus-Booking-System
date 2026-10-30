package com.spring.boot.dto.ai;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record AiResponse(
        String conversationId,             // conversation identifier
        String message,                    // assistant text
        String intent,                     // e.g. GREETING, HOTEL_SEARCH, ERROR
        List<AiResult> results,            // structured results from tools
        List<String> missingInformation,   // what the assistant still needs
        boolean requiresConfirmation,
        String draftId,
        @Schema(description = "Indicates whether room or seat selection is required by the user before creating a draft", example = "true")
        boolean selectionRequired
) {
    public AiResponse(String conversationId, String message, String intent, List<AiResult> results,
                      List<String> missingInformation, boolean requiresConfirmation, String draftId) {
        this(conversationId, message, intent, results, missingInformation, requiresConfirmation, draftId,
                results != null && results.stream().anyMatch(r -> "ROOM".equals(r.type()) || "SEAT_MAP".equals(r.type())));
    }
}
