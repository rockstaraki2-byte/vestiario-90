# Sprint 14 — Departamento Médico, Performance e Calendário Congestionado

## Objetivo

Transformar o motor físico da Sprint 13 em decisões reais de treinador, sem reescrever tática ou 2D.

## Entregas

### 1. Departamento médico passa a ter efeito esportivo
- O nível 1–5 do departamento médico entra na avaliação de carga do clube controlado.
- Estruturas melhores reduzem a carga residual e o risco projetado, sem tornar lesões impossíveis.
- O novo módulo `medical-performance.ts` gera relatório individual e coletivo com risco, disponibilidade e minutos recomendados.

### 2. Retorno gradual
- Jogador sem lesão ativa pode estar `Liberado com restrições` se condição/fadiga ainda estiverem ruins.
- O motor recomenda 30, 60 ou 90 minutos.
- Usar atleta ainda restrito aumenta o multiplicador de risco físico.
- Lesões de partida derrubam condição de acordo com a gravidade para evitar retorno artificialmente perfeito.

### 3. Recuperação e preparação física
- Recuperação agora aceita qualidade médica e sessão de recuperação como modificadores.
- Departamento melhor acelera, de forma moderada, condição, redução de fadiga e prazo clínico.
- A recomendação coletiva troca automaticamente para `Recuperação` quando a carga ou a agenda exigem.

### 4. Calendário congestionado
- O calendário continua permitindo sequências realistas como domingo/quarta/domingo.
- `workload.ts` agora mede jogos nos últimos 7/14 dias, próximos 7/14 e concentração em janela de oito dias.
- O jogo deixa de confundir “calendário válido” com “calendário saudável”: uma data pode permanecer, mas gera risco, rotação e recuperação.

### 5. Mundo paralelo
- Ligas CPU usam nível médico aproximado por estrutura/força do clube.
- Recuperação entre jogos respeita staff.
- Escalação considera retorno restrito, condição, fadiga e lesões.
- Congestionamento pode gerar rotação e mais indisponibilidades ao longo da temporada.

## Critérios de aceite
- atleta recém-recuperado não é tratado automaticamente como 100% apto;
- melhor departamento médico reduz risco sem zerá-lo;
- três jogos em janela curta elevam alerta de carga;
- recuperação e recomendação de treino respondem ao calendário;
- ligas paralelas mantêm carga, lesões e recuperação persistentes;
- nenhuma branch/ref é criada durante a implementação, portanto nenhum Preview/Production Deployment é disparado.
