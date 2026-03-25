function requestMeta(args) {
  if (typeof args[0] === 'string') {
    return args.length === 1
      ? { method: 'GET', url: args[0] }
      : { method: String(args[0]).toUpperCase(), url: args[1] }
  }
  const o = args[0] || {}
  return {
    method: (o.method || 'GET').toUpperCase(),
    url: o.url || '',
  }
}

Cypress.Commands.overwrite('request', (originalFn, ...args) => {
  return originalFn(...args).then((response) => {
    const { method, url } = requestMeta(args)
    const summary = `${method} ${url} → ${response.status}`
    const bodyStr = JSON.stringify(response.body, null, 2)
    Cypress.log({
      name: 'Response',
      message: `${summary}\n${bodyStr}`,
      consoleProps: () => ({
        status: response.status,
        body: response.body,
      }),
    })

    console.log(`[API] ${summary}`, response.body)
    return response
  })
})

Cypress.Commands.add('criarUsuario', (overrides = {}) => {
    const timestamp = Date.now()
    const usuario = {
      nome: 'Fulano da Silva',
      email: `qa_tester_${timestamp}@serverest.com`,
      password: 'teste',
      administrador: 'true',
      ...overrides,
    }
  
    return cy
      .request({
        method: 'POST',
        url: '/usuarios',
        body: usuario,
        failOnStatusCode: false,
      })
      .then((response) => {
        return { ...usuario, _id: response.body._id }
      })
  })
  
  Cypress.Commands.add('obterToken', (email, password) => {
    return cy
      .request({
        method: 'POST',
        url: '/login',
        body: { email, password },
      })
      .then((response) => {
        return response.body.authorization
      })
  })
  
  Cypress.Commands.add('criarUsuarioEObterToken', () => {
    return cy.criarUsuario().then((usuario) => {
      return cy.obterToken(usuario.email, usuario.password).then((token) => {
        return { usuario, token }
      })
    })
  })
  