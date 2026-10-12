package com.spring.boot.dto.ai;

import java.util.List;

public record AiResponse(
        String conversationId,             // conversation identifier
        String message,                    // assistant text
        String intent,                     // e.g. GREETING, HOTEL_SEARCH, ERROR
        List<AiResult> results,            // structured results from tools
        List<String> missingInformation,   // what the assistant still needs
        boolean requiresConfirmation,
        String draftId
) {
}
