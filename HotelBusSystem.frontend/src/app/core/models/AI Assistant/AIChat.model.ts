export interface ResultItems{
    type: string;
    data: any;
}
export interface AiChatRequest{
    conversationId: string;
    message: string;
}

export interface AiChatResponse{
    conversationId: string;
    message: string;
    intent: string;
    results: ResultItems[];
    missingInformation: string[];
    requiresConfirmation: boolean;
    draftId: string;
}

export interface AiResult{
    type: any;
    data: any;
}
