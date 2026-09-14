# Sprint 6 — Copas nacionais com motor ativo

Snapshot: 2026-09-14

## Escopo

A Sprint 6 elimina participantes virtuais dos cinco torneios nacionais que já possuem motor jogável:

- Copa do Brasil (`CDB`)
- FA Cup (`FAC`)
- EFL Cup / Carabao Cup (`EFL`)
- Copa del Rey (`CDR`)
- Coupe de France (`CDF`)

## Estratégia de participantes

- **Copa do Brasil:** campo real confirmado de 32 clubes da 5ª fase de 2026.
- **Carabao Cup:** campo real confirmado de 32 clubes da 3ª fase de 2026/27.
- **FA Cup:** campo de 64 clubes reais elegíveis para a 3ª fase. O sorteio real ainda é futuro no snapshot; Premier League e Championship entram automaticamente e as vagas restantes são preenchidas deterministicamente com clubes reais das divisões inferiores carregadas.
- **Copa del Rey:** campo de 64 clubes espanhóis reais elegíveis enquanto as eliminatórias que definem a fase do motor ainda não estão concluídas.
- **Coupe de France:** campo de 64 clubes franceses reais elegíveis enquanto as rodadas anteriores ainda não definiram o quadro final.

Nenhuma dessas cinco competições pode mais completar seu campo com IDs `virtual-*`.

## Integridade

O gate dedicado valida:

- tamanho exato do campo de entrada usado pelo motor;
- unicidade de participantes;
- ausência de participantes virtuais;
- identidade exata dos participantes já confirmados;
- presença automática dos clubes de primeira divisão nos campos de sorteio futuro em que a regra garante sua entrada;
- exibição do campo real no painel de saúde da base;
- regressões do motor de competições;
- build de produção.

Também foi corrigida a determinação do país do clube ativo no pool global: a origem agora vem da competição cadastrada, em vez de assumir França para qualquer liga que não fosse Brasil, Inglaterra ou Espanha.
