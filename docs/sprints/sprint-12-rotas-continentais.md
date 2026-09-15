# Sprint 12 — Rotas continentais reais

## Objetivo
Transformar a procedência de classificação criada na Sprint 10 em uma etapa esportiva efetiva antes da fase principal das competições continentais.

## Escopo
- Diferenciar vagas diretas e vagas de fase preliminar.
- Resolver confrontos preliminares antes da criação da fase principal.
- Usar somente clubes reais já presentes nas ligas cadastradas como adversários de rota.
- Simular ida e volta de forma determinística por temporada, competição e confronto.
- Substituir o clube projetado pelo vencedor real da rota quando houver eliminação.
- Manter o tamanho exato da fase principal: LIB 32, SUD 32, UCL 36, UEL 36 e UECL 36.
- Impedir duplicidade entre competições da mesma confederação após a resolução das rotas.
- Persistir o histórico dos confrontos de acesso na temporada.
- Rodar a certificação da Sprint 11 somente depois da resolução das preliminares.

## Integridade
A rota preliminar não cria clubes `virtual-*`, placeholders ou classificados sintéticos. Reservas vêm de `PROFESSIONAL_COMPETITIONS`, respeitando a confederação e excluindo qualquer clube já alocado nas vagas continentais projetadas.

## Resultado determinístico
O placar das duas partidas deriva de uma chave estável contendo temporada, competição e clubes. O mesmo save reproduz o mesmo resultado. Empate agregado é resolvido deterministicamente nos pênaltis.

## Persistência
O ecossistema passa a guardar `continentalAccessPaths`, com:
- competição;
- número de vagas diretas;
- número de preliminares;
- quantidade de substituições;
- mandos e placares das duas partidas;
- agregado;
- vencedor e eliminado;
- tipo de decisão (agregado ou pênaltis).

## Ordem de execução
1. Sprint 10 enriquece a origem da vaga.
2. Sprint 11 prepara a certificação do campo continental.
3. Sprint 12 resolve as rotas preliminares.
4. Sprint 11 certifica o campo já resolvido.
5. Só então `nextInternationalEntrants` é persistido para a temporada seguinte.

## Critérios de aceite
- nenhum participante sintético;
- campos finais com quantidade exata;
- nenhum clube duplicado em UCL/UEL/UECL ou LIB/SUD;
- rota preliminar com ida e volta registrada;
- resolução reproduzível para o mesmo ano e entradas;
- adversário preliminar pertencente a liga real cadastrada;
- campo final continua passando pelo gate `certified` da Sprint 11.

## Deploy
Esta Sprint integra a cadeia de commits destacada iniciada na Sprint 10. Não deve criar branch, preview ou deployment no Vercel antes do release final autorizado.
