import axios from 'axios'
import OpenAI from 'openai'

const PLACEHOLDER_PREFIX = '\u0000Q'
const PLACEHOLDER_SUFFIX = '\u0000'

/**
 * 검색 규칙을 News API q 파라미터 형식으로 변환
 * - "구문" : 반드시 포함되는 정확한 구문
 * - A & B : A와 B가 모두 포함 (AND)
 * - A or B : A 또는 B 포함 (OR)
 */
function buildNewsApiQuery(userInput) {
  const trimmed = userInput.trim()
  if (!trimmed) return ''

  const phrases = []
  let work = trimmed

  // 1. "..." 구문 추출 후 플레이스홀더로 치환
  work = work.replace(/"([^"]*)"/g, (_, phrase) => {
    const idx = phrases.length
    phrases.push(phrase.trim())
    return `${PLACEHOLDER_PREFIX}${idx}${PLACEHOLDER_SUFFIX}`
  })

  const restorePhrases = (str) => {
    let s = str.trim()
    phrases.forEach((p, i) => {
      s = s.replace(`${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`, `"${p}"`)
    })
    return s.trim()
  }

  // 2. or 로 나누기 (OR 그룹)
  const orGroups = work.split(/\s+or\s+/i).map((s) => s.trim()).filter(Boolean)

  const orParts = []
  for (const orPart of orGroups) {
    // 3. & 로 나누기 (AND 항목)
    const andTerms = orPart.split(/\s*&\s*/).map(restorePhrases).filter(Boolean)
    if (andTerms.length === 0) continue
    if (andTerms.length === 1) {
      orParts.push(andTerms[0])
    } else {
      orParts.push(`(${andTerms.join(' AND ')})`)
    }
  }

  if (orParts.length === 0) return trimmed
  if (orParts.length === 1) return orParts[0]
  return orParts.join(' OR ')
}

/**
 * 뉴스 API로 키워드 검색 (newsapi.org)
 * @param {number} days - 검색 기간 (1~30일)
 */
async function fetchNews(keyword, days = 7) {
  const newsApiKey = process.env.NEWS_API_KEY
  if (!newsApiKey) {
    throw new Error('NEWS_API_KEY가 설정되지 않았습니다. .env 파일을 확인해 주세요.')
  }

  const q = buildNewsApiQuery(keyword) || keyword.trim()

  const rangeDays = Math.min(30, Math.max(1, Number(days) || 7))
  const from = new Date()
  from.setDate(from.getDate() - rangeDays)
  const fromStr = from.toISOString().split('T')[0]

  try {
    const { data } = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q,
        from: fromStr,
        sortBy: 'publishedAt',
        pageSize: 10,
        language: 'ko',
        apiKey: newsApiKey,
      },
    })

    if (data.status !== 'ok') {
      throw new Error(data.message || '뉴스 검색에 실패했습니다.')
    }

    return (data.articles || []).map((a) => ({
      source: a.source?.name || '알 수 없음',
      title: a.title || '(제목 없음)',
      description: a.description || a.content || '',
      link: a.url || '',
      publishedAt: a.publishedAt,
    }))
  } catch (err) {
    if (err.response?.status === 426) {
      throw new Error(
        'News API 무료 플랜은 localhost에서만 사용할 수 있습니다. 다른 서버에 배포한 경우 426이 발생합니다. 로컬에서 실행하거나 유료 플랜을 이용해 주세요.'
      )
    }
    if (err.response?.status === 429) {
      throw new Error(
        '요청 한도를 초과했습니다. 잠시 후 다시 검색해 주세요. (무료 플랜: 하루 100회 제한)'
      )
    }
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message)
    }
    throw err
  }
}

/**
 * GPT로 기사 내용 요약 (2~3문장)
 * OPENAI_API_KEY가 있으면 반드시 GPT 사용, 없으면 원문 일부 사용
 */
async function summarizeWithGPT(title, description) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return description ? description.slice(0, 200) + (description.length > 200 ? '…' : '') : '(요약 없음)'
  }

  const text = [title, description].filter(Boolean).join('\n')
  if (!text.trim()) return '(요약 없음)'

  const openai = new OpenAI({ apiKey })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '당신은 뉴스 요약 전문가입니다. 주어진 뉴스 제목과 본문 내용을 바탕으로 기사의 핵심만 2~3문장으로 간결하게 요약해 주세요. 한국어로만 답하고, 다른 설명은 붙이지 마세요.',
        },
        { role: 'user', content: text.slice(0, 4000) },
      ],
      max_tokens: 250,
    })

    const summary = completion.choices[0]?.message?.content?.trim()
    return summary || description?.slice(0, 200) || '(요약 없음)'
  } catch (err) {
    console.warn('GPT 요약 실패, 원문 사용:', err.message)
    return description ? description.slice(0, 200) + (description.length > 200 ? '…' : '') : '(요약 없음)'
  }
}

/**
 * 키워드로 뉴스 검색 후 요약까지 한 번에 수행
 */
export async function searchNewsWithSummary(keyword, days = 7) {
  const articles = await fetchNews(keyword, days)
  const results = []

  for (const article of articles) {
    const summary = await summarizeWithGPT(article.title, article.description)
    results.push({
      source: article.source,
      title: article.title,
      summary,
      link: article.link,
      publishedAt: article.publishedAt,
    })
  }

  return results
}
