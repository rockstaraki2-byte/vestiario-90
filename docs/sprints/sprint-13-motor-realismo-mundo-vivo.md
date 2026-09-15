# Sprint 13 — Motor de Realismo e Mundo Vivo

## Objetivo

Aumentar a credibilidade do universo simulado sem reescrever o motor tático ou o 2D. A sprint atua em três pontos: distribuição de resultados, carga física/lesões e competições paralelas.

## 1. Resultados mais realistas

- Novo módulo `match-realism.ts` com expectativas de gol calibradas pela diferença de força.
- Conversão de chances do jogo principal passa a usar uma meta de xG por equipe, mantendo influência de tática, zona e linha defensiva.
- Simulação rápida de ligas paralelas passa de uma aproximação binomial fixa para Poisson calibrado.
- Favoritos ganham vantagem progressiva, mas a expectativa do azarão nunca é zerada.
- Auditoria automática mede gols/jogo, vitórias do mandante, empates, vitórias do visitante e frequência de partidas com 5+ gols.
- As faixas são deliberadamente largas para permitir identidade entre ligas e temporadas sem aceitar universos estatisticamente absurdos.

### Referências de calibração

O ponto de partida usa futebol profissional recente e literatura esportiva, não uma meta rígida para todas as ligas. A Premier League 2025/26 terminou com 1.045 gols em 380 partidas (2,75 por jogo). A auditoria aceita uma faixa maior para contemplar campeonatos com perfis diferentes.

## 2. Fadiga, recuperação e lesões

- Cada titular recebe condição e fadiga pós-jogo calculadas por minutos, intensidade, descanso, viagem, idade e carga acumulada.
- O resultado de partida passa a preencher `playerConditionAfter`, `playerFatigueAfter` e `playerMinutes`, integrando-se ao fluxo já existente de temporada.
- A chance de lesão deixa de ser um sorteio fixo por equipe e passa a ser individual.
- Pouco descanso, fadiga alta, baixa condição, idade e intensidade aumentam o risco.
- Gravidade: pancada (1–3 dias), leve (4–8), moderada (9–24), grave (25–60) e muito grave (61–180), com as duas últimas propositalmente raras.
- O motor grava a duração inicial da lesão no próprio atleta para que ela sobreviva ao processamento pós-jogo já existente.

A literatura de futebol profissional encontra incidência de lesões de jogo muito superior à de treino e aponta lesões de 1–3 dias como as mais frequentes; a distribuição da sprint segue essa direção sem tentar reproduzir literalmente uma única competição.

## 3. Campeonatos em paralelo

O V90 já possuía `world-leagues.ts` e avançava ligas carregadas pelo calendário. A Sprint 13 preserva essa arquitetura e aprofunda a simulação:

- fixtures continuam sendo processadas pela data real do save;
- jogadores das ligas paralelas agora possuem idade, condição, fadiga e lesão persistentes;
- escalações CPU consideram disponibilidade física e não apenas valor de mercado;
- intervalo entre partidas gera recuperação real;
- congestionamento acumula fadiga e eleva risco de lesão;
- artilharia, assistências e ratings continuam sendo atualizados;
- cada liga mantém `injuryLog` e `realismAudit` para diagnóstico;
- o processamento ordena partidas por data antes de simulá-las, evitando distorções quando o calendário avança vários dias de uma vez.

## 4. Segurança da implementação

Esta sprint foi preparada sem alteração de `main`, sem criação/atualização de branch rastreada e sem promoção no Vercel. O commit de trabalho deve permanecer sem ref até autorização explícita para Preview/merge/deploy.

## Critérios de aceite

- distribuição de 20 mil+ partidas sintéticas dentro das bandas de auditoria;
- favoritos com expectativa superior sem eliminar zebras;
- carga física maior com pouco descanso e alta intensidade;
- lesões curtas significativamente mais frequentes que graves;
- ligas paralelas avançando até a data do save com tabela, jogadores, fadiga, lesões e auditoria persistentes;
- nenhuma alteração de produção ou Preview Deployment durante a implementação.
