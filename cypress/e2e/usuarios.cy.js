/// <reference types="cypress" />

/**
 * CENÁRIO DE TESTE 1 — Gerenciamento de Usuários
 *
 * Cobre CRUD do recurso /usuarios (ServeRest).
 */

describe('API - Usuários', () => {
  let usuarioId
  let usuarioDados

  before(() => {
    cy.fixture('usuario').then((fixture) => {
      const timestamp = Date.now()
      usuarioDados = {
        ...fixture,
        email: `qa_usuario_${timestamp}@serverest.com`,
      }
    })
  })

  afterEach(() => {
    const idParaLimpar = usuarioId
    if (idParaLimpar) {
      cy.request({
        method: 'DELETE',
        url: `/usuarios/${idParaLimpar}`,
        failOnStatusCode: false,
      })
    }
    usuarioId = undefined
  })

  it('deve cadastrar um novo usuário com sucesso', () => {
    cy.request({
      method: 'POST',
      url: '/usuarios',
      body: usuarioDados,
    }).then((response) => {
      expect(response.status, 'POST /usuarios: cadastro válido deve retornar 201').to.eq(201)
      expect(
        response.body,
        'POST /usuarios: mensagem de sucesso esperada'
      ).to.have.property('message', 'Cadastro realizado com sucesso')
      expect(
        response.body._id,
        'POST /usuarios: resposta deve incluir _id (string não vazia)'
      )
        .to.be.a('string')
        .and.not.be.empty

      usuarioId = response.body._id
    })
  })

  it('deve retornar erro ao cadastrar usuário com e-mail já existente', () => {
    cy.request({
      method: 'POST',
      url: '/usuarios',
      body: usuarioDados,
    }).then((res) => {
      expect(res.status, 'POST /usuarios (1ª vez): deve retornar 201').to.eq(201)
      usuarioId = res.body._id

      cy.request({
        method: 'POST',
        url: '/usuarios',
        body: usuarioDados,
        failOnStatusCode: false,
      }).then((response) => {
        expect(
          response.status,
          'POST /usuarios com e-mail duplicado: API deve responder 400'
        ).to.eq(400)
        expect(
          response.body,
          'POST /usuarios duplicado: mensagem de e-mail já usado'
        ).to.have.property('message', 'Este email já está sendo usado')
      })
    })
  })

  it('deve buscar um usuário pelo ID com sucesso', () => {
    cy.request({
      method: 'POST',
      url: '/usuarios',
      body: usuarioDados,
    }).then((res) => {
      expect(res.status, 'POST /usuarios (pré-busca): deve retornar 201').to.eq(201)
      usuarioId = res.body._id

      cy.request({
        method: 'GET',
        url: `/usuarios/${usuarioId}`,
      }).then((response) => {
        expect(response.status, 'GET /usuarios/:id: status deve ser 200').to.eq(200)
        expect(
          response.body,
          'GET /usuarios/:id: _id deve ser o do usuário criado'
        ).to.have.property('_id', usuarioId)
        expect(
          response.body,
          'GET /usuarios/:id: nome deve refletir o cadastro'
        ).to.have.property('nome', usuarioDados.nome)
        expect(
          response.body,
          'GET /usuarios/:id: email deve refletir o cadastro'
        ).to.have.property('email', usuarioDados.email)
        expect(
          response.body,
          'GET /usuarios/:id: flag administrador deve refletir o cadastro'
        ).to.have.property('administrador', usuarioDados.administrador)
        expect(
          response.body,
          'GET /usuarios/:id: ServeRest expõe password no schema (conforme Swagger)'
        ).to.have.property('password', usuarioDados.password)
      })
    })
  })

  it('deve editar os dados de um usuário existente com sucesso', () => {
    const dadosAtualizados = {
      nome: 'QA Tester Editado',
      email: `editado_${Date.now()}@serverest.com`,
      password: 'novaSenha123',
      administrador: 'true',
    }

    cy.fixture('usuario').then((fixture) => {
      const bodyNovo = {
        ...fixture,
        email: `qa_para_editar_${Date.now()}@serverest.com`,
      }

      return cy
        .request({ method: 'POST', url: '/usuarios', body: bodyNovo })
        .then((res) => {
          expect(res.status, 'POST /usuarios (usuário para editar): deve retornar 201').to.eq(201)
          usuarioId = res.body._id

          return cy.request({
            method: 'PUT',
            url: `/usuarios/${usuarioId}`,
            body: dadosAtualizados,
          })
        })
        .then((response) => {
          expect(response.status, 'PUT /usuarios/:id: alteração deve retornar 200').to.eq(200)
          expect(
            response.body,
            'PUT /usuarios/:id: mensagem de alteração com sucesso'
          ).to.have.property('message', 'Registro alterado com sucesso')

          return cy.request({
            method: 'GET',
            url: `/usuarios/${usuarioId}`,
          })
        })
        .then((response) => {
          expect(response.status, 'GET /usuarios/:id após PUT: status 200').to.eq(200)
          expect(
            response.body.nome,
            'GET após PUT: nome persistido deve ser o atualizado'
          ).to.eq(dadosAtualizados.nome)
          expect(
            response.body.email,
            'GET após PUT: email persistido deve ser o atualizado'
          ).to.eq(dadosAtualizados.email)
        })
    })
  })

  it('deve criar um novo usuário via PUT quando o ID informado não existe (upsert)', () => {
    const idInexistente = `${Date.now()}`.padStart(24, '0').slice(-24)
    const timestamp = Date.now()
    const novoUsuario = {
      nome: 'Usuário Upsert',
      email: `upsert_${timestamp}@serverest.com`,
      password: 'senha123',
      administrador: 'false',
    }

    cy.request({
      method: 'PUT',
      url: `/usuarios/${idInexistente}`,
      body: novoUsuario,
    }).then((response) => {
      expect(
        response.status,
        'PUT /usuarios/:id inexistente: ServeRest faz cadastro (201)'
      ).to.eq(201)
      expect(
        response.body,
        'PUT upsert: mensagem de cadastro realizado'
      ).to.have.property('message', 'Cadastro realizado com sucesso')
      expect(
        response.body._id,
        'PUT upsert: novo _id deve ser retornado'
      )
        .to.be.a('string')
        .and.not.be.empty

      return cy.request({
        method: 'DELETE',
        url: `/usuarios/${response.body._id}`,
        failOnStatusCode: false,
      })
    })
  })

  it('deve excluir um usuário com sucesso', () => {
    let idExcluido

    cy.fixture('usuario').then((fixture) => {
      const body = {
        ...fixture,
        email: `qa_para_excluir_${Date.now()}@serverest.com`,
      }
      return cy.request({ method: 'POST', url: '/usuarios', body })
    }).then((res) => {
      expect(res.status, 'POST /usuarios (pré-exclusão): deve retornar 201').to.eq(201)
      idExcluido = res.body._id
      usuarioId = idExcluido

      return cy.request({ method: 'DELETE', url: `/usuarios/${idExcluido}` })
    }).then((response) => {
      expect(response.status, 'DELETE /usuarios/:id: status deve ser 200').to.eq(200)
      expect(
        response.body,
        'DELETE /usuarios/:id: mensagem de registro excluído'
      ).to.have.property('message', 'Registro excluído com sucesso')

      usuarioId = undefined

      return cy.request({
        method: 'GET',
        url: `/usuarios/${idExcluido}`,
        failOnStatusCode: false,
      })
    }).then((response) => {
      expect(
        response.status,
        'GET /usuarios/:id após DELETE: API deve responder 400 (não encontrado)'
      ).to.eq(400)
      expect(
        response.body,
        'GET após DELETE: mensagem de usuário não encontrado'
      ).to.have.property('message', 'Usuário não encontrado')
    })
  })
})
