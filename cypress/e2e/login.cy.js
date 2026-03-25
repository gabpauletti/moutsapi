/// <reference types="cypress" />

/**
 * CENÁRIO — Login (ServeRest) /login
 */

describe('API - Login', () => {
  let usuarioCriado

  before(() => {
    cy.criarUsuario().then((usuario) => {
      expect(
        usuario._id,
        'Setup: POST /usuarios deve retornar _id do usuário criado'
      )
        .to.be.a('string')
        .and.not.be.empty
      usuarioCriado = usuario
    })
  })

  after(() => {
    const id = usuarioCriado?._id
    if (id) {
      cy.request({
        method: 'DELETE',
        url: `/usuarios/${id}`,
        failOnStatusCode: false,
      })
    }
  })

  it('deve realizar login com credenciais válidas e retornar token Bearer', () => {
    cy.request({
      method: 'POST',
      url: '/login',
      body: {
        email: usuarioCriado.email,
        password: usuarioCriado.password,
      },
    }).then((response) => {
      expect(response.status, 'POST /login com credenciais válidas: status 200').to.eq(200)
      expect(
        response.body,
        'POST /login: mensagem de sucesso esperada'
      ).to.have.property('message', 'Login realizado com sucesso')
      expect(
        response.body.authorization,
        'POST /login: authorization deve ser string não vazia (Bearer + JWT)'
      )
        .to.be.a('string')
        .and.not.be.empty
    })
  })

  it('deve retornar token Bearer via comando obterToken', () => {
    cy.obterToken(usuarioCriado.email, usuarioCriado.password).then((authorization) => {
      expect(
        authorization,
        'obterToken: deve retornar string de authorization'
      ).to.be.a('string') 
    })
  })

  it('deve retornar erro ao fazer login com senha incorreta', () => {
    cy.request({
      method: 'POST',
      url: '/login',
      body: {
        email: usuarioCriado.email,
        password: 'senha_errada_123',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(
        response.status,
        'POST /login com senha errada: API deve responder 401'
      ).to.eq(401)
      expect(
        response.body,
        'POST /login senha incorreta: mensagem de e-mail/senha inválidos'
      ).to.have.property('message', 'Email e/ou senha inválidos')
    })
  })

  it('deve retornar erro ao fazer login com e-mail não cadastrado', () => {
    cy.request({
      method: 'POST',
      url: '/login',
      body: {
        email: `nao_existe_${Date.now()}@serverest.com`,
        password: 'qualquersenha',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(
        response.status,
        'POST /login com e-mail inexistente: API deve responder 401'
      ).to.eq(401)
      expect(
        response.body,
        'POST /login e-mail desconhecido: mesma mensagem genérica de falha (segurança)'
      ).to.have.property('message', 'Email e/ou senha inválidos')
    })
  })
})
