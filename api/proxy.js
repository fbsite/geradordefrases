// api/proxy.js - Mantenha este arquivo na pasta /api do seu projeto Vercel
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { termo, categoria } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Configure a GOOGLE_API_KEY na Vercel.' });

    const prompt = `Gere uma frase curta, original e impactante sobre "${termo}" para a categoria "${categoria}". Retorne obrigatoriamente apenas um JSON: {"frase": "...", "hashtags": ["#...", "#..."]}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        res.status(200).json(JSON.parse(textResponse));
    } catch (error) {
        res.status(500).json({ error: 'Erro na comunicação com a IA.' });
    }
}