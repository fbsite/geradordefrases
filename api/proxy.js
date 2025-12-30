// api/proxy.js
export default async function handler(req, res) {
    // Configuração de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { termo, categoria } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Variável GOOGLE_API_KEY não encontrada na Vercel.' });
    }

    // Usando gemini-1.5-flash que é a versão estável e gratuita mais rápida para API pública
    const model = "gemini-1.5-flash";
    const prompt = `Gere uma frase curta e impactante sobre "${termo}" para a categoria "${categoria}". Retorne APENAS um JSON puro no formato: {"frase": "texto aqui", "hashtags": ["#tag1", "#tag2"]}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                    responseMimeType: "application/json",
                    temperature: 0.7
                }
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Erro na API do Google:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('IA retornou uma resposta vazia.');
        }

        // Limpeza de segurança: remove blocos de código markdown se a IA os incluir por engano
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.status(200).json(JSON.parse(cleanJson));

    } catch (error) {
        console.error("Erro interno no Proxy:", error);
        res.status(500).json({ error: 'Erro ao processar a requisição.', details: error.message });
    }
}
