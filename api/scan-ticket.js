export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, mediaType, products } = req.body;
    const productList = products.map(p => `- ${p.name}${p.brand ? ` (${p.brand})` : ""}`).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 }
            },
            {
              type: "text",
              text: `Eres un asistente que lee tickets de supermercado. Analiza esta imagen y extrae TODOS los productos con sus precios y cantidades.

Mi catálogo de productos:
${productList}

Responde SOLO con JSON válido, sin texto adicional ni markdown:
{"items":[{"name":"nombre en ticket","price":00.00,"qty":1,"matched":"nombre exacto del catálogo o null"}]}

Reglas:
- price es precio UNITARIO
- qty es cantidad comprada  
- matched: usa el nombre EXACTO de mi catálogo si es el mismo producto, si no pon null
- Incluye TODOS los productos del ticket`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error procesando el ticket", detail: e.message });
  }
}
