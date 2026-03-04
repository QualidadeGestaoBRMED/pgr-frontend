## PGR Frontend

### Subir o front apontando para API local
```bash
npm run dev:api-local
```

### Rodar smoke test (cria PGR + atualiza state + sync + gera PDF uma vez)
```bash
npm run smoke:once
```

Saída esperada: arquivo PDF em `/tmp/<pgr-id>-smoke.pdf`.

Checklist completo: `docs/checklist-local.md`.
