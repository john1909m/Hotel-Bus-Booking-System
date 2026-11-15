import { Injectable, signal } from '@angular/core';
import {
  ISpeechRecognition,
  SpeechLanguage,
  SpeechRecognitionConstructor,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
} from '../models/speech-recognition.model';

@Injectable({
  providedIn: 'root',
})
export class SpeechInputService {
  readonly isSupported = signal<boolean>(false);
  readonly isListening = signal<boolean>(false);
  readonly interimText = signal<string>('');
  readonly finalText = signal<string>('');
  readonly error = signal<string | null>(null);
  readonly currentLanguage = signal<SpeechLanguage>('en-US');

  private recognition: ISpeechRecognition | null = null;

  constructor() {
    this.checkSupport();
  }

  /**
   * Evaluates whether Web Speech API SpeechRecognition is available in the current environment.
   */
  checkSupport(): boolean {
    if (typeof window === 'undefined') {
      this.isSupported.set(false);
      return false;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const hasConstructor = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
    const isSecure = typeof window.isSecureContext === 'boolean' ? window.isSecureContext : true;
    const supported = hasConstructor && isSecure;

    this.isSupported.set(supported);
    return supported;
  }

  /**
   * Starts speech recognition in the designated language ('en-US' or 'ar-EG').
   * An optional callback can be provided to receive interim and accumulated final transcripts.
   */
  start(
    lang: SpeechLanguage = 'en-US',
    onTranscript?: (data: { interim: string; final: string }) => void
  ): void {
    if (!this.checkSupport()) {
      this.error.set(
        'Voice input is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Apple Safari.'
      );
      return;
    }

    // Stop active session first if already listening
    if (this.isListening()) {
      this.stop();
    }

    this.currentLanguage.set(lang);
    this.error.set(null);
    this.interimText.set('');
    this.finalText.set('');

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechClass) {
      this.error.set('Speech recognition engine could not be instantiated.');
      return;
    }

    try {
      this.recognition = new SpeechClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = lang;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening.set(true);
        this.error.set(null);
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (final) {
          this.finalText.update((prev) => (prev ? prev + ' ' + final.trim() : final.trim()));
        }
        this.interimText.set(interim.trim());

        if (onTranscript) {
          onTranscript({ interim: interim.trim(), final: this.finalText() });
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errCode = event.error;
        if (errCode === 'aborted') {
          this.isListening.set(false);
          return;
        }

        const message = this.mapErrorCodeToMessage(errCode, lang);
        this.error.set(message);
        this.isListening.set(false);
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
        this.interimText.set('');
      };

      this.recognition.start();
    } catch (e: any) {
      this.isListening.set(false);
      this.error.set(this.mapErrorCodeToMessage(e?.name || 'unknown', lang));
    }
  }

  /**
   * Stops listening gracefully, preserving any accumulated final transcripts.
   */
  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Recognition already stopped
      }
    }
    this.isListening.set(false);
    this.interimText.set('');
  }

  /**
   * Aborts listening, removes all handlers, and releases microphone resources.
   */
  dispose(): void {
    if (this.recognition) {
      try {
        this.recognition.onaudiostart = null;
        this.recognition.onaudioend = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onnomatch = null;
        this.recognition.onresult = null;
        this.recognition.onsoundstart = null;
        this.recognition.onsoundend = null;
        this.recognition.onspeechstart = null;
        this.recognition.onspeechend = null;
        this.recognition.onstart = null;
        this.recognition.abort();
      } catch {
        // Recognition already aborted
      }
      this.recognition = null;
    }
    this.isListening.set(false);
    this.interimText.set('');
  }

  /**
   * Translates internal browser speech recognition error codes into human-friendly messages.
   */
  mapErrorCodeToMessage(code: string, lang: SpeechLanguage): string {
    const isArabic = lang === 'ar-EG';
    switch (code) {
      case 'not-allowed':
      case 'PermissionDeniedError':
        return isArabic
          ? 'تم رفض إذن استخدام الميكروفون. يرجى السماح بالوصول إلى الميكروفون في إعدادات المتصفح.'
          : 'Microphone access was denied. Please grant microphone permissions in your browser settings to use voice input.';
      case 'no-speech':
        return isArabic
          ? 'لم يتم اكتشاف أي صوت. يرجى التحدث بوضوح والمحاولة مرة أخرى.'
          : 'No speech was detected. Please check your microphone and try speaking again.';
      case 'audio-capture':
        return isArabic
          ? 'تعذر الوصول إلى الميكروفون. يرجى التأكد من توصيل الميكروفون بشكل صحيح.'
          : 'No microphone was found or audio capture failed. Please check your microphone connection.';
      case 'network':
        return isArabic
          ? 'حدث خطأ في شبكة خدمة التعرف على الصوت. يرجى التحقق من الاتصال بالإنترنت.'
          : 'Network error occurred while contacting the speech recognition service. Please check your internet connection.';
      case 'service-not-allowed':
        return isArabic
          ? 'خدمة التعرف على الصوت غير مسموح بها في هذا المتصفح أو البيئة.'
          : 'Speech recognition service is not allowed in this browser or environment.';
      default:
        return isArabic
          ? 'حدث خطأ أثناء التعرف على الصوت. يرجى المحاولة مرة أخرى أو استخدام الكتابة.'
          : 'An error occurred during speech recognition. Please try again or type your message.';
    }
  }
}
