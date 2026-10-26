# Definition of done

Uma fatia só está **done** se:

- [ ] Aceite em `docs/backlog.md` cumprido
- [ ] Comportamento alinhado a `docs/contracts.md` e `docs/data-model.md`
- [ ] Smoke das rotas `/api/sql/*` ok (manual ou script); dívida de suíte automatizada no backlog se adiada
- [ ] Sem segredo no git; `.env` ignorado
- [ ] Auth presente se a fatia trata dado de usuário — **dívida**: rotas SQL ainda sem auth (igual legado)
- [ ] Erros visíveis ao usuário (não tela branca / 500 mudo)
- [ ] ADR criado se houve desvio de stack

Exceções só com item de dívida no backlog.
