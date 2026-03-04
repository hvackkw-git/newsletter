import { useState } from 'react'
import './App.css'

const API_BASE = '/api'
const PAGE_SIZE = 10

function App() {
  const [keyword, setKeyword] = useState('')
  const [searchDays, setSearchDays] = useState(7)
  const [results, setResults] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [organizedList, setOrganizedList] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!keyword.trim()) return
    setError(null)
    setIsSearching(true)
    setResults([])

    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          days: Math.min(30, Math.max(1, Number(searchDays) || 7)),
        }),
      })

      const text = await res.text()
      if (!text) {
        throw new Error(
          '서버에서 응답이 없습니다. 터미널에서 "npm run dev:server"로 백엔드 서버를 먼저 실행해 주세요.'
        )
      }

      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          '서버 응답 형식이 올바르지 않습니다. 백엔드 서버(npm run dev:server)가 실행 중인지 확인해 주세요.'
        )
      }

      if (!res.ok) {
        throw new Error(data.error || '검색에 실패했습니다.')
      }
      setResults(data.results || [])
      setCurrentPage(1)
      setExpandedIds(new Set())
      setSelectedIds(new Set())
    } catch (err) {
      if (err.message?.includes('서버') || err.message?.includes('응답')) {
        setError(err.message)
      } else if (err.name === 'TypeError' && err.message?.includes('fetch')) {
        setError(
          '서버에 연결할 수 없습니다. 터미널에서 "npm run dev:server"로 백엔드 서버를 먼저 실행해 주세요.'
        )
      } else {
        setError(err.message || '검색 중 오류가 발생했습니다.')
      }
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="app">
      <button
        type="button"
        className="floating-organize-btn"
        onClick={() => {
          const sorted = [...selectedIds].sort((a, b) => a - b)
          setOrganizedList((prev) => {
            const existingLinks = new Set(prev.map((o) => o.link))
            const toRemove = new Set()
            results.forEach((r, idx) => {
              if (!selectedIds.has(idx) && existingLinks.has(r.link)) toRemove.add(r.link)
            })
            let next = prev.filter((o) => !toRemove.has(o.link))
            const linksInNext = new Set(next.map((o) => o.link))
            const toAdd = sorted
              .filter((idx) => !linksInNext.has(results[idx].link))
              .map((idx) => results[idx])
            toAdd.forEach((item) => {
              next.push({ no: next.length + 1, source: item.source, title: item.title, link: item.link })
            })
            return next.map((item, i) => ({ ...item, no: i + 1 }))
          })
        }}
        aria-label="정리하기"
      >
        정리하기
      </button>
      <header className="header">
        <h1 className="title">뉴스 키워드 검색</h1>
        <p className="subtitle">
          키워드를 입력하면 매일의 뉴스 기사 중 해당 키워드가 포함된 기사를 찾아, 뉴스사·제목·요약·링크로 정리해 드립니다.
        </p>
      </header>

      <main className="main">
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-wrap">
            <input
              type="text"
              className="search-input"
              placeholder='예: "서울시" & 에너지 or 재생에너지'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              autoFocus
              aria-label="검색 키워드"
              disabled={isSearching}
            />
            <button type="submit" className="search-btn" disabled={isSearching}>
              {isSearching ? '검색 중…' : '검색'}
            </button>
          </div>
          <p className="search-rules">
            <span className="search-rules-label">검색 규칙:</span>{' '}
            <code>"구문"</code> 반드시 포함 · <code>A & B</code> 모두 포함 · <code>A or B</code> 하나만 있어도 검색
          </p>
          <div className="search-range">
            <label htmlFor="search-days" className="search-range-label">
              검색 범위
            </label>
            <div className="search-range-inputs">
              <input
                id="search-days"
                type="number"
                min={1}
                max={30}
                value={searchDays}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isFinite(v)) return
                  setSearchDays(Math.min(30, Math.max(1, v)))
                }}
                onBlur={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isFinite(v) || v < 1) setSearchDays(1)
                  else if (v > 30) setSearchDays(30)
                }}
                className="search-days-input"
                disabled={isSearching}
                aria-label="검색 기간 (일)"
              />
              <span className="search-range-unit">일</span>
            </div>
            <span className="search-range-hint">최소 1일 ~ 최대 30일</span>
          </div>
        </form>

        {organizedList.length > 0 && (
          <section className="organized-section" aria-label="정리 결과">
            <h2 className="organized-title">정리 결과</h2>
            <ol className="organized-list">
              {organizedList.map((item) => (
                <li key={item.link} className="organized-item">
                  <span className="organized-no">{item.no}.</span>
                  <span className="organized-source">[{item.source}]</span>{' '}
                  <span className="organized-title-text">{item.title}</span>{' '}
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="organized-link">
                    {item.link}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {error && (
          <div className="results-error" role="alert">
            {error}
          </div>
        )}

        <section className="results-section" aria-label="검색 결과">
          {results.length > 0 ? (
            <>
              <ul className="result-list">
                {(() => {
                  const totalPages = Math.ceil(results.length / PAGE_SIZE)
                  const start = (currentPage - 1) * PAGE_SIZE
                  const pageResults = results.slice(start, start + PAGE_SIZE)
                  return pageResults.map((item, idx) => {
                    const realIndex = start + idx
                    const isExpanded = expandedIds.has(realIndex)
                    return (
                      <li key={realIndex} className="result-card">
                        <div className="result-card-inner">
                          <input
                            type="checkbox"
                            id={`result-cb-${realIndex}`}
                            className="result-checkbox"
                            checked={
                              selectedIds.has(realIndex) ||
                              organizedList.some((o) => o.link === item.link)
                            }
                            onChange={() => {
                              const isInOrganized = organizedList.some((o) => o.link === item.link)
                              if (selectedIds.has(realIndex) || isInOrganized) {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev)
                                  next.delete(realIndex)
                                  return next
                                })
                                if (isInOrganized) {
                                  setOrganizedList((prev) =>
                                    prev.filter((o) => o.link !== item.link).map((o, i) => ({ ...o, no: i + 1 }))
                                  )
                                }
                              } else {
                                setSelectedIds((prev) => new Set(prev).add(realIndex))
                              }
                            }}
                            aria-label={`${item.title} 선택`}
                          />
                          <div className="result-card-content">
                            <div className="result-card-header">
                              <span className="result-source">{item.source}</span>
                              <button
                            type="button"
                            className="result-toggle-btn"
                            onClick={() => {
                              setExpandedIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(realIndex)) next.delete(realIndex)
                                else next.add(realIndex)
                                return next
                              })
                            }}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? '내용 접기' : '내용 보기'}
                          >
                            {isExpanded ? '내용 접기' : '내용 보기'}
                          </button>
                        </div>
                        <h3 className="result-title">
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="result-link">
                            {item.title}
                          </a>
                        </h3>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="result-link-text"
                        >
                          {item.link}
                        </a>
                        {isExpanded && <p className="result-summary">{item.summary}</p>}
                          </div>
                        </div>
                      </li>
                    )
                  })
                })()}
              </ul>
              {Math.ceil(results.length / PAGE_SIZE) > 1 && (
                <nav className="pagination" aria-label="페이지 이동">
                  {Array.from({ length: Math.ceil(results.length / PAGE_SIZE) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`pagination-btn ${currentPage === page ? 'pagination-btn--current' : ''}`}
                      onClick={() => setCurrentPage(page)}
                      aria-current={currentPage === page ? 'page' : undefined}
                      aria-label={`${page}페이지`}
                    >
                      [{page}]
                    </button>
                  ))}
                </nav>
              )}
            </>
          ) : (
            <div className="results-empty">
              <p>
                키워드를 입력하고 검색하면 해당 키워드가 포함된 뉴스 기사가
                <strong> 뉴스사 · 제목 · 내용 요약 · 링크</strong> 순으로 표시됩니다.
                <br />
                (GPT를 사용하면 요약이 더 간결해집니다.)
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
