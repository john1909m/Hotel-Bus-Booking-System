package com.spring.boot.dto.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatRequest(
        String conversationId,

        @NotBlank
        @Size(max = 2000)
        String message
) {
}
