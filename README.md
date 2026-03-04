# 뉴스 키워드 검색

키워드를 입력하면 뉴스 기사 중 해당 키워드가 포함된 기사를 **뉴스사 · 제목 · 내용 요약 · 링크** 순으로 정리해 줍니다.  
요약은 OpenAI GPT를 사용할 수 있으며, API 키가 없으면 원문 일부를 그대로 표시합니다.

## 설정

1. **뉴스 API 키** (필수)  
   [newsapi.org](https://newsapi.org/) 에서 무료 키 발급 후 `.env`에 설정합니다.

2. **OpenAI API 키** (선택)  
   있으면 기사 내용을 GPT로 요약합니다. 없으면 원문 일부만 표시합니다.

```bash
# .env.example 을 복사해 .env 생성 후 키 입력
cp .env.example .env
# .env 편집: NEWS_API_KEY, OPENAI_API_KEY
```

## 실행

**터미널 1 – 백엔드**

```bash
npm run dev:server
```

**터미널 2 – 프론트**

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속 후 키워드를 입력해 검색하면 됩니다.

## API

- `POST /api/search`  
  Body: `{ "keyword": "검색어" }`  
  응답: `{ "results": [{ "source", "title", "summary", "link" }, ...] }`
