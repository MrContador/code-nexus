# Code Nexus Free

> **Ambiente Autônomo de Desenvolvimento & Engenharia com Inteligência Artificial**

---

### ⚠️ Status do Repositório: Prévia & Estabilização da Nova Versão

> [!NOTE]
> Este repositório está temporariamente configurado em modo **exclusivamente informativo**. 
> Uma nova atualização de grande escala do **Code Nexus** está em fase final de testes internos e homologação de estabilidade. 
> Todos os arquivos de código-fonte, scripts de build e instaladores finais serão publicados publicamente aqui assim que o ciclo de testes de estabilização for concluído.

---

## ⚡ Visão Geral

O **Code Nexus Free** é um estúdio de engenharia e codificação autônoma projetado para desenvolvedores que exigem controle total sobre o ciclo de inferência de agentes, persistência de memória, orquestração de ferramentas e integração de modelos locais e remotos.

---

## 🧠 O Motor Híbrido LLM + NCM 2.0 (Next-Concept Modeling)

- **Créditos**: **Mörlsara**
- **Fundamentação Teórica**: [Stanford Hazy Research — Next-Concept Modeling (NCM)](https://hazyresearch.stanford.edu/blog/2026-10-12-ncm)

Os agentes convencionais baseados unicamente em modelos de linguagem enfrentam gargalos severos de inferência: alucinação de estado, hesitação deliberativa excessiva, consumo descontrolado de tokens e estagnação em ciclos repetitivos de falha. 

O **Code Nexus** resolve esse paradigma através da cooperação simbiótica entre duas camadas de computação distintas:

```
+-------------------------------------------------------------------------+
|                           Entrada do Operador                           |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  NCM 2.0: Analisador Heurístico de Estado               |
|  - Inspeção Física Ground-Truth (0ms / 0 tokens LLM)                   |
|  - Indexação Topológica via AST Nexus                                   |
|  - Cálculo da Matriz de Probabilidades de Transição (H1 a H5)          |
|  - Determinação do Próximo Conceito Vencedor (Winning Concept H*)       |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  Blueprint Cognitivo Injetado no Contexto               |
|  - Manifesto de arquivos confirmados e ausentes no disco                |
|  - Rastreamento de ações pendentes e histórico de execução real         |
|  - Hierarchical Task DAG (Marcos Determinísticos M1 a M4)               |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      LLM (Motor de Inferência Neural)                   |
|  - Processamento direcionado sem necessidade de auto-deliberação        |
|  - Eliminação de dispersão e recusas genéricas                          |
|  - Emissão de chamadas diretas de ferramentas (Tool Calls)              |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                     Validação e Livro-Razão de Evidências               |
|  - Rejeição de asserções sem confirmação física no host                 |
|  - Protocolo de entrega de output verificável                           |
+-------------------------------------------------------------------------+
```

### Componentes Centrais do NCM 2.0:
1. **Inspeção Física Ground-Truth (0ms / 0 tokens)**: Antes de qualquer chamada à LLM, o NCM audita diretamente o sistema de arquivos do host, verificando caminhos absolutos, árvores de diretórios e integridade física.
2. **Matriz de Transição de Conceitos (H1..H5)**: Avalia o espaço de estados de engenharia e determina com precisão matemática o conceito ótimo para o próximo passo.
3. **Livro-Razão de Evidências**: Nenhuma alteração é declarada como concluída sem que uma evidência física seja confirmada no host.

---

## 🛠️ Novas Mecânicas & Recursos do Update

### 1. biSkills & SkillHub Marketplace
- Gerencie as skills instaladas e explore o **SkillHub**.
- Interface com três abas dedicadas: `[ CodeNexus Padrão | Skills Instaladas | Skills Marketplace ]`.
- Filtros por categoria (**UI / Design**, **Linguagens**, **Engenharia**) e busca integrada.
- Opção para instalar skills individuais ou o **pacote completo** do ecossistema [open-skills](https://github.com/x7dl8p/open-skills).

### 2. Widget de Contexto Inteligente & Estimativa de Tokens
- Monitoramento em tempo real do uso da janela de contexto no composer.
- Ajuste rápido e retrátil da janela de tokens (`25%`, `50%`, `75%`, `100% / 1M`).
- **Auto-compactação Ativável**: Chave liga/desliga com gatilhos percentuais pré-configurados (`25%`, `50%`, `65%`, `75%`, `80%`, `95%`).
- Cálculo preciso e telemetria de consumo em tempo real.

### 3. Painel de Atividade & Métricas Diárias
- **Mapa de Calor de 31 Semanas**: Grid alinhado no padrão visual GitHub Emerald (`bg-emerald-950` a `bg-emerald-400`).
- **Gráfico de Tokens Diários (30 dias)**: Consumo empilhado por dia com gradiente esmeralda e hover informativo.

### 4. Provedores Customizados & Modelos Locais
- Suporte a múltiplos provedores compatíveis com as APIs OpenAI e Anthropic.
- Descoberta automática de modelos disponíveis em endpoints locais e remotos.
- Suporte nativo a execução com modelos locais via **Ollama**.
- Autenticação e conexão por contas de serviço ou chaves diretas.

### 5. Experiência de Usuário & Cindy Parity
- **Seletor de Modelos Avançado**: Navegação lateral por trilhos dividida em Recentes, Favoritos, Todos, Provedores Customizados, Locais e Ferramentas CLI.
- **Configurações Gerais**: Cartão de identidade local, preferências de comportamento (manter computador ativo, iniciar ao entrar), gerenciamento de Workers colaboradores e limites de recursos.
- **Wallpaper Universal**: Suporte a imagens de fundo personalizadas em qualquer tema de cores, com camada adaptativa de contraste.

---

## 📅 Roadmap & Lançamento

| Marco | Status | Descrição |
|---|---|---|
| **M1: Arquitetura NCM 2.0** | Concluído | Camada heurística Ground-Truth e livro-razão de evidências implementados |
| **M2: Interface & Cindy Parity** | Concluído | Widget de contexto, mapa de calor GitHub Emerald, seletor de modelos e SkillHub |
| **M3: Testes de Estabilidade** | Em Andamento | Validação de runtime, testes de estresse em pacotes e empacotamento desktop |
| **M4: Release Pública** | Próximo | Disponibilização pública dos fontes completos, instaladores executáveis e documentação técnica |

---

## 🚀 Log de Atualizações do Ciclo

- **Correção & Persistência de Provedores**: Resolução do módulo de toasts (`showToast`), integração IPC direta para salvamento no arquivo de configuração do sistema e novo layout com scroll independente no modal de conexão.
- **Suporte a Wallpaper Universal**: Camada de translucidez inteligente e desfoque fosco (`backdrop-filter`) para exibição contínua da imagem de fundo através de todas as telas em qualquer tema.
- **Mapa de Calor Emerald Imutável**: Cores GitHub Emerald com códigos hexadecimais fixos (`#161b22`, `#0e4429`, `#006d32`, `#26a641`, `#39d353`) e alinhamento amplo dos meses sem cortes, garantindo legibilidade idêntica em qualquer tema selecionado.
- **SkillHub & biSkills Grid Refinado**: Responsividade aprimorada na listagem de habilidades com proteção contra quebra de layout, chips flexíveis e botões com largura estável.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
