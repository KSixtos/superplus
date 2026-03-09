  export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, mediaType, products } = req.body;
    const productList = products.map(p => `- ${p.name}${p.brand ? ` (${p.brand})` : ""}`).join("\n");
    const categorias = "frutas, lacteos, carnes, panaderia, abarrotes, limpieza, bebidas, congelados, farmacia, otro";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 }
            },
            {
              type: "text",
              text: `Eres un asistente experto en leer tickets de supermercado mexicanos. Analiza esta imagen y extrae TODOS los productos.

REGLA DE DESCUENTOS (muy importante):
- Si una línea inmediatamente después de un producto dice "DESCUENTO", "DESC", "AHORRO", "PROMO" y tiene un monto con signo negativo (-) o símbolo de resta, ese monto se resta al precio del producto anterior.
- El campo "discount" debe tener el valor ABSOLUTO del descuento (número positivo). Si no hay descuento, pon 0.
- El campo "price" siempre es el precio ORIGINAL antes del descuento.

Mi catálogo de productos conocidos:
${productList}

Categorías disponibles: ${categorias}

Responde SOLO con JSON válido sin texto adicional ni markdown:
{"items":[{"name":"nombre en ticket","price":00.00,"qty":1,"discount":0.00,"matched":"nombre exacto del catálogo o null","category":"categoria_sugerida"}]}

Reglas adicionales:
- price es precio UNITARIO original
- qty es cantidad comprada
- discount es el descuento aplicado (número positivo, 0 si no hay)
- matched: nombre EXACTO de mi catálogo si es el mismo producto, null si no
- category: elige la más apropiada según el nombre del producto
- NO incluyas líneas que sean solo descuentos, impuestos, subtotales o totales`
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
