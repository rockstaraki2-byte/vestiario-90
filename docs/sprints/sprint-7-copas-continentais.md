# Sprint 7 — Competições continentais reais

## Objetivo

Fechar a última lacuna de identidade entre a base internacional e o motor de competições. Libertadores, Sul-Americana, Champions League, Europa League e Conference League deixam de depender de fallback virtual no início de 2026 e passam a consumir os participantes reais sincronizados.

## Escopo

- CONMEBOL Libertadores (`LIB`) — 32 participantes.
- CONMEBOL Sudamericana (`SUD`) — 32 participantes.
- UEFA Champions League (`UCL`) — 36 participantes.
- UEFA Europa League (`UEL`) — 36 participantes.
- UEFA Conference League (`UECL`) — 36 participantes.

## Regras de integridade

1. O snapshot precisa conter exatamente a quantidade oficial esperada para a fase modelada.
2. IDs de clubes não podem se repetir.
3. Todo participante precisa ter um clube real correspondente no snapshot de elencos.
4. Cada clube precisa possuir pelo menos 15 jogadores reais na carga usada pelo jogo.
5. O motor não pode criar `virtual-*` para completar uma competição continental no snapshot inicial de 2026.
6. Quando um participante também pertence à liga ativa, o vínculo `activeClubId` deve ser preservado para agenda e partidas do usuário.
7. Uma sincronização com qualquer competição incompleta falha de forma atômica; não sobrescreve o snapshot válido com uma carga parcial.

## Implementação

- `international-cup-fields.ts` vira a camada auditável entre os arquivos gerados e o motor.
- `world-competitions.ts` resolve os participantes continentais pelo snapshot real antes de gerar grupos ou fase de liga.
- O sincronizador internacional exige contagem exata e zero erros antes de escrever novos arquivos gerados.
- Testes dedicados cobrem identidade, cardinalidade, elencos mínimos, ausência de placeholders e vínculo com a liga ativa.

## Critérios de aceite

- `LIB`: 32/32 clubes reais.
- `SUD`: 32/32 clubes reais.
- `UCL`: 36/36 clubes reais.
- `UEL`: 36/36 clubes reais.
- `UECL`: 36/36 clubes reais.
- Zero `virtual-*` nas cinco competições ao criar o mundo de 2026 sem entrants dinâmicos.
- Todos os participantes do motor pertencem ao snapshot correspondente.
- Testes de regressão do motor mundial continuam verdes.
- Build de produção aprovado.
