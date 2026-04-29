# Design Spec: Módulo de Investimentos

**Versão:** 1.0  
**Data:** 2026-04-29  
**Sprint alvo:** 8 (portfólio manual + cotações reais) e 9 (PDF import)  
**Estado:** Aprovado — pronto para implementação

---

## Contexto e Motivação

O módulo de investimentos já tem a tabela `investments` e um router CRUD básico, mas:

1. O `PUT /api/investments/:id` só atualizava 4 dos 12 campos — corrigido no Sprint 4b.
2. Não há cotações reais — P&L e valores atuais usam `purchase_price` estático.
3. Não há forma de importar um extrato de corretora — o utilizador insere tudo à mão.

O Sprint 8 adiciona cotações em tempo real via APIs públicas (Polygon.io + CoinGecko) e um cache Redis para controlar rate limits. O Sprint 9 adiciona importação de PDF de Degiro, XTB e Trade Republic.

---

## Sprint 8 — Portfólio Manual + Cotações Reais

### 1. Arquitetura Geral

```
InvestmentsPage
     │
     ├── useInvestments()        ← já existe, lista portfólio
     ├── useMarketData(tickers)  ← NOVO, cotações em batch
     └── useMarketHistory(tick)  ← NOVO, histórico 30d/1y

useMarketData → GET /api/market/quote/:ticker → marketDataService → Polygon.io / CoinGecko
                                                                   ↕ cache Redis 15 min
useMarketHistory → GET /api/market/history/:ticker?period=30d
```

### 2. Providers de Market Data

| Asset class | Provider | Plano | Limitações |
|-------------|----------|-------|-----------|
| Ações / ETFs | Massive | — | https://massive.com |
| Crypto | CoinGecko | Free (no key) | 10–30 req/min |
| Obrigações / Depósitos | N/A | — | Sem cotação automática |

A escolha entre Polygon e CoinGecko é feita no `marketDataService` com base no campo `type` do investimento: `'crypto'` → CoinGecko, resto → Polygon.io.

### 3. Novos Endpoints Backend

#### `GET /api/market/quote/:ticker`
- Parâmetros: `ticker` (ex: `AAPL`, `bitcoin`)
- Resposta: `{ ticker, price, currency, change24h, source, cachedAt }`
- Cache Redis: chave `market:quote:{ticker}`, TTL 900 s (15 min)
- Erros: 404 se ticker não encontrado, 503 se API externa falhar

#### `GET /api/market/search?q=`
- Parâmetros: `q` (string de pesquisa, min 2 chars)
- Resposta: `{ results: [{ ticker, name, type, exchange }] }`
- Sem cache (pesquisa é sempre fresca)
- Fonte: Polygon.io `/v3/reference/tickers?search={q}&active=true&limit=10`

#### `GET /api/market/history/:ticker`
- Query params: `period` = `30d` | `1y` (default: `30d`)
- Resposta: `{ ticker, period, points: [{ date, close }] }`
- Cache Redis: chave `market:history:{ticker}:{period}`, TTL 3600 s (1 hora)
- Fonte: Polygon.io `/v2/aggs/ticker/{ticker}/range/1/day/{from}/{to}`

Todos os endpoints de `/api/market/*` requerem `authenticate` middleware.

### 4. Serviço: `marketDataService.ts`

```typescript
// src/backend/src/services/marketDataService.ts

interface Quote {
  ticker: string;
  price: number;
  currency: string;
  change24h: number | null;
  source: 'polygon' | 'coingecko';
  cachedAt: string;
}

async function getQuote(ticker: string, type: string): Promise<Quote>
async function searchTicker(query: string): Promise<SearchResult[]>
async function getHistory(ticker: string, period: '30d' | '1y'): Promise<HistoryPoint[]>
```

Padrão interno:
1. Verificar Redis. Se hit e fresco, retornar.
2. Chamar API externa com axios (timeout 5 s).
3. Em caso de erro da API externa, lançar `AppError(503, 'Market data unavailable')`.
4. Guardar resposta em Redis com TTL.
5. Retornar dados.

### 5. Nova Tabela: `investment_prices`

Para guardar histórico de cotações e reduzir chamadas à API externa:

```sql
CREATE TABLE IF NOT EXISTS investment_prices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker      VARCHAR(20) NOT NULL,
  price       NUMERIC(18, 4) NOT NULL,
  currency    VARCHAR(3) NOT NULL DEFAULT 'USD',
  source      VARCHAR(20) NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON investment_prices(ticker, fetched_at DESC);
```

Esta tabela é opcional no MVP do Sprint 8 — o Redis é suficiente para cache de curta duração. A tabela é útil para análise histórica de P&L em sprints futuros.

### 6. Nova Rota: `src/backend/src/routes/market.ts`

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { getQuote, searchTicker, getHistory } from '../services/marketDataService.js';

const router = Router();
router.use(authenticate);

router.get('/quote/:ticker', ...);
router.get('/search', ...);
router.get('/history/:ticker', ...);

export default router;
```

Montagem em `server.ts`:
```typescript
import marketRouter from './routes/market.js';
app.use('/api/market', marketRouter);
```

### 7. Variáveis de Ambiente Novas

```env
POLYGON_API_KEY=           # Polygon.io — https://polygon.io/dashboard
# CoinGecko não requer API key no plano free
```

Adicionar a `src/backend/.env.example` e `docker-compose.yml`.

### 8. Frontend: Hook `useMarketData`

```typescript
// src/frontend/src/hooks/useMarketData.ts

export function useMarketQuote(ticker: string, type: string) {
  return useQuery({
    queryKey: ['market', 'quote', ticker],
    queryFn: () => marketApi.quote(ticker).then(r => r.data.data),
    staleTime: 15 * 60 * 1000,  // 15 min — sincronizado com TTL do Redis
    enabled: type !== 'deposito' && type !== 'certificado',
  });
}

export function useMarketHistory(ticker: string, period: '30d' | '1y' = '30d') {
  return useQuery({
    queryKey: ['market', 'history', ticker, period],
    queryFn: () => marketApi.history(ticker, period).then(r => r.data.data),
    staleTime: 60 * 60 * 1000,  // 1 hora
  });
}
```

### 9. Adições ao `api.ts`

```typescript
export const marketApi = {
  quote:   (ticker: string) => api.get(`/market/quote/${ticker}`),
  search:  (q: string) => api.get('/market/search', { params: { q } }),
  history: (ticker: string, period: string) =>
    api.get(`/market/history/${ticker}`, { params: { period } }),
};
```

### 10. `InvestmentsPage.tsx` — Alterações

- Para cada investimento com `ticker`, buscar cotação via `useMarketQuote`
- Calcular P&L: `(currentPrice - purchasePrice) * quantity`
- Mostrar variação % desde compra
- Botão "Ver gráfico" abre modal com `useMarketHistory` + `<LineChart>` Recharts
- Campo de pesquisa ao criar investimento: dropdown com resultados de `useMarketSearch`

---

## Sprint 9 — PDF Import de Corretoras

### 1. Corretoras Suportadas (v1)

| Corretora | Formato PDF | Encoding |
|-----------|-------------|----------|
| Degiro | Extrato de conta / Account statement | UTF-8 |
| XTB | Statement of account | UTF-8 |
| Trade Republic | Portfolio export | UTF-8 |

### 2. Endpoint: `POST /api/investments/import-pdf`

- Content-Type: `multipart/form-data`
- Campo: `file` (PDF, max 10 MB)
- Middleware: `multer` com storage em memória (não guardar ficheiro em disco)
- Resposta preview: `{ broker, transactions: [...], confidence: 0.9 }`
- Endpoint de confirmação: `POST /api/investments/import-pdf/confirm` com o array de transações

### 3. Arquitetura do Parser

```
PDF Buffer
    │
    ▼
pdfjs-dist → texto bruto
    │
    ▼
detectBroker(text) → 'degiro' | 'xtb' | 'traderepublic' | 'unknown'
    │
    ▼
brokerParsers[broker](text) → ParsedTransaction[]
    │
    ▼
deduplicateByISIN(transactions, existingInvestments) → filtered[]
    │
    ▼
{ preview: filtered[], confidence }
```

### 4. Serviço: `pdfImportService.ts`

```typescript
interface ParsedTransaction {
  name: string;
  ticker?: string;
  isin?: string;
  type: 'stock' | 'etf' | 'crypto';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;  // YYYY-MM-DD
  currency: string;
  institution: string;
}
```

Cada parser de corretora é uma função pura que recebe o texto extraído do PDF e retorna `ParsedTransaction[]`. Os parsers usam regex calibradas para o formato de cada extrato.

### 5. Frontend: Upload de PDF

- `InvestmentsPage.tsx`: botão "Importar PDF de corretora"
- Modal com drag-and-drop + seleção de ficheiro
- Após upload: tabela de preview com os investimentos extraídos
- Checkboxes para selecionar quais importar
- Botão "Confirmar importação" → chama endpoint de confirmação

---

## Fora de Âmbito (não implementar nestes sprints)

- SnapTrade (OAuth com corretoras reais) — complexidade elevada, deixar para versão futura
- Finnhub / Alpha Vantage como alternativas ao Polygon — introduzir apenas se Polygon falhar
- Dados fundamentais (P/E ratio, dividendos) — fora do âmbito académico
- Alertas de preço por email/push — Sprint futura
- Portfólio multi-moeda com conversão automática — simplificar com EUR por defeito

---

## Dependências a Instalar

### Backend (Sprint 8)
```bash
npm install axios  # já existe
# Polygon.io e CoinGecko via HTTP direto — sem SDK
```

### Backend (Sprint 9)
```bash
npm install multer pdfjs-dist
npm install --save-dev @types/multer
```

---

## Sequência de Implementação Recomendada

**Sprint 8:**
1. Criar `marketDataService.ts` com `getQuote` para Polygon.io e CoinGecko
2. Criar `routes/market.ts` e montar em `server.ts`
3. Adicionar `marketApi` a `api.ts` no frontend
4. Criar `useMarketData.ts` com hooks de quote e history
5. Atualizar `InvestmentsPage.tsx` para mostrar P&L real
6. Adicionar `investment_prices` migration (opcional no MVP)

**Sprint 9:**
1. Instalar `multer` e `pdfjs-dist`
2. Criar `pdfImportService.ts` com parser Degiro (mais popular)
3. Criar endpoint `POST /api/investments/import-pdf`
4. Frontend: modal de upload + preview
5. Parsers XTB e Trade Republic
6. Endpoint de confirmação
