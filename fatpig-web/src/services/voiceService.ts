// src/services/voiceService.ts
// Cross-browser voice recognition service with Safari support

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface VoiceRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

class VoiceService {
  private recognition: any = null;
  private isListening = false;
  private onResultCallback: ((result: VoiceRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    this.initializeRecognition();
  }

  private initializeRecognition() {
    // Check for browser support with webkit prefix fallback for Safari
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognition();
  }

  /**
   * Check if speech recognition is supported in the current browser
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Get browser compatibility information
   */
  getBrowserInfo(): { supported: boolean; browser: string; note: string } {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes("chrome") && !userAgent.includes("edg")) {
      return {
        supported: true,
        browser: "Chrome",
        note: "Full support with best accuracy"
      };
    } else if (userAgent.includes("edg")) {
      return {
        supported: true,
        browser: "Edge",
        note: "Full support with best accuracy"
      };
    } else if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
      return {
        supported: true,
        browser: "Safari",
        note: "Supported with webkit prefix. Requires HTTPS and user permission each time."
      };
    } else if (userAgent.includes("firefox")) {
      return {
        supported: false,
        browser: "Firefox",
        note: "Speech Recognition not supported. Please use Chrome, Edge, or Safari."
      };
    } else {
      return {
        supported: this.isSupported(),
        browser: "Unknown",
        note: this.isSupported() 
          ? "May have limited support" 
          : "Speech Recognition not supported"
      };
    }
  }

  /**
   * Configure and start voice recognition
   */
  start(options: VoiceRecognitionOptions = {}) {
    if (!this.recognition) {
      const error = "Speech Recognition not initialized";
      console.error(error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      return;
    }

    if (this.isListening) {
      console.warn("Already listening");
      return;
    }

    // Configure recognition
    this.recognition.lang = options.language || 'id-ID';
    this.recognition.continuous = options.continuous !== undefined ? options.continuous : false;
    this.recognition.interimResults = options.interimResults !== undefined ? options.interimResults : false;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log("Voice recognition started");
    };

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      const transcript = lastResult[0].transcript;
      const confidence = lastResult[0].confidence;
      const isFinal = lastResult.isFinal;

      if (this.onResultCallback) {
        this.onResultCallback({
          transcript: transcript.trim(),
          confidence,
          isFinal
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      let errorMessage = "Unknown error";
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = "Tidak ada suara terdeteksi. Silakan coba lagi.";
          break;
        case 'audio-capture':
          errorMessage = "Mikropon tidak tersedia. Periksa pengaturan perangkat Anda.";
          break;
        case 'not-allowed':
          errorMessage = "Izin mikropon ditolak. Silakan izinkan akses mikropon di pengaturan browser.";
          break;
        case 'network':
          errorMessage = "Error jaringan. Pastikan Anda terhubung ke internet.";
          break;
        case 'aborted':
          errorMessage = "Pengenalan suara dibatalkan.";
          break;
        case 'bad-grammar':
          errorMessage = "Grammar error dalam speech recognition.";
          break;
        case 'language-not-supported':
          errorMessage = "Bahasa tidak didukung.";
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      console.error("Speech recognition error:", event.error);
      this.isListening = false;
      
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log("Voice recognition ended");
      
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (error: any) {
      console.error("Failed to start recognition:", error);
      this.isListening = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message || "Gagal memulai pengenalan suara");
      }
    }
  }

  /**
   * Stop voice recognition
   */
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Abort voice recognition immediately
   */
  abort() {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Set callback for recognition results
   */
  onResult(callback: (result: VoiceRecognitionResult) => void) {
    this.onResultCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for end event
   */
  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks() {
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }
}

// Export singleton instance
export const voiceService = new VoiceService();

// Export interface for TypeScript
export type { VoiceRecognitionResult, VoiceRecognitionOptions };
