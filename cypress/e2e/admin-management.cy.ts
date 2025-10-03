describe('Admin - manage users and diaries', () => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'AdminPass1!';

  const adminProfile = {
    id: 1,
    pseudo: 'Super Admin',
    email: adminEmail,
    roles: ['ADMIN'],
    travelDiaries: [],
  };

  const baseDiaries = [
    {
      id: 201,
      title: 'Carnet Japon',
      latitude: 35.6762,
      longitude: 139.6503,
      private: false,
      isPrivate: false,
      published: true,
      isPublished: true,
      status: 'IN_PROGRESS',
      description: 'Découverte de Tokyo et Kyoto.',
      steps: [
        {
          id: 501,
          title: 'Tokyo',
          description: 'Shibuya et Asakusa.',
          latitude: 35.6762,
          longitude: 139.6503,
          media: [],
          country: 'Japon',
          city: 'Tokyo',
          continent: 'Asie',
          startDate: null,
          endDate: null,
          status: 'IN_PROGRESS',
          themeIds: [],
          themes: [],
          travelDiaryId: 201,
          isEditing: false,
          likes: 0,
        },
      ],
      user: {
        id: 2,
        pseudo: 'LucieVoyage',
      },
      media: null,
    },
    {
      id: 202,
      title: 'Carnet Norvège',
      latitude: 60.472,
      longitude: 8.4689,
      private: false,
      isPrivate: false,
      published: false,
      isPublished: false,
      status: 'IN_PROGRESS',
      description: 'Road-trip dans les fjords.',
      steps: [
        {
          id: 502,
          title: 'Oslo',
          description: 'Musées et balade.',
          latitude: 59.9139,
          longitude: 10.7522,
          media: [],
          country: 'Norvège',
          city: 'Oslo',
          continent: 'Europe',
          startDate: null,
          endDate: null,
          status: 'IN_PROGRESS',
          themeIds: [],
          themes: [],
          travelDiaryId: 202,
          isEditing: false,
          likes: 0,
        },
      ],
      user: {
        id: 2,
        pseudo: 'LucieVoyage',
      },
      media: null,
    },
  ];

  const managedUserBase = {
    id: 2,
    pseudo: 'LucieVoyage',
    email: 'lucie@example.com',
    roles: ['USER'],
  };

  let isAuthenticated = false;
  let managedUserRoles: ('USER' | 'ADMIN')[];
  let diariesById: Map<number, any>;
  let userDeleted: boolean;

  function buildManagedUserPayload() {
    const diaries = Array.from(diariesById.values()).map((diary) => ({ ...diary }));
    return {
      ...managedUserBase,
      roles: [...managedUserRoles],
      travelDiaries: diaries,
    };
  }

  beforeEach(() => {
    isAuthenticated = false;
    managedUserRoles = ['USER'];
    diariesById = new Map(baseDiaries.map((diary) => [diary.id, { ...diary }]));
    userDeleted = false;

    cy.viewport(1440, 900);

    cy.intercept('GET', '**/api/auth/me', (req) => {
      if (isAuthenticated) {
        req.alias = 'authMeSuccess';
        req.reply({ statusCode: 200, body: adminProfile });
        return;
      }
      req.alias = 'authMeUnauthorized';
      req.reply({ statusCode: 401, body: {} });
    });

    cy.intercept('POST', '**/api/auth/login', (req) => {
      expect(req.body.email).to.eq(adminEmail);
      expect(req.body.password).to.eq(adminPassword);
      isAuthenticated = true;
      req.reply({ statusCode: 200, body: '' });
    }).as('login');

    cy.intercept('GET', '**/api/travel-diaries*', (req) => {
      req.reply({ statusCode: 200, body: [] });
    }).as('loadDiaries');

    cy.intercept('GET', '**/api/users', (req) => {
      if (userDeleted) {
        req.reply({ statusCode: 200, body: [] });
        return;
      }
      req.reply({ statusCode: 200, body: [buildManagedUserPayload()] });
    }).as('getUsers');

    cy.intercept('GET', '**/api/users/*', (req) => {
      const userId = Number(req.url.split('/').pop());
      if (userDeleted) {
        req.reply({ statusCode: 404, body: { message: 'Not found' } });
        return;
      }
      if (userId === managedUserBase.id) {
        req.reply({ statusCode: 200, body: buildManagedUserPayload() });
        return;
      }
      req.reply({ statusCode: 404, body: { message: 'Not found' } });
    }).as('getUserDetails');

    cy.intercept('PATCH', '**/api/users/*/roles', (req) => {
      const userId = Number(req.url.split('/').slice(-2)[0]);
      if (userId === managedUserBase.id) {
        const shouldBeAdmin = Boolean(req.body?.admin);
        managedUserRoles = [shouldBeAdmin ? 'ADMIN' : 'USER'];
        req.reply({ statusCode: 200, body: buildManagedUserPayload() });
        return;
      }
      req.reply({ statusCode: 404, body: { message: 'Not found' } });
    }).as('toggleRole');

    cy.intercept('PUT', '**/api/travel-diaries/*', (req) => {
      const diaryId = Number(req.url.split('/').pop());
      const current = diariesById.get(diaryId);
      if (!current) {
        req.reply({ statusCode: 404, body: { message: 'Diary not found' } });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (typeof req.body?.status === 'string') {
        updates['status'] = req.body.status;
        req.alias = 'updateDiaryStatus';
      }
      if (typeof req.body?.isPrivate === 'boolean') {
        updates['isPrivate'] = req.body.isPrivate;
        updates['private'] = req.body.isPrivate;
        req.alias = 'updateDiaryPrivacy';
      }

      const updatedDiary = { ...current, ...updates };
      diariesById.set(diaryId, updatedDiary);

      req.reply({ statusCode: 200, body: updatedDiary });
    });

    cy.intercept('DELETE', '**/api/travel-diaries/*', (req) => {
      const diaryId = Number(req.url.split('/').pop());
      if (diariesById.has(diaryId)) {
        diariesById.delete(diaryId);
        req.reply({ statusCode: 204, body: '' });
        return;
      }
      req.reply({ statusCode: 404, body: { message: 'Diary not found' } });
    }).as('deleteDiary');

    cy.intercept('DELETE', '**/api/users/*', (req) => {
      const userId = Number(req.url.split('/').pop());
      if (userId === managedUserBase.id && !userDeleted) {
        userDeleted = true;
        diariesById.clear();
        req.reply({ statusCode: 204, body: '' });
        return;
      }
      req.reply({ statusCode: 404, body: { message: 'Not found' } });
    }).as('deleteUser');
  });

  it('lets an admin promote a user and moderate diaries', () => {
    cy.visit('/login');

    cy.wait('@authMeUnauthorized');

    cy.get('[data-test="login-email"]').find('input').type(adminEmail);
    cy.get('[data-test="login-password"]').find('input').type(adminPassword);
    cy.get('[data-test="login-submit"]').find('button').click();

    cy.wait('@login');
    cy.wait('@authMeSuccess');

    cy.url().should('include', '/travels');
    cy.wait('@loadDiaries');
    cy.get('[data-test="topbar-me"]').should('be.visible').click();

    cy.url().should('include', '/me');

    cy.get('[data-test="users"]').find('button').click();
    cy.wait('@getUsers');
    cy.get('[data-test="admin-users-list"]').should('be.visible');

    cy.get('[data-test="admin-user-toggle-role-2"]').find('button').click();
    cy.wait('@toggleRole').its('response.statusCode').should('eq', 200);
    cy.get('[data-test="admin-user-2"]').contains('Admin');

    cy.get('[data-test="admin-user-view-diaries-2"]').find('button').click();
    cy.wait('@getUserDetails');
    cy.get('[data-test="admin-diary-201"]').should('be.visible');
    cy.get('[data-test="admin-diary-202"]').should('be.visible');

    cy.get('[data-test="admin-diary-toggle-status-201"]').find('button').click();
    cy.wait('@updateDiaryStatus');
    cy.contains('Carnet désactivé.').should('be.visible');
    cy.get('[data-test="admin-diary-201"]').contains('Désactivé');

    cy.get('[data-test="admin-diary-toggle-privacy-202"]').find('button').click();
    cy.wait('@updateDiaryPrivacy');
    cy.contains('Carnet rendu privé.').should('be.visible');
    cy.get('[data-test="admin-diary-202"]').contains('Privé');

    cy.get('[data-test="admin-diary-delete-202"]').find('button').click();
    cy.wait('@deleteDiary').its('response.statusCode').should('eq', 204);
    cy.get('[data-test="admin-diaries-feedback"]').contains('Carnet supprimé avec succès.');
    cy.get('[data-test="admin-diary-202"]').should('not.exist');

    cy.get('[data-test="admin-users-back"]').click();
    cy.get('[data-test="admin-users-list"]').should('be.visible');

    cy.get('[data-test="admin-user-delete-2"]').click();
    cy.wait('@deleteUser').its('response.statusCode').should('eq', 204);
    cy.get('[data-test="admin-users-feedback"]').contains('Utilisateur supprimé avec succès.');
    cy.contains('Aucun utilisateur trouvé.').should('be.visible');
  });
});
