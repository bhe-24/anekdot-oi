export default async function handler(req, res) {
    // Header CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { topikMateri, instruksiKhusus } = req.body;

        const promptSystem = `
            Kamu adalah penulis materi edukasi digital yang sangat asyik dan interaktif untuk anak SMA kelas 10.
            Buatlah materi pembelajaran Teks Anekdot tentang: "${topikMateri}".
            Arahan tambahan dari admin: "${instruksiKhusus || 'Buat dengan gaya bahasa santai dan mudah dipahami'}".

            Gunakan format HTML secara langsung (gunakan tag <h3>, <p>, <ul>, <li>, <strong>, dll) agar teks langsung rapi saat ditampilkan di web. Jangan gunakan tag <html> atau <body>, cukup isi kontennya saja.
        `;

        // Memanggil API OpenRouter menggunakan fetch
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, // Gunakan Env Var baru
                "Content-Type": "application/json",
                // Opsional: Agar aplikasi kamu terdata di OpenRouter
                "HTTP-Referer": "https://pustaka-materi.vercel.app", 
                "X-Title": "Pustaka Materi AI"
            },
            body: JSON.stringify({
                "model": "google/gemma-3-27b-it:free", // Model gratis dari Google via OpenRouter
                "messages": [
                    { "role": "user", "content": promptSystem }
                ]
            })
        });

        const data = await response.json();

        // Pastikan data ada sebelum mengambil teks
        if (data.choices && data.choices.length > 0) {
            const responseText = data.choices[0].message.content;
            res.status(200).json({
                kontenHtml: responseText
            });
        } else {
            throw new Error(data.error?.message || "Gagal mendapatkan respon dari AI");
        }

    } catch (error) {
        console.error('Error Generate Materi:', error);
        res.status(500).json({ error: 'Gagal menghasilkan materi dari AI.' });
    }
}
