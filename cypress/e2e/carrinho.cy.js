/// <reference types="cypress" />

describe('API - Carrinhos: Fluxo Completo', () => {
  let token
  let usuarioCriado
  let produtoCriado
  let carrinhoCriado

  before(() => {
    cy.criarUsuarioEObterToken().then(({ usuario, token: authToken }) => {
      usuarioCriado = usuario
      token = authToken

      return cy.fixture('produto').then((fixture) => {
        return cy
          .request({
            method: 'POST',
            url: '/produtos',
            headers: { Authorization: token },
            body: {
              ...fixture,
              nome: `Produto Carrinho ${Date.now()}`,
              quantidade: 50,
            },
          })
          .then((res) => {
            expect(res.status, 'POST /produtos (setup): status deve ser 201').to.eq(201)
            expect(res.body, 'POST /produtos (setup): body deve conter _id do produto').to.have.property(
              '_id'
            )
            produtoCriado = { _id: res.body._id, preco: fixture.preco }
          })
      })
    })
  })

  afterEach(() => {
    const tinhaCarrinho = Boolean(carrinhoCriado?._id)
    carrinhoCriado = null
    if (tinhaCarrinho && token) {
      cy.request({
        method: 'DELETE',
        url: '/carrinhos/cancelar-compra',
        headers: { Authorization: token },
        failOnStatusCode: false,
      })
    }
  })

  after(() => {
    if (token) {
      cy.request({
        method: 'DELETE',
        url: '/carrinhos/cancelar-compra',
        headers: { Authorization: token },
        failOnStatusCode: false,
      })
    }
    if (produtoCriado?._id && token) {
      cy.request({
        method: 'DELETE',
        url: `/produtos/${produtoCriado._id}`,
        headers: { Authorization: token },
        failOnStatusCode: false,
      })
    }
    if (usuarioCriado?._id) {
      cy.request({
        method: 'DELETE',
        url: `/usuarios/${usuarioCriado._id}`,
        failOnStatusCode: false,
      })
    }
  })

  it('deve listar carrinhos e retornar estrutura de dados correta', () => {
    cy.request({
      method: 'GET',
      url: '/carrinhos',
    }).then((response) => {
      expect(response.status, 'GET /carrinhos: status HTTP deve ser 200').to.eq(200)
      expect(response.body, 'GET /carrinhos: body deve ter campo quantidade (total na lista)').to.have.property(
        'quantidade'
      )
      expect(response.body.quantidade, 'GET /carrinhos: quantidade deve ser número').to.be.a('number')
      expect(response.body, 'GET /carrinhos: body deve ter array carrinhos').to.have.property('carrinhos')
      expect(response.body.carrinhos, 'GET /carrinhos: carrinhos deve ser um array').to.be.an('array')

      if (response.body.carrinhos.length > 0) {
        const primeiro = response.body.carrinhos[0]
        expect(
          primeiro,
          'GET /carrinhos: cada item deve trazer produtos, precoTotal, quantidadeTotal, idUsuario, _id'
        ).to.include.keys('produtos', 'precoTotal', 'quantidadeTotal', 'idUsuario', '_id')
        expect(primeiro.produtos, 'GET /carrinhos: campo produtos do item deve ser array').to.be.an(
          'array'
        )
      }
    })
  })

  it('deve cadastrar um carrinho com produto válido, validar itens e retornar o ID', () => {
    const quantidadeNoCarrinho = 2

    cy.request({
      method: 'POST',
      url: '/carrinhos',
      headers: { Authorization: token },
      body: {
        produtos: [{ idProduto: produtoCriado._id, quantidade: quantidadeNoCarrinho }],
      },
    }).then((response) => {
      expect(response.status, 'POST /carrinhos: cadastro com produto válido deve retornar 201').to.eq(
        201
      )
      expect(
        response.body,
        'POST /carrinhos: mensagem de sucesso esperada da API'
      ).to.have.property('message', 'Cadastro realizado com sucesso')
      expect(
        response.body._id,
        'POST /carrinhos: resposta deve incluir _id do carrinho (string não vazia)'
      )
        .to.be.a('string')
        .and.not.be.empty

      const carrinhoId = response.body._id
      carrinhoCriado = { _id: carrinhoId }

      return cy.request({
        method: 'GET',
        url: `/carrinhos/${carrinhoId}`,
      })
    }).then((detalhe) => {
      expect(
        detalhe.status,
        'GET /carrinhos/:id após cadastro: status deve ser 200'
      ).to.eq(200)
      expect(
        detalhe.body._id,
        'GET /carrinhos/:id: _id do carrinho deve ser o mesmo retornado no POST'
      ).to.eq(carrinhoCriado._id)

      expect(
        detalhe.body.produtos,
        'GET /carrinhos/:id: produtos deve ser um array (linhas do carrinho)'
      ).to.be.an('array')
      expect(
        detalhe.body.produtos,
        'GET /carrinhos/:id: deve haver exatamente 1 linha de produto (1 SKU diferente)'
      ).to.have.length(1)
      expect(
        detalhe.body.produtos[0].idProduto,
        'GET /carrinhos/:id: idProduto da linha deve ser o produto enviado no POST'
      ).to.eq(produtoCriado._id)
      expect(
        detalhe.body.produtos[0].quantidade,
        'GET /carrinhos/:id: quantidade na linha deve ser a enviada no POST'
      ).to.eq(quantidadeNoCarrinho)

      expect(
        detalhe.body.quantidadeTotal,
        'GET /carrinhos/:id: quantidadeTotal deve ser a soma de unidades (2 unidades)'
      ).to.eq(quantidadeNoCarrinho)
      expect(
        detalhe.body.precoTotal,
        'GET /carrinhos/:id: precoTotal deve ser preço unitário × quantidade (2 × preço do produto)'
      ).to.eq(produtoCriado.preco * quantidadeNoCarrinho)
    })
  })

  it('deve buscar um carrinho pelo ID e retornar campos calculados corretamente', () => {
    cy.request({
      method: 'POST',
      url: '/carrinhos',
      headers: { Authorization: token },
      body: {
        produtos: [{ idProduto: produtoCriado._id, quantidade: 3 }],
      },
    }).then((res) => {
      expect(res.status, 'POST /carrinho (pré-busca): deve retornar 201').to.eq(201)
      carrinhoCriado = { _id: res.body._id }

      return cy.request({
        method: 'GET',
        url: `/carrinhos/${carrinhoCriado._id}`,
      })
    }).then((response) => {
      expect(response.status, 'GET /carrinhos/:id: status deve ser 200').to.eq(200)
      expect(
        response.body,
        'GET /carrinhos/:id: body deve conter produtos, precoTotal, quantidadeTotal, idUsuario, _id'
      ).to.include.keys('produtos', 'precoTotal', 'quantidadeTotal', 'idUsuario', '_id')
      expect(
        response.body._id,
        'GET /carrinhos/:id: _id deve coincidir com o carrinho criado'
      ).to.eq(carrinhoCriado._id)
      expect(
        response.body.idUsuario,
        'GET /carrinhos/:id: idUsuario deve ser o usuário dono do token'
      ).to.eq(usuarioCriado._id)
      expect(
        response.body.quantidadeTotal,
        'GET /carrinhos/:id: quantidadeTotal deve ser 3 (unidades pedidas)'
      ).to.eq(3)
      expect(
        response.body.precoTotal,
        'GET /carrinhos/:id: precoTotal deve ser 3 × preço unitário'
      ).to.eq(produtoCriado.preco * 3)
      expect(
        response.body.produtos,
        'GET /carrinhos/:id: uma única linha de produto no carrinho'
      ).to.have.length(1)
    })
  })

  it('deve concluir compra com sucesso e remover o carrinho', () => {
    cy.request({
      method: 'POST',
      url: '/carrinhos',
      headers: { Authorization: token },
      body: {
        produtos: [{ idProduto: produtoCriado._id, quantidade: 1 }],
      },
    }).then((res) => {
      expect(res.status, 'POST /carrinhos (pré-concluir): deve retornar 201').to.eq(201)
      carrinhoCriado = { _id: res.body._id }

      return cy.request({
        method: 'DELETE',
        url: '/carrinhos/concluir-compra',
        headers: { Authorization: token },
      })
    }).then((response) => {
      expect(
        response.status,
        'DELETE /carrinhos/concluir-compra: status deve ser 200'
      ).to.eq(200)
      expect(
        response.body.message,
        'DELETE /carrinhos/concluir-compra: mensagem deve indicar exclusão com sucesso'
      ).to.match(/Registro excluído com sucesso/)
      carrinhoCriado = null
    })
  })

  it('deve cancelar compra com sucesso e devolver produtos ao estoque', () => {
    let quantidadeAntes

    cy.request({ method: 'GET', url: `/produtos/${produtoCriado._id}` }).then((res) => {
      expect(res.status, 'GET /produtos/:id (antes do carrinho): status 200').to.eq(200)
      quantidadeAntes = res.body.quantidade

      return cy.request({
        method: 'POST',
        url: '/carrinhos',
        headers: { Authorization: token },
        body: {
          produtos: [{ idProduto: produtoCriado._id, quantidade: 2 }],
        },
      })
    }).then((resCar) => {
      expect(resCar.status, 'POST /carrinhos (pré-cancelar): deve retornar 201').to.eq(201)
      carrinhoCriado = { _id: resCar.body._id }

      return cy.request({
        method: 'DELETE',
        url: '/carrinhos/cancelar-compra',
        headers: { Authorization: token },
      })
    }).then((response) => {
      expect(
        response.status,
        'DELETE /carrinhos/cancelar-compra: status deve ser 200'
      ).to.eq(200)
      expect(
        response.body.message,
        'DELETE /carrinhos/cancelar-compra: mensagem deve indicar exclusão com sucesso'
      ).to.match(/Registro excluído com sucesso/)

      return cy.request({ method: 'GET', url: `/produtos/${produtoCriado._id}` })
    }).then((resProd) => {
      expect(
        resProd.body.quantidade,
        'Após cancelar compra, estoque do produto deve voltar ao valor anterior ao carrinho'
      ).to.eq(quantidadeAntes)
      carrinhoCriado = null
    })
  })

  it('deve retornar 401 ao tentar criar carrinho sem token de autenticação', () => {
    cy.request({
      method: 'POST',
      url: '/carrinhos',
      body: {
        produtos: [{ idProduto: produtoCriado._id, quantidade: 1 }],
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(
        response.status,
        'POST /carrinhos sem Authorization: API deve responder 401'
      ).to.eq(401)
      expect(
        response.body,
        'POST /carrinhos sem token: mensagem padrão de token ausente/inválido'
      ).to.have.property(
        'message',
        'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
      )
    })
  })
})
