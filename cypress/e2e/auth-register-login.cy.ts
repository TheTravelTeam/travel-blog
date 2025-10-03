describe('Auth - register, login and logout', () => {
  const timestamp = Date.now();
  const email = `cypress_user_${timestamp}@example.com`;
  const password = 'Password123!';
  const pseudo = `Cypress User ${timestamp}`;
  const userProfile = {
    id: timestamp,
    email,
    pseudo,
    roles: ['USER'],
  };

  let isAuthenticated = false;

  beforeEach(() => {
    isAuthenticated = false;

    cy.viewport(1480, 720);

    cy.intercept('GET', '**/api/auth/me', (req) => {
      if (isAuthenticated) {
        req.alias = 'authMeSuccess';
        req.reply({ statusCode: 200, body: userProfile });
        return;
      }

      req.alias = 'authMeUnauthorized';
      req.reply({ statusCode: 401, body: {} });
    });

    cy.intercept('POST', '**/api/auth/register', (req) => {
      expect(req.body).to.deep.include({ email, pseudo });
      expect(req.body.password).to.eq(password);

      req.reply({ statusCode: 201, body: { id: userProfile.id } });
    }).as('register');

    cy.intercept('POST', '**/api/auth/login', (req) => {
      expect(req.body).to.deep.equal({ email, password });
      isAuthenticated = true;

      req.reply({ statusCode: 200, body: '' });
    }).as('login');

    cy.intercept('POST', '**/api/auth/logout', (req) => {
      isAuthenticated = false;
      req.reply({ statusCode: 204, body: '' });
    }).as('logout');
  });

  it('allows a visitor to create an account, sign in, then sign out', () => {
    cy.visit('/login');
    // --- PHASE 1: aller vers l’inscription ---
    cy.contains('button, a', 'Créer un compte', { matchCase: false }).click();

    // On arrive sur /register (si différent, adapte cette asser)
    cy.url().should('include', '/register');

    cy.wait('@authMeUnauthorized').its('response.statusCode').should('eq', 401);

    cy.get('[data-test="register-pseudo"]').find('input').type(pseudo);
    cy.get('[data-test="register-email"]').find('input').type(email);
    cy.get('[data-test="register-password"]').find('input').type(password);
    cy.get('[data-test="register-confirm-password"]').find('input').type(password);

    cy.get('[data-test="register-submit"]').find('button').click();

    cy.wait('@register').its('response.statusCode').should('eq', 201);

    cy.url().should('include', '/login');
    cy.contains('Connexion').should('be.visible');

    cy.get('[data-test="login-email"]').find('input').type(email);
    cy.get('[data-test="login-password"]').find('input').type(password);
    cy.get('[data-test="login-submit"]').find('button').click();

    cy.wait('@login').its('response.statusCode').should('eq', 200);
    cy.wait('@authMeSuccess').its('response.statusCode').should('eq', 200);

    cy.url().should('include', '/travels');
    cy.get('[data-test="topbar-me"]').should('be.visible');

    cy.get('[data-test="topbar-logout"]').find('button').click();

    cy.wait('@logout').its('response.statusCode').should('eq', 204);

    cy.url().should('include', '/login');
    cy.get('[data-test="login-form"]').should('be.visible');
  });
});
