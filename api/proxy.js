// api/proxy.js
// Este ficheiro corre no servidor da Vercel para proteger a sua chave

export default async function handler(req, res) {
    // Configuração de CORS para aceitar pedidos do seu site
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde a pedidos de verificação (pre-flight)
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    // Apenas aceita método POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { termo, categoria } = req.body;
    
    // A chave deve estar configurada no painel da Vercel (Environment Variables)
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API em falta na Vercel.' });
    }

    // Modelo atualizado para a versão 2.5 Flash Preview
    const model = "gemini-2.5-flash-preview-09-2025"; 
    
    const prompt = `Gere uma frase curta, inspiradora e original sobre "${termo}" para a categoria "${categoria}". Retorne obrigatoriamente APENAS um JSON puro no formato: {"frase": "texto da frase", "hashtags": ["#tag1", "#tag2"]}`;

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

        // Se a Google devolver erro, mostramos no log da Vercel
        if (data.error) {
            console.error("Erro da Google:", JSON.stringify(data.error));
            return res.status(500).json({ 
                error: "Erro ao contactar a IA.", 
                details: data.error.message 
            });
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error('A IA não gerou texto válido.');
        }

        // Limpeza de segurança para garantir JSON válido
        const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.status(200).json(JSON.parse(cleanJson));

    } catch (error) {
        console.error("Erro interno:", error);
        res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
    }
}