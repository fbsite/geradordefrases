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
        return res.status(500).json({ error: 'Variável GOOGLE_API_KEY não configurada na Vercel.' });
    }

    // Ajustado para o ID de modelo mais estável do Google
    const modelId = "gemini-1.5-flash-latest";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const prompt = `Gere uma frase curta e impactante sobre "${termo}" para a categoria "${categoria}". Retorne obrigatoriamente APENAS um JSON puro no formato: {"frase": "texto aqui", "hashtags": ["#tag1", "#tag2"]}`;

    try {
        const response = await fetch(apiUrl, {
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
        
        // Se o Google retornar erro (como o 404 anterior), repassamos o erro detalhado
        if (data.error) {
            console.error("Erro reportado pelo Google:", data.error);
            return res.status(data.error.code || 500).json({ 
                error: "IA Temporariamente indisponível", 
                details: data.error.message 
            });
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('A IA não gerou conteúdo para estes termos.');
        }

        // Limpeza de blocos de código markdown que a IA às vezes insere
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.status(200).json(JSON.parse(cleanJson));

    } catch (error) {
        console.error("Erro Crítico no Servidor:", error);
        res.status(500).json({ error: 'Erro ao processar a frase.', details: error.message });
    }
}