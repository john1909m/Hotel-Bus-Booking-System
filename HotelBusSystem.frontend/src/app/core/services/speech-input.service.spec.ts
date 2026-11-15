import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpeechInputService } from './speech-input.service';
import { ISpeechRecognition } from '../models/speech-recognition.model';

class MockSpeechRecognition implements Partial<ISpeechRecognition> {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;
  onstart: ((ev: Event) => any) | null = null;
  onend: ((ev: Event) => any) | null = null;
  onerror: ((ev: any) => any) | null = null;
  onresult: ((ev: any) => any) | null = null;

  start = vi.fn().mockImplementation(() => {
    if (this.onstart) this.onstart(new Event('start'));
  });

  stop = vi.fn().mockImplementation(() => {
    if (this.onend) this.onend(new Event('end'));
  });

  abort = vi.fn().mockImplementation(() => {
    if (this.onend) this.onend(new Event('end'));
  });
}

describe('SpeechInputService', () => {
  let service: SpeechInputService;
  let mockWindow: any;

  beforeEach(() => {
    mockWindow = {
      SpeechRecognition: MockSpeechRecognition,
      webkitSpeechRecognition: undefined,
      isSecureContext: true,
    };
    vi.stubGlobal('window', mockWindow);
    service = new SpeechInputService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should detect support when SpeechRecognition is present in secure context', () => {
    expect(service.isSupported()).toBe(true);
    expect(service.isListening()).toBe(false);
  });

  it('should detect unsupported when SpeechRecognition is not present', () => {
    mockWindow.SpeechRecognition = undefined;
    mockWindow.webkitSpeechRecognition = undefined;

    const unsuppService = new SpeechInputService();
    expect(unsuppService.isSupported()).toBe(false);

    unsuppService.start('en-US');
    expect(unsuppService.error()).toContain('Voice input is not supported');
  });

  it('should detect unsupported in insecure context', () => {
    mockWindow.isSecureContext = false;
    const insecureService = new SpeechInputService();
    expect(insecureService.isSupported()).toBe(false);
  });

  it('should start listening and set active state', () => {
    service.start('en-US');
    expect(service.isListening()).toBe(true);
    expect(service.currentLanguage()).toBe('en-US');
    expect(service.error()).toBeNull();
  });

  it('should start listening with Arabic ar-EG language', () => {
    service.start('ar-EG');
    expect(service.isListening()).toBe(true);
    expect(service.currentLanguage()).toBe('ar-EG');
  });

  it('should accumulate interim and final transcripts from speech results', () => {
    service.start('en-US');

    const mockEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: { transcript: 'finding hotels in Cairo', confidence: 0.9 },
        },
      ],
    } as any;

    const instance = (service as any).recognition;
    instance.onresult(mockEvent);

    expect(service.interimText()).toBe('finding hotels in Cairo');
    expect(service.finalText()).toBe('');

    // Simulate final result event
    const finalEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'finding hotels in Cairo', confidence: 0.95 },
        },
      ],
    } as any;
    instance.onresult(finalEvent);

    expect(service.finalText()).toBe('finding hotels in Cairo');
  });

  it('should invoke onTranscript callback with interim and final data', () => {
    const transcriptCb = vi.fn();
    service.start('en-US', transcriptCb);

    const instance = (service as any).recognition;
    instance.onresult({
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: { transcript: 'book bus', confidence: 0.8 },
        },
      ],
    });

    expect(transcriptCb).toHaveBeenCalledWith({ interim: 'book bus', final: '' });
  });

  it('should map permission denied error to user friendly message', () => {
    service.start('en-US');
    const instance = (service as any).recognition;

    instance.onerror({ error: 'not-allowed' });

    expect(service.isListening()).toBe(false);
    expect(service.error()).toContain('Microphone access was denied');
  });

  it('should map Arabic error messages when language is ar-EG', () => {
    service.start('ar-EG');
    const instance = (service as any).recognition;

    instance.onerror({ error: 'not-allowed' });

    expect(service.isListening()).toBe(false);
    expect(service.error()).toContain('تم رفض إذن استخدام الميكروفون');
  });

  it('should not display error when recognition is aborted', () => {
    service.start('en-US');
    const instance = (service as any).recognition;

    instance.onerror({ error: 'aborted' });

    expect(service.isListening()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('should stop listening and clean up on dispose()', () => {
    service.start('en-US');
    expect(service.isListening()).toBe(true);

    service.dispose();

    expect(service.isListening()).toBe(false);
    expect((service as any).recognition).toBeNull();
  });
});
