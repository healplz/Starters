import { shortName } from '@/lib/categories'

/** Draw the current card onto a canvas and return a blob. Always timer-free. */
export function renderCardToBlob(
  question: string,
  categoryName: string,
): Promise<Blob | null> {
  const CARD_W = 520
  const CARD_H = Math.round(CARD_W * (7 / 5)) // 5:7 aspect ratio
  const MARGIN = 44
  const HEADER_H = 70
  const WIDTH = CARD_W + MARGIN * 2
  const HEIGHT = CARD_H + MARGIN * 2 + HEADER_H

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!

  // Dark navy page background
  ctx.fillStyle = '#080B81'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Subtle geometric diamond pattern (matching the page bg)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  const diamondSize = 60
  for (let row = -1; row < Math.ceil(HEIGHT / diamondSize) + 1; row++) {
    for (let col = -1; col < Math.ceil(WIDTH / diamondSize) + 1; col++) {
      const x = col * diamondSize + (row % 2) * (diamondSize / 2)
      const y = row * diamondSize * 0.5
      ctx.beginPath()
      ctx.moveTo(x, y + diamondSize * 0.25)
      ctx.lineTo(x + diamondSize * 0.5, y)
      ctx.lineTo(x + diamondSize, y + diamondSize * 0.25)
      ctx.lineTo(x + diamondSize * 0.5, y + diamondSize * 0.5)
      ctx.closePath()
      ctx.fill()
    }
  }

  const cardX = MARGIN
  const cardY = MARGIN + HEADER_H

  // Card shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 6
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, CARD_W, CARD_H, 12)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // Card interior
  const PAD = 36
  const textX = cardX + PAD
  const textY = cardY + PAD
  const textWidth = CARD_W - PAD * 2

  // Question text
  ctx.fillStyle = '#000000'
  ctx.textBaseline = 'top'

  const fontSize = 24
  ctx.font = `700 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`

  // Word-wrap the question
  const words = question.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word
    const metrics = ctx.measureText(test)
    if (metrics.width > textWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = test
    }
  }
  if (currentLine) lines.push(currentLine)

  const lineHeight = fontSize * 1.35
  const questionHeight = lines.length * lineHeight
  const maxQuestionArea = CARD_H - PAD * 2 - 40
  const startY = textY + Math.min(0, (maxQuestionArea - questionHeight) / 2)

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, startY + i * lineHeight)
  }

  // Category name at bottom of card
  const shortCat = shortName(categoryName)
  ctx.font = `700 12px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = '#000000'
  ctx.fillText(shortCat.toUpperCase(), textX, cardY + CARD_H - PAD)

  // "Starters" branding in the header area
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `700 18px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText('STARTERS', WIDTH / 2, MARGIN + HEADER_H / 2)

  // Small diamond accent next to branding
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = `14px sans-serif`
  ctx.fillText('✦', WIDTH / 2 - 60, MARGIN + HEADER_H / 2)
  ctx.textAlign = 'left'

  const { promise, resolve } = Promise.withResolvers<Blob | null>()
  canvas.toBlob((blob) => resolve(blob), 'image/png')
  return promise
}