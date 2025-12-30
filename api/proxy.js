// api/proxy.js
export default async function handler(req, res) {
    // Cabeçalhos para permitir que seu site converse com essa função
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde rápido para pre-flight requests do navegador
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Bloqueia qualquer método que não seja POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { termo, categoria } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API não configurada na Vercel.' });
    }

    // MODELO CORRIGIDO: Removido "-latest" e sufixos instáveis.
    // "gemini-1.5-flash" é o identificador oficial atual.
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

        // Tratamento de erro específico do Google
        if (data.error) {
            console.error("Erro da API Google:", JSON.stringify(data.error, null, 2));
            // Se o flash falhar, uma mensagem clara é retornada
            return res.status(data.error.code || 500).json({ 
                error: "Erro na IA", 
                details: data.error.message 
            });
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('A IA não retornou texto válido.');
        }

        // Limpeza de segurança para garantir que é um JSON válido
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.status(200).json(JSON.parse(cleanJson));

    } catch (error) {
        console.error("Erro interno:", error);
        res.status(500).json({ error: 'Falha interna no servidor.', details: error.message });
    }
}