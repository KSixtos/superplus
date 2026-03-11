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
              text: `Eres un asistente experto en leer tickets de supermercado mexicanos. Analiza esta imagen y extrae TODOS los productos comprados.

═══ REGLA DE DESCUENTOS (crítica) ═══
En tickets mexicanos, los descuentos aparecen en la línea INMEDIATAMENTE DESPUÉS del producto con palabras como:
  DESCUENTO, DESC, AHORRO, PROMO, OFERTA, BONIF, DTO, PRECIO ESPECIAL
y el monto aparece con signo negativo: -15.00, -$15.00, $ -15.00, (15.00), etc.

CÓMO PROCESARLOS:
1. Lee el producto y su precio normal → "COCA COLA 2L  32.00"
2. Lee la siguiente línea → "DESCUENTO  -8.00"
3. Registra el producto con: price=32.00, discount=8.00
4. NO incluyas la línea del descuento como producto separado
5. Si hay múltiples descuentos seguidos para el mismo producto, suma todos

EJEMPLOS de líneas de descuento que debes reconocer:
  "AHORRO         -15.50"
  "DESC LEALTAD   -5.00"
  "PROMO 2X1      -32.00"
  "DESCUENTO       -8.00"
  "DTO CLIENTE     -3.50"

Mi catálogo de productos conocidos:
${productList}

Categorías disponibles: ${categorias}

Responde SOLO con JSON válido sin texto adicional ni markdown:
{"items":[{"name":"nombre en ticket","price":00.00,"qty":1,"discount":0.00,"matched":"nombre exacto del catálogo o null","category":"categoria_sugerida"}]}

Reglas:
- price: precio UNITARIO ORIGINAL (sin restar descuento)
- discount: valor ABSOLUTO del descuento (positivo, 0 si no hay)
- qty: cantidad comprada
- matched: nombre EXACTO del catálogo si coincide, si no null
- category: la más apropiada para el producto
- NO incluyas filas de impuestos, subtotales, totales ni cambio`
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
