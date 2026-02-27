export default async function handler(req, res) {
    // Header CORS agar bisa dipanggil dari web-mu
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    // Tangani preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Wajib POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Cek keberadaan API Key OpenRouter
    if (!process.env.OPENROUTER_API_KEY) {
        console.error("API Key OpenRouter tidak ditemukan di Environment Variables Vercel.");
        return res.status(500).json({ error: 'Konfigurasi Server Belum Lengkap' });
    }

    try {
        const { topikMateri, instruksiKhusus } = req.body;

        // Pisahkan System Prompt (Identitas AI)
        const promptSystem = `Kamu adalah guru bahasa Indonesia yang asyik, interaktif, dan gaul untuk anak SMA kelas 10. 
Tugasmu membuat materi pembelajaran dalam format HTML mentah. 
HANYA gunakan tag <h3>, <p>, <ul>, <li>, <strong>, dan <em>. 
JANGAN gunakan tag <html>, <body>, atau <head>. 
JANGAN membalas menggunakan markdown backtick (\`\`\`html) sama sekali. Langsung output tag HTML-nya.`;

        // User Prompt (Perintah dari web)
        const promptUser = `Buatlah materi Teks Anekdot tentang: "${topikMateri}". 
Arahan tambahan: "${instruksiKhusus || 'Buat dengan gaya bahasa santai'}".`;

        // Memanggil API OpenRouter menggunakan fetch
        const response = await fetch("[https://openrouter.ai/api/v1/chat/completions](https://openrouter.ai/api/v1/chat/completions)", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "[https://anekdot-io.vercel.app](https://anekdot-io.vercel.app)", 
                "X-Title": "Anekdot IO"
            },
            body: JSON.stringify({
                // Opsional: Jika gemma-3 free sering error, kamu bisa ganti ke "google/gemini-2.5-flash:free"
                "model": "google/gemma-3-27b-it:free", 
                "messages": [
                    { "role": "system", "content": promptSystem },
                    { "role": "user", "content": promptUser }
                ]
            })
        });

        const data = await response.json();

        // Tangkap log error spesifik dari OpenRouter kalau gagal
        if (!response.ok) {
            console.error("OpenRouter API Error Details:", data);
            throw new Error(data.error?.message || "Server AI (OpenRouter) menolak permintaan.");
        }

        // Pastikan data ada sebelum mengambil teks
        if (data.choices && data.choices.length > 0) {
            let responseText = data.choices[0].message.content;
            
            // PEMBERSIHAN EXTRA: Hilangkan sisa markdown ```html dan ``` jika AI membandel
            responseText = responseText.replace(/```html/gi, '').replace(/```/g, '').trim();

            res.status(200).json({
                kontenHtml: responseText
            });
        } else {
            throw new Error("AI membalas dengan format kosong.");
        }

    } catch (error) {
        console.error('Error Generate Materi Backend:', error.message);
        res.status(500).json({ error: error.message || 'Gagal menghasilkan materi dari AI.' });
    }
}
