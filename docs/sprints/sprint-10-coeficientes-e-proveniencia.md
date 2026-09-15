# Sprint 10 — Ecossistema de classificação e coeficientes

## Objetivo

Fechar a fundação multi-temporada das competições continentais antes de aprofundar personalidade, mercado e demais sistemas do manager.

## Entregas

- Procedência estruturada de cada vaga continental (`league`, `cup`, `titleholder`, `performance`, `continental-pool`).
- Fase de entrada registrada como principal ou preliminar.
- Competição e temporada de origem preservadas quando identificáveis.
- Histórico completo de classificados arquivado, além da lista legada de nomes.
- Coeficiente de associação/país calculado separadamente do coeficiente dos clubes.
- Janela móvel de cinco temporadas para o ranking de associações.
- As duas melhores associações no ciclo alimentam as vagas extras de desempenho UEFA.
- Painel de legado passa a mostrar origem das vagas e ranking das associações.
- Hidratação continua compatível com saves antigos, nos quais os novos campos não existem.

## Integridade

O coeficiente de clubes permanece intacto para hierarquia e potes. O novo coeficiente de associação é um sistema adicional e não substitui dados já persistidos.

A Sprint 10 mantém as garantias da Sprint 9:

- nenhum participante virtual nas competições continentais;
- campos exatos para LIB, SUD, UCL, UEL e UECL;
- nenhuma sobreposição entre torneios UEFA concorrentes;
- nenhuma sobreposição entre Libertadores e Sul-Americana;
- classificados dinâmicos derivados de resultados do save.

## Estratégia sem Vercel

Esta sprint foi preparada como commit Git destacado, sem branch/ref publicada. Portanto o conteúdo pode ser acumulado com as próximas sprints sem gerar previews no Vercel. No release final, o patch determinístico `scripts/apply-sprint10-qualification-ecosystem.mjs` deve ser aplicado antes da bateria de testes e do único deploy final.

## Validação prevista para o release final

1. aplicar o patch Sprint 10;
2. executar testes unitários de procedência e coeficientes;
3. executar testes de qualificação continental;
4. executar simulação de estabilidade multi-temporada;
5. executar suíte completa;
6. executar `npm audit`;
7. executar build de produção;
8. publicar somente após todos os gates verdes.
