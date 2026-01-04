# FATpig React - Future Features: Voice Input & OCR

> **Implementation guide for upcoming Voice Input and Receipt OCR features**

---

## 📖 Table of Contents

- [Overview](#overview)
- [Feature 1: Voice Input Transaction](#feature-1-voice-input-transaction)
- [Feature 2: Receipt OCR (Vision)](#feature-2-receipt-ocr-vision)
- [Implementation Roadmap](#implementation-roadmap)
- [Technical Considerations](#technical-considerations)

---

## 🎯 Overview

These features are **currently implemented in the Python/Flet version** and planned for React version.

### Feature Status

| Feature | Python/Flet | React/Web | Complexity | Priority |
|---------|-------------|-----------|------------|----------|
| **Voice Input** | ✅ Implemented | 🚧 Planned | Medium | High |
| **Receipt OCR** | ✅ Implemented | 🚧 Planned | High | Medium |

### Why These Features?

**Voice Input:**
- 🎤 Faster transaction entry (hands-free)
- 📱 Better mobile UX
- ♿ Accessibility improvement

**Receipt OCR:**
- 📸 Instant transaction capture from photos
- 🧾 Automatic amount & category detection
- ⏱️ Saves manual typing time

---

## 🎤 Feature 1: Voice Input Transaction

### Current Implementation (Python/Flet)

```python
import speech_recognition as sr

class VoiceService:
    @staticmethod
    def transcribe():
        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            print("Listening...")
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            text = recognizer.recognize_google(audio, language='id-ID')
            return text
```

**Usage Flow:**
1. User clicks microphone button
2. Browser requests microphone permission
3. User speaks transaction (e.g., "beli nasi goreng 25 ribu")
4. Speech-to-text converts to text
5. AI parses the text (existing AI service)
6. Display result for confirmation

---

### Proposed React Implementation

#### Option 1: Web Speech API (Browser Native)

**Pros:**
- ✅ No external dependencies
- ✅ Works offline
- ✅ No API costs

**Cons:**
- ❌ Browser support varies (Chrome best)
- ❌ No Firefox support
- ❌ Accuracy varies

**Implementation:**

```typescript
// src/services/voiceService.ts
export class VoiceService {
  private recognition: any;

  constructor() {
    // Check browser support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error("Speech recognition not supported in this browser");
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'id-ID';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
  }

  async transcribe(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (event: any) => {
        reject(new Error(event.error));
      };

      this.recognition.start();
    });
  }

  stop() {
    this.recognition.stop();
  }
}
```

**Usage in Component:**

```typescript
import { useState } from 'react';
import { VoiceService } from '@/services/voiceService';
import { AIService } from '@/services/aiService';
import { Mic, MicOff } from 'lucide-react';

export const VoiceTransactionInput = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const handleVoiceInput = async () => {
    try {
      setIsListening(true);
      setError('');
      
      const voiceService = new VoiceService();
      const text = await voiceService.transcribe();
      
      setTranscript(text);
      setIsListening(false);
      
      // Parse with AI
      const result = await AIService.parseTransaction(text, categories);
      console.log('AI Result:', result);
      
    } catch (err: any) {
      setError(err.message);
      setIsListening(false);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={handleVoiceInput}
        disabled={isListening}
        className={`
          w-full px-6 py-4 rounded-xl flex items-center justify-center gap-3
          ${isListening 
            ? 'bg-red-500 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
          }
          text-white font-medium disabled:opacity-50 transition-all
        `}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        {isListening ? 'Listening...' : 'Tap to Speak'}
      </button>

      {transcript && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500">You said:</p>
          <p className="font-medium">{transcript}</p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};
```

---

#### Option 2: Google Cloud Speech-to-Text API

**Pros:**
- ✅ Better accuracy
- ✅ More language options
- ✅ Works in all browsers

**Cons:**
- ❌ Requires API key
- ❌ Costs money (after free tier)
- ❌ Requires internet

**Implementation:**

```typescript
// src/services/voiceService.ts
export const VoiceService = {
  async transcribeWithGoogle(audioBlob: Blob): Promise<string> {
    const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
    
    // Convert blob to base64
    const reader = new FileReader();
    const base64Audio = await new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.readAsDataURL(audioBlob);
    });

    // Call Google Cloud Speech API
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'id-ID',
          },
          audio: {
            content: base64Audio,
          },
        }),
      }
    );

    const data = await response.json();
    return data.results[0].alternatives[0].transcript;
  },
};
```

---

### Browser Support

| Browser | Web Speech API | Workaround |
|---------|----------------|------------|
| Chrome | ✅ Full support | - |
| Edge | ✅ Full support | - |
| Safari | ⚠️ Partial (iOS 14.5+) | Use MediaRecorder + Google API |
| Firefox | ❌ No support | Use MediaRecorder + Google API |

---

### UI/UX Recommendations

**Visual Feedback:**
```tsx
{isListening && (
  <div className="flex flex-col items-center">
    <div className="w-24 h-24 rounded-full bg-red-500 animate-ping" />
    <p className="mt-4 text-sm text-gray-500">Listening...</p>
  </div>
)}
```

**Error Handling:**
```typescript
if (error.includes('not-allowed')) {
  setError('Microphone permission denied. Please allow in browser settings.');
}
if (error.includes('no-speech')) {
  setError('No speech detected. Please try again.');
}
```

---

## 📸 Feature 2: Receipt OCR (Vision)

### Current Implementation (Python/Flet)

```python
from PIL import Image
import google.generativeai as genai

class VisionService:
    @staticmethod
    def extract_transaction(image_path: str):
        model = genai.GenerativeModel('gemini-pro-vision')
        image = Image.open(image_path)
        
        prompt = """
        Extract transaction details from this receipt:
        - Amount (nominal)
        - Store name (merchant)
        - Date
        - Items purchased
        
        Return as JSON: {"nominal": 25000, "merchant": "Store Name", "date": "2025-12-28", "items": ["item1", "item2"]}
        """
        
        response = model.generate_content([prompt, image])
        return response.text
```

---

### Proposed React Implementation

#### Step 1: Image Capture

```typescript
// src/components/ReceiptCapture.tsx
import { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';

export const ReceiptCapture = () => {
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6">
      <div className="flex gap-4 mb-6">
        {/* Camera Button (Mobile) */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg
            flex items-center justify-center gap-2"
        >
          <Camera size={20} />
          Take Photo
        </button>
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg
            flex items-center justify-center gap-2"
        >
          <Upload size={20} />
          Upload
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {image && (
        <div className="mt-4">
          <img 
            src={image} 
            alt="Receipt" 
            className="w-full rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
};
```

---

#### Step 2: OCR with Google Gemini Vision

```typescript
// src/services/visionService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export const VisionService = {
  async extractReceipt(imageBase64: string): Promise<{
    nominal: number;
    merchant: string;
    date: string;
    items: string[];
  }> {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Analisis struk pembelian ini dan ekstrak informasi:
    
1. Total nominal pembelian (angka saja)
2. Nama toko/merchant
3. Tanggal transaksi (format YYYY-MM-DD)
4. Daftar barang yang dibeli

Balas HANYA dengan JSON (tanpa markdown):
{"nominal": 50000, "merchant": "Indomaret", "date": "2025-12-28", "items": ["Nasi Goreng", "Air Mineral"]}`;

    try {
      // Convert base64 to Blob
      const base64Data = imageBase64.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Create image part for Gemini
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Clean and parse JSON
      let cleanJson = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const jsonMatch = cleanJson.match(/\{[^}]+\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanJson);
      return parsed;
    } catch (error: any) {
      console.error('OCR Error:', error);
      throw new Error(`Gagal mengekstrak data: ${error.message}`);
    }
  },
};
```

---

#### Step 3: Complete Receipt Scanner Component

```typescript
// src/components/ReceiptScanner.tsx
import { useState } from 'react';
import { ReceiptCapture } from './ReceiptCapture';
import { VisionService } from '@/services/visionService';
import { Loader2 } from 'lucide-react';

export const ReceiptScanner = ({ onExtracted }: { onExtracted: (data: any) => void }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleImageCapture = (imageBase64: string) => {
    setImage(imageBase64);
    setResult(null);
    setError('');
  };

  const handleScan = async () => {
    if (!image) return;

    setLoading(true);
    setError('');

    try {
      const extracted = await VisionService.extractReceipt(image);
      setResult(extracted);
      onExtracted(extracted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Receipt Scanner</h2>

      <ReceiptCapture onCapture={handleImageCapture} />

      {image && !result && (
        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full mt-6 px-6 py-4 bg-purple-500 text-white rounded-xl
            hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Scanning...
            </>
          ) : (
            'Scan Receipt'
          )}
        </button>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <h3 className="text-lg font-bold mb-4">Extracted Data</h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Merchant</p>
              <p className="font-medium">{result.merchant}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium text-2xl">
                Rp {result.nominal.toLocaleString('id-ID')}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{result.date}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Items</p>
              <ul className="list-disc list-inside">
                {result.items.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => {
              // Convert to transaction format
              onExtracted({
                nominal: result.nominal,
                keterangan: `${result.merchant} - ${result.items.join(', ')}`,
                kategori: 'Shopping', // Can be auto-detected
                tipe: 'pengeluaran'
              });
            }}
            className="w-full mt-6 px-4 py-3 bg-blue-500 text-white rounded-lg
              hover:bg-blue-600"
          >
            Create Transaction
          </button>
        </div>
      )}
    </div>
  );
};
```

---

### Technical Considerations

#### Image Quality
- **Minimum resolution:** 640x480
- **Format:** JPEG, PNG, WEBP
- **Max size:** 4MB (adjust based on API limits)

#### OCR Accuracy
- Indonesian receipts may vary in format
- Need fallback for manual correction
- Test with various stores (Indomaret, Alfamart, restaurants, etc.)

#### Cost Analysis (Gemini Vision API)
- **Free tier:** 15 requests/minute
- **Pricing:** Check [Google AI pricing](https://ai.google.dev/pricing)
- **Optimization:** Cache results, batch processing

---

## 📅 Implementation Roadmap

### Phase 1: Voice Input (Priority: High)

**Timeline:** 2-3 weeks

**Tasks:**
1. ✅ Research Web Speech API compatibility
2. ✅ Create `voiceService.ts` with Web Speech API
3. ✅ Build `VoiceTransactionInput` component
4. ✅ Add microphone permission handling
5. ✅ Integrate with existing AI parsing
6. ✅ Test on Chrome, Edge, Safari
7. ✅ Add fallback for unsupported browsers
8. ✅ Deploy and gather user feedback

**Deliverables:**
- Working voice input on Chrome/Edge
- Graceful degradation on other browsers
- User documentation

---

### Phase 2: Receipt OCR (Priority: Medium)

**Timeline:** 3-4 weeks

**Tasks:**
1. ✅ Set up Gemini Vision API
2. ✅ Create `visionService.ts`
3. ✅ Build `ReceiptCapture` component
4. ✅ Build `ReceiptScanner` component
5. ✅ Test with various receipt formats
6. ✅ Add manual correction UI
7. ✅ Optimize image compression
8. ✅ Deploy and monitor accuracy

**Deliverables:**
- Receipt scanner with 80%+ accuracy
- Manual correction interface
- User guide with best practices

---

### Phase 3: Optimization & Polish

**Timeline:** 1-2 weeks

**Tasks:**
1. Performance optimization
2. Offline fallback (PWA)
3. Batch processing multiple receipts
4. Integration with expense categories
5. Analytics dashboard

---

## 🔧 Technical Considerations

### Security

**Voice Input:**
- ✅ Microphone permission requests
- ✅ No audio stored server-side
- ✅ Process locally when possible

**Receipt OCR:**
- ⚠️ Images sent to Google API (privacy concern)
- ✅ Option to process locally (TensorFlow.js OCR)
- ✅ Auto-delete images after processing

### Performance

**Voice:**
- Latency: ~1-2 seconds (Web Speech API)
- Latency: ~2-4 seconds (Google Cloud API)

**OCR:**
- Image upload: ~500ms - 2s (depending on size)
- Processing: ~2-5s (Gemini Vision)
- Total: ~3-7s end-to-end

### Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Web Speech API | ✅ | ⚠️ | ❌ | ✅ |
| Camera API | ✅ | ✅ | ✅ | ✅ |
| File Upload | ✅ | ✅ | ✅ | ✅ |

---

## 📚 Resources

### Documentation
- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Google Gemini Vision API](https://ai.google.dev/tutorials/vision_quickstart)
- [MediaDevices API (Camera)](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)

### Libraries
- **Web Speech API** - Native browser API
- **@google/generative-ai** - Already installed
- **react-webcam** - Alternative camera component
- **tesseract.js** - Offline OCR alternative

---

## 🎯 Success Metrics

**Voice Input:**
- 90%+ transcription accuracy (Indonesian)
- < 3 seconds end-to-end latency
- 70%+ user adoption rate

**Receipt OCR:**
- 80%+ extraction accuracy
- 50%+ time saved vs manual entry
- < 10 seconds processing time

---

## 🚀 Getting Started

### Enable Voice Input (Dev Mode)

```typescript
// Add to .env
VITE_ENABLE_VOICE_INPUT=true

// Use in app
if (import.meta.env.VITE_ENABLE_VOICE_INPUT === 'true') {
  // Show voice button
}
```

### Enable Receipt OCR (Dev Mode)

```typescript
// Add to .env
VITE_ENABLE_RECEIPT_OCR=true
VITE_GEMINI_API_KEY=your-key-here

// Use in app
if (import.meta.env.VITE_ENABLE_RECEIPT_OCR === 'true') {
  // Show receipt scanner
}
```

---

## 📞 Support

For questions about implementation:
- GitHub Issues: [fatpig-react/issues](https://github.com/yourusername/fatpig-react/issues)
- Documentation: [REACT_SERVICES.md](./REACT_SERVICES.md)

---

**Build the future of FATpig! 🐷🚀**
