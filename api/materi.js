// 1. TAMBAHKAN INI AGAR VERCEL TIDAK MEMUTUS PAKSA (TIMEOUT) DALAM 10 DETIK
export const maxDuration = 60; 

export default async function handler(req, res) {
    // 2. Header CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Harus menggunakan metode POST.' });
    }

    // 3. CEK API KEY
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API_KEY_HILANG: Kamu belum memasukkan OPENROUTER_API_KEY di Vercel.' });
    }

    try {
        const { topikMateri, instruksiKhusus } = req.body;

        const promptSystem = `Kamu adalah guru bahasa Indonesia yang asyik untuk anak SMA kelas 10. 
Buatlah materi pembelajaran dalam format HTML mentah. 
HANYA gunakan tag <h3>, <p>, <ul>, <li>, <strong>, dan <em>. 
JANGAN gunakan tag <html> atau <body>. 
JANGAN membalas menggunakan markdown backtick (\`\`\`html).`;

        const promptUser = `Buat materi Teks Anekdot tentang: "${topikMateri}". Arahan: "${instruksiKhusus || 'Santai'}".`;

        // 4. MENGHUBUNGI OPENROUTER DENGAN MODEL SUPER CEPAT
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://anekdot-io.vercel.app", 
                "X-Title": "Anekdot IO"
            },
            body: JSON.stringify({
                // PENTING: Pakai model Gemini Flash yang cuma butuh 2-3 detik buat mikir!
                "model": "google/gemini-2.5-flash:free", 
                "messages": [
                    { "role": "system", "content": promptSystem },
                    { "role": "user", "content": promptUser }
                ]
            })
        });

        // 5. JIKA OPENROUTER MENOLAK
        if (!response.ok) {
            const errData = await response.json();
            return res.status(500).json({ 
                error: `OPENROUTER_DITOLAK: ${errData.error?.message || 'Server AI penuh/mati.'}` 
            });
        }

        const data = await response.json();

        // 6. JIKA BERHASIL MENDAPATKAN TEKS
        if (data.choices && data.choices.length > 0) {
            let responseText = data.choices[0].message.content;
            
            // Pembersihan markdown yang sering bocor dari AI
            responseText = responseText.replace(/```html/gi, '').replace(/```/g, '').trim();

            return res.status(200).json({ kontenHtml: responseText });
        } else {
            return res.status(500).json({ error: "AI_KOSONG: AI merespons tapi tidak ada teksnya." });
        }

    } catch (error) {
        return res.status(500).json({ error: `SISTEM_CRASH: ${error.message}` });
    }
}
