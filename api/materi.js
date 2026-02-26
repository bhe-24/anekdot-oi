const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
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
        // Menerima instruksi (prompt) dari database/admin
        const { topikMateri, instruksiKhusus } = req.body;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const promptSystem = `
        Kamu adalah penulis materi edukasi digital yang sangat asyik dan interaktif untuk anak SMA kelas 10.
        Buatlah materi pembelajaran Teks Anekdot tentang: "${topikMateri}".
        Arahan tambahan dari admin: "${instruksiKhusus || 'Buat dengan gaya bahasa santai dan mudah dipahami'}".

        Gunakan format HTML secara langsung (gunakan tag <h3>, <p>, <ul>, <li>, <strong>, dll) agar teks langsung rapi saat ditampilkan di web. Jangan gunakan tag <html> atau <body>, cukup isi kontennya saja.
        `;

        const result = await model.generateContent(promptSystem);
        const responseText = result.response.text();

        res.status(200).json({
            kontenHtml: responseText
        });

    } catch (error) {
        console.error('Error Generate Materi:', error);
        res.status(500).json({ error: 'Gagal menghasilkan materi dari AI.' });
    }
}
