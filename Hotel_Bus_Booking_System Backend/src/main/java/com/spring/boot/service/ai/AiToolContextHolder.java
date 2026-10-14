package com.spring.boot.service.ai;

/**
 * Holder for request-scoped AiToolContext using ThreadLocal.
 * The context should be cleared after each request to prevent memory leaks
 * and ensure isolation between requests.
 */
public class AiToolContextHolder {

    private static final ThreadLocal<AiToolContext> CONTEXT = new ThreadLocal<>();

    private AiToolContextHolder() {
        // Prevent instantiation
    }

    /**
     * Gets the current context for this thread.
     *
     * @return the context or null if none has been set
     */
    public static com.spring.boot.service.ai.AiToolContext getContext() {
        return CONTEXT.get();
    }

    /**
     * Sets the context for this thread.
     * @param context the context to set
     */
    public static void setContext(AiToolContext context) {
        CONTEXT.set(context);
    }

    /**
     * Clears the context for this thread.
     * Should be called after each request to prevent memory leaks.
     */
    public static void clearContext() {
        CONTEXT.remove();
    }
}