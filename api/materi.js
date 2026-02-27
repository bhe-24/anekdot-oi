export default async function handler(req, res) {
    // 1. Header CORS (Wajib ada)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'SERVER_INFO: Tolong gunakan metode POST.' });
    }

    // 2. CEK API KEY DULU
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("API KEY HILANG!");
        return res.status(500).json({ 
            error: 'API_KEY_HILANG: Kamu belum memasukkan OPENROUTER_API_KEY di menu Environment Variables Vercel.' 
        });
    }

    try {
        const { topikMateri, instruksiKhusus } = req.body;

        const promptSystem = `Kamu adalah guru bahasa Indonesia yang asyik untuk anak SMA kelas 10. 
Buatlah materi pembelajaran dalam format HTML mentah. 
HANYA gunakan tag <h3>, <p>, <ul>, <li>, <strong>. 
JANGAN gunakan tag <html> atau <body>. 
JANGAN membalas menggunakan markdown backtick (\`\`\`html).`;

        const promptUser = `Buat materi Teks Anekdot tentang: "${topikMateri}". Arahan: "${instruksiKhusus || 'Santai'}".`;

        // 3. MENGHUBUNGI OPENROUTER
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://anekdot-io.vercel.app", 
                "X-Title": "Anekdot IO"
            },
            body: JSON.stringify({
                "model": "google/gemma-3-27b-it:free", 
                "messages": [
                    { "role": "system", "content": promptSystem },
                    { "role": "user", "content": promptUser }
                ]
            })
        });

        const data = await response.json();

        // 4. CEK JIKA OPENROUTER MENOLAK (Error dari pihak OpenRouter)
        if (!response.ok) {
            console.error("OpenRouter Error:", data);
            return res.status(500).json({ 
                error: `OPENROUTER_ERROR: ${data.error?.message || 'Server OpenRouter menolak/penuh.'}` 
            });
        }

        // 5. JIKA BERHASIL
        if (data.choices && data.choices.length > 0) {
            let responseText = data.choices[0].message.content;
            
            // Bersihkan sisa markdown jika AI bandel
            responseText = responseText.replace(/```html/gi, '').replace(/```/g, '').trim();

            return res.status(200).json({ kontenHtml: responseText });
        } else {
            return res.status(500).json({ error: "AI_KOSONG: OpenRouter membalas tapi isinya kosong." });
        }

    } catch (error) {
        // 6. ERROR JARINGAN SERVER
        console.error('Error Internal Server:', error);
        return res.status(500).json({ error: `CRASH_SISTEM: ${error.message}` });
    }
}
