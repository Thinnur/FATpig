import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const AIService = {
  async parseTransaction(text: string, categories: string[]) {
    if (!API_KEY) {
      throw new Error("API Key Gemini belum diatur di file .env");
    }

    console.log("Using API Key:", API_KEY.substring(0, 10) + "...");
    console.log("Categories:", categories);

    const genAI = new GoogleGenerativeAI(API_KEY);
    // Use gemini-pro (stable model)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Filter out Sisa-* categories
    const validCategories = categories.filter((c) => !c.startsWith("Sisa-"));

    const prompt = `Analisis teks transaksi keuangan: "${text}"

Kategori tersedia: ${
      validCategories.length > 0 ? validCategories.join(", ") : "Lainnya"
    }

Tugas:
1. Tentukan tipe: 'pengeluaran' atau 'pemasukan'
2. Ekstrak nominal (angka saja)
3. Pilih kategori yang cocok atau 'Lainnya'
4. Buat keterangan singkat

Balas HANYA dengan JSON (tanpa backtick/markdown):
{"tipe":"pengeluaran","nominal":15000,"kategori":"Makan siang","keterangan":"Ayam goreng"}`;

    try {
      console.log("Sending to Gemini...");
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      console.log("AI Raw Response:", textResponse);

      // Bersihkan format JSON
      let cleanJson = textResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/\n/g, "")
        .trim();

      // Try to extract JSON if wrapped in other text
      const jsonMatch = cleanJson.match(/\{[^}]+\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      console.log("Cleaned JSON:", cleanJson);

      const parsed = JSON.parse(cleanJson);

      // Validate required fields
      if (!parsed.tipe || !parsed.nominal || !parsed.kategori) {
        throw new Error("Response tidak lengkap");
      }

      return parsed;
    } catch (error: any) {
      console.error("Error AI Detail:", error);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);

      // More specific error messages
      if (error.message?.includes("API_KEY")) {
        throw new Error(
          "API Key tidak valid. Periksa kembali di Google AI Studio."
        );
      }
      if (error.message?.includes("quota")) {
        throw new Error("Kuota API habis. Coba lagi besok atau upgrade plan.");
      }
      if (error.message?.includes("JSON")) {
        throw new Error("Gagal parse response AI. Coba input lebih spesifik.");
      }

      throw new Error(`Gagal AI: ${error.message || "Unknown error"}`);
    }
  },
};
