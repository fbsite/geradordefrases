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

    // Lista inteligente de modelos: do mais recente para o mais genérico e antigo
    // O código vai testar um por um até a sua chave de API aceitar
    const modelosParaTestar = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-pro"
    ];
    
    const prompt = `Gere uma frase curta e impactante sobre "${termo}" para a categoria "${categoria}". Retorne obrigatoriamente APENAS um JSON puro no formato: {"frase": "texto aqui", "hashtags": ["#tag1", "#tag2"]}`;

    for (const model of modelosParaTestar) {
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

            // Se der erro 404 (not found), o loop ignora e pula para o PRÓXIMO modelo da lista
            if (data.error) {
                if (data.error.code === 404) {
                    console.log(`Tentativa falhou para ${model}, tentando o próximo...`);
                    continue; 
                }
                // Se for outro erro (ex: limite de uso, chave bloqueada), para e avisa o usuário
                return res.status(data.error.code || 500).json({ 
                    error: `Erro na IA (${model}): ${data.error.message}` 
                });
            }

            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                return res.status(500).json({ error: 'A IA respondeu, mas não gerou texto válido.' });
            }

            // Limpeza de segurança (remove markdown de código)
            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            
            const jsonFinal = JSON.parse(cleanJson);
            
            // SE DEU CERTO: Retorna o resultado para o site e encerra a função na hora
            return res.status(200).json(jsonFinal);

        } catch (error) {
            console.error(`Erro ao tentar o modelo ${model}:`, error);
        }
    }

    // Se o código chegou aqui, significa que TODOS os modelos deram erro 404 na sua chave
    return res.status(500).json({ 
        error: `Sua chave de API não possui acesso aos modelos de texto do Gemini. Crie uma nova chave no Google AI Studio.` 
    });
}