import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { authenticate } from '../../shared/middleware/authenticate'
import { uploadMiddleware } from '../../shared/middleware/upload'
import { AppError } from '../../shared/errors/AppError'
import { env } from '../../config/env'
import fs from 'fs'

export const receiptRouter = Router()

receiptRouter.use(authenticate)

const SYSTEM_PROMPT = `Eres un asistente especializado en leer tickets de compra y facturas.
Tu tarea es extraer todos los productos/artículos con sus precios del ticket.
Devuelve ÚNICAMENTE un JSON válido con este formato exacto, sin ningún texto adicional:
{
  "items": [
    { "name": "Nombre del producto", "price": "12.50" },
    { "name": "Otro producto", "price": "3.00" }
  ],
  "currency": "EUR",
  "total": "15.50"
}
Reglas:
- name: nombre limpio y legible del producto (no incluyas códigos ni referencias)
- price: precio unitario como string con 2 decimales (sin símbolo de moneda)
- Si hay varios iguales, créalos como ítems separados
- Ignora subtotales, descuentos, impuestos y totales (solo líneas de producto)
- Si no puedes leer algún precio claramente, omite ese producto
- currency: código ISO de la moneda detectada (EUR por defecto)`

receiptRouter.post(
  '/parse',
  uploadMiddleware.single('receipt'),
  async (req, res) => {
    if (!env.ANTHROPIC_API_KEY) {
      throw AppError.badRequest('OCR no configurado en este servidor')
    }

    if (!req.file) {
      throw AppError.badRequest('No se adjuntó ninguna imagen')
    }

    const imageData = fs.readFileSync(req.file.path)
    const base64 = imageData.toString('base64')
    const mimeType = req.file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp'

    // Limpiar archivo temporal después de leer
    fs.unlink(req.file.path, () => {})

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extrae todos los productos y precios de este ticket.',
            },
          ],
        },
      ],
      system: SYSTEM_PROMPT,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extraer JSON de la respuesta (puede venir con ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw AppError.unprocessable('PARSE_ERROR', 'No se pudieron extraer los productos del ticket')
    }

    const parsed = JSON.parse(jsonMatch[0])

    res.json({ data: parsed })
  },
)
