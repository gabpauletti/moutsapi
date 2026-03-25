# ServeRest API — Testes Automatizados com Cypress

Suíte de testes E2E para a API [ServeRest](https://serverest.dev/), cobrindo os recursos de **Usuários**, **Login** e **Carrinhos**.

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|------------|--------------|
| Node.js    | 18.x         |
| npm        | 9.x          |

---

## Instalação

```bash
# Clone o repositório
git clone 
cd moutsapi/cypress

# Instale as dependências
npm install
```

---

## Como executar

### Modo headless (CI / terminal)
```bash
npx cypress run
```

### Modo interativo (Cypress App)
```bash
npx cypress open
```

> A `baseUrl` já está configurada para `https://serverest.dev` — nenhuma variável de ambiente extra é necessária.

---

## Estrutura do projeto

```
cypress/
├── cypress/
│   ├── e2e/
│   │   ├── login.cy.js      # Cenários de autenticação
│   │   ├── usuarios.cy.js   # CRUD completo de usuários
│   │   └── carrinho.cy.js   # Fluxo completo de carrinhos
│   ├── fixtures/
│   │   ├── usuario.json     # Dados base para criação de usuário
│   │   └── produto.json     # Dados base para criação de produto
│   └── support/
│       └── commands.js      # Comandos customizados reutilizáveis
└── cypress.config.js        # Configuração global (baseUrl, etc.)
```

---

## Cenários de teste

### `login.cy.js` — Autenticação (`POST /login`)
| # | Cenário |
|---|---------|
| 1 | Deve realizar login com credenciais válidas e retornar token Bearer |
| 2 | Deve retornar token Bearer via comando `cy.obterToken` |
| 3 | Deve retornar erro 401 ao fazer login com senha incorreta |
| 4 | Deve retornar erro 401 ao fazer login com e-mail não cadastrado |

### `usuarios.cy.js` — Gerenciamento de Usuários (`/usuarios`)
| # | Cenário |
|---|---------|
| 1 | Deve cadastrar um novo usuário com sucesso (`POST`) |
| 2 | Deve retornar erro 400 ao cadastrar com e-mail duplicado (`POST`) |
| 3 | Deve buscar um usuário pelo ID com sucesso (`GET /:id`) |
| 4 | Deve editar os dados de um usuário existente com sucesso (`PUT /:id`) |
| 5 | Deve criar novo usuário via `PUT` quando o ID não existe (upsert) |
| 6 | Deve excluir um usuário com sucesso e validar remoção (`DELETE /:id`) |

### `carrinho.cy.js` — Carrinhos (`/carrinhos`)
| # | Cenário |
|---|---------|
| 1 | Deve listar carrinhos e retornar estrutura de dados correta (`GET`) |
| 2 | Deve cadastrar carrinho com produto válido, validar itens e retornar ID (`POST`) |
| 3 | Deve buscar carrinho pelo ID e retornar campos calculados corretamente (`GET /:id`) |
| 4 | Deve concluir compra com sucesso e remover o carrinho |
| 5 | Deve cancelar compra com sucesso e devolver produtos ao estoque |
| 6 | Deve retornar 401 ao tentar criar carrinho sem token de autenticação |

---

## Comandos customizados

Definidos em `cypress/support/commands.js` e disponíveis em todos os testes:

| Comando | Descrição |
|---------|-----------|
| `cy.criarUsuario(overrides?)` | Cria um usuário via `POST /usuarios` e retorna o objeto com `_id` |
| `cy.obterToken(email, password)` | Realiza login e retorna o header `authorization` (Bearer token) |
| `cy.criarUsuarioEObterToken()` | Combina os dois comandos acima e retorna `{ usuario, token }` |

O hook `request` também está sobrescrito para logar automaticamente método, URL, status e body de todas as chamadas no painel do Cypress.

---

## Fixtures

| Arquivo | Conteúdo |
|---------|----------|
| `usuario.json` | Nome, senha e flag `administrador` base para novos usuários |
| `produto.json` | Nome, preço, descrição e quantidade base para novos produtos |

> E-mails são gerados dinamicamente com `Date.now()` para garantir unicidade entre execuções.

---

## Boas práticas adotadas

- **Isolamento**: cada teste cria e limpa seus próprios dados via `before/after/afterEach`.
- **Sem waits fixos**: todo fluxo assíncrono é tratado com encadeamento de `.then()`.
- **Assertivas descritivas**: todas as `expect()` possuem mensagem explicando o que está sendo validado.
- **Dados dinâmicos**: e-mails e nomes são gerados com timestamps, evitando conflitos de dados.
- **Seletores estáveis**: testes de API usam apenas campos do contrato (schema do Swagger).
- **Comandos reutilizáveis**: lógica de setup compartilhada encapsulada em custom commands.
