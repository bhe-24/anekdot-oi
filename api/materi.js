const { GoogleGenerativeAI } = require("@google/generative-ai");

// Tambahkan ini agar Vercel memberi waktu proses lebih lama (maksimal 60 detik)
export const maxDuration = 60; 

module.exports = async function handler(req, res) {
    // Pengaturan CORS (Agar API bisa diakses dari frontend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Jika method OPTIONS (Preflight request dari browser)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Pastikan API Key ada
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY belum dipasang di Vercel.' });
    }

    try {
        const { topikMateri, instruksiKhusus } = req.body;

        if (!topikMateri) {
            return res.status(400).json({ error: 'Topik materi tidak boleh kosong' });
        }

        // Inisialisasi Gemini dengan API Key
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Menggunakan model flash yang super cepat
        const model = genAI.getGenerativeModel({ model: "gemma-3-24b" });

        // Prompt khusus untuk menyusun materi
        const promptSystem = `
        Kamu adalah Guru Bahasa Indonesia yang asyik dan gaul untuk anak SMA kelas 10.
        Buatlah materi pembelajaran tentang: "${topikMateri}".
        Arahan tambahan: "${instruksiKhusus}".
        
        Wajib gunakan HANYA format HTML mentah (gunakan tag <h3>, <p>, <ul>, <li>, <strong>, <em>).
        JANGAN gunakan tag <html>, <body>, atau markdown backtick (\`\`\`html).
        Langsung berikan elemen HTML-nya agar bisa langsung dirender di web.
        `;

        const result = await model.generateContent(promptSystem);
        let responseText = result.response.text();
        
        // Membersihkan output AI kalau-kalau ada markdown yang bocor
        responseText = responseText.replace(/```html/gi, '').replace(/```/g, '').trim();

        // Kirim hasil HTML kembali ke frontend materi.html
        res.status(200).json({
            kontenHtml: responseText
        });

    } catch (error) {
        console.error('Error saat memanggil AI Gemini:', error);
        res.status(500).json({ 
            error: 'AI sedang sibuk atau terjadi kesalahan internal.',
            details: error.message
        });
    }
};
