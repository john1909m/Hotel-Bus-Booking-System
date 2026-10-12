package com.spring.boot.service;

import lombok.AllArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * Service for loading the system prompt from a resource file.
 */
@Service
@AllArgsConstructor
public class SystemPromptService {

    private final ResourceLoader resourceLoader;

    /**
     * Loads the system prompt from the classpath resource.
     *
     * @return The system prompt content
     * @throws IOException If the resource cannot be read
     */
    public String loadSystemPrompt() throws IOException {
        Resource resource = resourceLoader.getResource("classpath:ai/system-prompt.txt");
        StringBuilder content = new StringBuilder();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }

        return content.toString();
    }
}