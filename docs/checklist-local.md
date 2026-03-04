# Checklist Local (Front + Back + Geração 1x)

## 1) Pré-requisitos
- Backend em `dev` e frontend em `main`.
- PostgreSQL e Redis ativos para o backend.
- Backend respondendo em `http://127.0.0.1:8001`.
- Frontend com dependências instaladas (`npm install`).

## 2) Verificar API disponível
- Teste rápido:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/frontend/home
```
- Esperado: `200`.

## 3) Rodar validação ponta a ponta (uma vez)
- No diretório `pgr-frontend`:
```bash
npm run smoke:once
```
- O script faz:
- `GET /api/frontend/home`
- `POST /api/frontend/pgrs`
- `GET /api/frontend/pgr/{id}/state`
- `PUT /api/frontend/pgr/{id}/state`
- `POST /api/frontend/pgr/{id}/sync-pipefy`
- `POST /api/frontend/pgr/{id}/fake-pdf`
- Resultado esperado: PDF em `/tmp/<pgr-id>-smoke.pdf`.

## 4) Subir front para uso manual
```bash
npm run dev:api-local
```
- Abrir: `http://localhost:3000/home`

## 5) Fluxo manual mínimo para “gerar uma vez”
- Entrar em `/home`.
- Clicar em `Novo PGR`.
- Ir até etapa `Revisão`.
- Clicar em `Gerar PDF fake`.

## 6) Troubleshooting rápido
- Se `smoke:once` falhar com conexão:
- confirme backend em `127.0.0.1:8001`.
- Se quiser outro host:
```bash
API_BASE_URL=http://SEU_HOST:PORTA npm run smoke:once
```
- Se front não falar com backend:
- ajustar `BACKEND_API_BASE_URL` antes do `npm run dev`.
