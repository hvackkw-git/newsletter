import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { searchNewsWithSummary } from './search.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const hasGptKey = !!process.env.OPENAI_API_KEY?.trim()
console.log(hasGptKey ? 'GPT 요약: 사용 가능' : 'GPT 요약: 미설정 (원문 일부 사용). .env에 OPENAI_API_KEY를 넣으면 GPT 요약이 적용됩니다.')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.post('/api/search', async (req, res) => {
  const keyword = req.body?.keyword?.trim()
  if (!keyword) {
    return res.status(400).json({ error: '키워드를 입력해 주세요.' })
  }

  let days = Number(req.body?.days)
  if (!Number.isFinite(days) || days < 1) days = 7
  if (days > 30) days = 30

  try {
    const results = await searchNewsWithSummary(keyword, days)
    res.json({ results })
  } catch (err) {
    console.error('Search error:', err)
    const message = err.message || '검색 중 오류가 발생했습니다.'
    res.status(500).json({ error: message })
  }
})

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`)
})
