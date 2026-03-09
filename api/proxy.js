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
        return res.status(500).json({ error: 'A chave API (GOOGLE_API_KEY) não foi encontrada nas variáveis da Vercel.' });
    }

    // CORREÇÃO: Utilizando o modelo 1.5-flash que é 100% estável e público
    const model = "gemini-1.5-flash"; 
    
    const prompt = `Gere uma frase curta e impactante sobre "${termo}" para a categoria "${categoria}". Retorne obrigatoriamente APENAS um JSON puro no formato: {"frase": "texto aqui", "hashtags": ["#tag1", "#tag2"]}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();

        // Tratamento de erros do Google
        if (data.error) {
            console.error("Erro Google:", JSON.stringify(data.error));
            return res.status(data.error.code || 500).json({ 
                error: `Erro da IA: ${data.error.message}` 
            });
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            return res.status(500).json({ error: 'A IA respondeu, mas não gerou texto válido.' });
        }

        // Limpeza de segurança (remove os ```json caso a IA os coloque)
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const jsonFinal = JSON.parse(cleanJson);
            res.status(200).json(jsonFinal);
        } catch (e) {
            console.error("Erro JSON:", textResponse);
            return res.status(500).json({ error: 'A IA não retornou um JSON válido. Tente novamente.' });
        }

    } catch (error) {
        console.error("Erro Servidor:", error);
        res.status(500).json({ error: `Erro interno: ${error.message}` });
    }
}