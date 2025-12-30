// api/proxy.js
// Esta função roda no servidor da Vercel e esconde sua chave de API do público.

export default async function handler(req, res) {
    // Configuração de CORS para permitir que seu site acesse a API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { termo, categoria } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API não configurada no painel da Vercel.' });
    }

    const prompt = `Gere uma frase curta, inspiradora e original sobre "${termo}" para a categoria "${categoria}". Retorne obrigatoriamente apenas um JSON puro: {"frase": "...", "hashtags": ["#...", "#..."]}`;

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

        if (!textResponse) {
            throw new Error('Falha na resposta da IA');
        }

        res.status(200).json(JSON.parse(textResponse));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar a frase.' });
    }
}
