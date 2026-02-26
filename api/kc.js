const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi Gemini dengan API Key dari Environment Variable Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
    // Pengaturan CORS (Agar API bisa diakses dari frontend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Jika method OPTIONS (Preflight request dari browser), langsung kembalikan status 200
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Pastikan request menggunakan method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { teks, kataKunci } = req.body;

        if (!teks) {
            return res.status(400).json({ error: 'Teks anekdot tidak boleh kosong' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Prompt rahasia untuk AI (Siswa tidak bisa melihat ini)
        const promptSystem = `
        Kamu adalah seorang Guru Bahasa Indonesia yang ahli dalam Teks Anekdot. 
        Tugasmu adalah menilai teks anekdot buatan siswa SMA.
        
        Kata kunci yang harus ada di dalam teks: ${kataKunci ? kataKunci.join(', ') : 'Tidak ada'}.
        Teks buatan siswa: "${teks}"

        Berikan penilaian dengan kriteria:
        1. Ada unsur lucu/menggelitik.
        2. Ada unsur sindiran/kritikan.
        3. Menggunakan kata kunci yang diminta.
        
        Kembalikan HANYA dalam format JSON persis seperti ini, tanpa markdown atau teks tambahan apapun:
        {
            "skor": <angka 0-100>,
            "komentar": "<komentar membangun, singkat, hangat, dan beri tahu apa yang kurang>"
        }
        `;

        const result = await model.generateContent(promptSystem);
        const responseText = result.response.text();
        
        // Membersihkan output AI kalau-kalau ada markdown ```json ... ```
        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanJsonStr);

        // Kirim hasil kembali ke frontend
        res.status(200).json({
            skor: aiData.skor,
            komentar: aiData.komentar
        });

    } catch (error) {
        console.error('Error saat memanggil AI:', error);
        res.status(500).json({ 
            error: 'AI sedang sibuk atau terjadi kesalahan internal.',
            details: error.message
        });
    }
}
