describe('User diary journey', () => {
  const userId = 2;
  const userEmail = 'traveler@example.com';
  const userPassword = 'TravelerPass1!';

  type DiaryData = {
    id: number;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    private: boolean;
    isPrivate: boolean;
    published: boolean;
    isPublished: boolean;
    status: string;
    canComment: boolean;
    media: { id: number; fileUrl: string; mediaType: string } | null;
    steps: StepData[];
    user: { id: number; pseudo: string };
  };

  type StepData = {
    id: number;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
    continent: string | null;
    status: string | null;
    media: { id: number; fileUrl: string; mediaType: string }[];
    themeIds: number[];
    themes: any[];
    startDate: string | null;
    endDate: string | null;
    likes: number;
    comments: any[];
    travelDiaryId: number;
    isEditing?: boolean;
  };

  let isAuthenticated = false;
  let diariesById: Map<number, DiaryData>;
  let diaryCounter = 700;
  let stepCounter = 4000;
  let createdDiaryId: number | null = null;
  let firstStepId: number | null = null;
  let secondStepId: number | null = null;

  const buildDiaryClone = (diary: DiaryData) =>
    JSON.parse(JSON.stringify(diary)) as DiaryData;

  const buildUserProfile = (id: number): Record<string, unknown> => ({
    id,
    pseudo: id === userId ? 'Voyageuse' : 'Utilisateur',
    email: id === userId ? userEmail : `user${id}@example.com`,
    roles: ['USER'],
    travelDiaries: Array.from(diariesById.values()).map(buildDiaryClone),
  });

  const seedBaseData = () => {
    diariesById = new Map();
    diaryCounter = 700;
    stepCounter = 4000;
    createdDiaryId = null;
    firstStepId = null;
    secondStepId = null;

    const baseDiary: DiaryData = {
      id: 201,
      title: 'Carnet Japon',
      description: 'Découverte de Tokyo et Kyoto.',
      latitude: 35.6762,
      longitude: 139.6503,
      private: false,
      isPrivate: false,
      published: true,
      isPublished: true,
      status: 'IN_PROGRESS',
      canComment: true,
      media: { id: 9001, fileUrl: 'https://example.com/japan.jpg', mediaType: 'PHOTO' },
      steps: [
        {
          id: 801,
          title: 'Tokyo de nuit',
          description: '<p>Balade à Shibuya.</p>',
          latitude: 35.6762,
          longitude: 139.6503,
          city: 'Tokyo',
          country: 'Japon',
          continent: 'Asie',
          status: 'IN_PROGRESS',
          media: [],
          themeIds: [],
          themes: [],
          startDate: null,
          endDate: null,
          likes: 0,
          comments: [],
          travelDiaryId: 201,
        },
      ],
      user: { id: userId, pseudo: 'Voyageuse' },
    };

    const otherDiary: DiaryData = {
      id: 202,
      title: 'Aventures Islandaises',
      description: 'Road-trip autour de Reykjavik.',
      latitude: 64.1466,
      longitude: -21.9426,
      private: false,
      isPrivate: false,
      published: true,
      isPublished: true,
      status: 'COMPLETED',
      canComment: true,
      media: { id: 9002, fileUrl: 'https://example.com/iceland.jpg', mediaType: 'PHOTO' },
      steps: [
        {
          id: 802,
          title: 'Reykjavik',
          description: '<p>Découverte de la capitale.</p>',
          latitude: 64.1466,
          longitude: -21.9426,
          city: 'Reykjavik',
          country: 'Islande',
          continent: 'Europe',
          status: 'COMPLETED',
          media: [],
          themeIds: [],
          themes: [],
          startDate: null,
          endDate: null,
          likes: 0,
          comments: [],
          travelDiaryId: 202,
        },
      ],
      user: { id: userId, pseudo: 'Voyageuse' },
    };

    diariesById.set(baseDiary.id, baseDiary);
    diariesById.set(otherDiary.id, otherDiary);
  };

  const buildSearchPayload = (query: string) => {
    if (!query || query.trim().length < 2) {
      return { diaries: [], steps: [] };
    }
    const lowered = query.toLowerCase();
    const diaries: Array<Record<string, unknown>> = [];
    const steps: Array<Record<string, unknown>> = [];

    diariesById.forEach((diary) => {
      if (diary.title.toLowerCase().includes(lowered)) {
        diaries.push({
          id: diary.id,
          title: diary.title,
          description: diary.description,
          coverUrl: diary.media?.fileUrl ?? null,
        });
      }

      diary.steps.forEach((step) => {
        if (step.title.toLowerCase().includes(lowered)) {
          steps.push({
            id: step.id,
            title: step.title,
            diaryId: diary.id,
            diaryTitle: diary.title,
            excerpt: step.description.replace(/<[^>]+>/g, '').slice(0, 120),
          });
        }
      });
    });

    return { diaries, steps };
  };

  beforeEach(() => {
    isAuthenticated = false;
    seedBaseData();

    cy.viewport(1440, 900);

    cy.intercept('GET', '**/api/auth/me', (req) => {
      if (isAuthenticated) {
        req.alias = 'authMeSuccess';
        req.reply({
          statusCode: 200,
          body: {
            id: userId,
            email: userEmail,
            pseudo: 'Voyageuse',
            roles: ['USER'],
            travelDiaries: Array.from(diariesById.values()).map(buildDiaryClone),
          },
        });
      } else {
        req.alias = 'authMeUnauthorized';
        req.reply({ statusCode: 401, body: {} });
      }
    });

    cy.intercept('POST', '**/api/auth/login', (req) => {
      expect(req.body.email).to.eq(userEmail);
      expect(req.body.password).to.eq(userPassword);
      isAuthenticated = true;
      req.reply({ statusCode: 200, body: '' });
    }).as('login');

    cy.intercept('GET', '**/api/themes', {
      statusCode: 200,
      body: [
        { id: 1, name: 'Aventure' },
        { id: 2, name: 'Nature' },
      ],
    }).as('getThemes');

    cy.intercept('GET', '**/api/articles', {
      statusCode: 200,
      body: [],
    }).as('getArticles');

    cy.intercept('GET', '**/api/travel-diaries', (req) => {
      req.reply({
        statusCode: 200,
        body: Array.from(diariesById.values()).map(buildDiaryClone),
      });
    }).as('listDiaries');

    cy.intercept('GET', '**/api/users/**', (req) => {
      const userIdFromUrl = Number(req.url.split('/').pop());
      req.reply({ statusCode: 200, body: buildUserProfile(userIdFromUrl) });
    }).as('getUserProfile');

    cy.intercept('GET', '**/api/travel-diaries/**', (req) => {
      const parts = req.url.split('/');
      const diaryIdParam = Number(parts.pop());
      const diary = diariesById.get(diaryIdParam);
      if (!diary) {
        req.reply({ statusCode: 404, body: { message: 'Not found' } });
        return;
      }
      req.reply({ statusCode: 200, body: buildDiaryClone(diary) });
    }).as('getDiary');

    cy.intercept('POST', '**/api/travel-diaries', (req) => {
      const body = req.body ?? {};
      diaryCounter += 1;
      const newDiaryId = diaryCounter;
      const newDiary: DiaryData = {
        id: newDiaryId,
        title: body.title ?? 'Nouveau carnet',
        description: body.description ?? '',
        latitude: body.latitude ?? 0,
        longitude: body.longitude ?? 0,
        private: Boolean(body.isPrivate),
        isPrivate: Boolean(body.isPrivate),
        published: body.isPublished !== false,
        isPublished: body.isPublished !== false,
        status: body.status ?? 'IN_PROGRESS',
        canComment: body.canComment !== false,
        media: body.media
          ? { id: Math.floor(Math.random() * 10000), fileUrl: body.media.fileUrl, mediaType: 'PHOTO' }
          : null,
        steps: [],
        user: { id: userId, pseudo: 'Voyageuse' },
      };

      diariesById.set(newDiaryId, newDiary);
      createdDiaryId = newDiaryId;

      req.reply({ statusCode: 201, body: buildDiaryClone(newDiary) });
    }).as('createDiary');

    cy.intercept('POST', '**/api/steps', (req) => {
      const body = req.body ?? {};
      const diaryIdParam = Number(body.travelDiaryId);
      const diary = diariesById.get(diaryIdParam);
      stepCounter += 1;
      const newStepId = stepCounter;
      const step: StepData = {
        id: newStepId,
        title: body.title ?? 'Nouvelle étape',
        description: body.description ?? '',
        latitude: Number(body.latitude ?? 0),
        longitude: Number(body.longitude ?? 0),
        city: body.city ?? null,
        country: body.country ?? null,
        continent: body.continent ?? null,
        status: body.status ?? 'IN_PROGRESS',
        media: [],
        themeIds: Array.isArray(body.themeIds) ? body.themeIds : [],
        themes: [],
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        likes: 0,
        comments: [],
        travelDiaryId: diaryIdParam,
      };

      if (diary) {
        diary.steps = [...diary.steps, step];
      }

      if (!firstStepId) {
        firstStepId = newStepId;
      } else if (!secondStepId) {
        secondStepId = newStepId;
      }

      req.reply({ statusCode: 201, body: { ...step, media: [] } });
    }).as('createStep');

    cy.intercept('PUT', '**/api/steps/**', (req) => {
      const parts = req.url.split('/');
      const stepId = Number(parts.pop());
      const body = req.body ?? {};
      diariesById.forEach((diary) => {
        const targetIndex = diary.steps.findIndex((step) => step.id === stepId);
        if (targetIndex !== -1) {
          diary.steps[targetIndex] = {
            ...diary.steps[targetIndex],
            title: body.title ?? diary.steps[targetIndex].title,
            description: body.description ?? diary.steps[targetIndex].description,
            latitude: Number(body.latitude ?? diary.steps[targetIndex].latitude),
            longitude: Number(body.longitude ?? diary.steps[targetIndex].longitude),
            city: body.city ?? diary.steps[targetIndex].city,
            country: body.country ?? diary.steps[targetIndex].country,
            continent: body.continent ?? diary.steps[targetIndex].continent,
            status: body.status ?? diary.steps[targetIndex].status,
            startDate: body.startDate ?? diary.steps[targetIndex].startDate,
            endDate: body.endDate ?? diary.steps[targetIndex].endDate,
            themeIds: Array.isArray(body.themeIds)
              ? body.themeIds
              : diary.steps[targetIndex].themeIds,
          };
        }
      });

      req.reply({ statusCode: 200, body: { success: true } });
    }).as('updateStep');

    cy.intercept('DELETE', '**/api/steps/**', (req) => {
      const parts = req.url.split('/');
      const stepId = Number(parts.pop());
      diariesById.forEach((diary) => {
        diary.steps = diary.steps.filter((step) => step.id !== stepId);
      });
      req.reply({ statusCode: 204, body: '' });
    }).as('deleteStep');

    cy.intercept('GET', '**/api/search*', (req) => {
      const query = (req.query?.query as string | undefined) ?? '';
      req.reply({ statusCode: 200, body: buildSearchPayload(query) });
    }).as('search');

    cy.intercept('POST', '**/api/medias', {
      statusCode: 201,
      body: { id: Math.floor(Math.random() * 10000) },
    }).as('createMedia');

    cy.intercept('DELETE', '**/api/medias/**', {
      statusCode: 204,
      body: '',
    }).as('deleteMedia');

    cy.intercept('GET', 'https://nominatim.openstreetmap.org/reverse*', (req) => {
      const latParam = Number(req.query?.lat ?? 0);
      let city = 'Capri';
      let country = 'Italie';
      let continent = 'Europe';

      if (latParam > 60) {
        city = 'Reykjavik';
        country = 'Islande';
        continent = 'Europe';
      }

      req.alias = 'reverseGeocode';
      req.reply({
        statusCode: 200,
        body: {
          address: {
            city,
            country,
            continent,
            country_code: country === 'Italie' ? 'it' : 'is',
          },
        },
      });
    }).as('reverseGeocode');
  });

  it('allows a traveler to create and manage diaries, steps, and map searches', () => {
    cy.visit('/login');

    cy.wait('@authMeUnauthorized');

    cy.get('[data-test="login-email"]').find('input').type(userEmail);
    cy.get('[data-test="login-password"]').find('input').type(userPassword);
    cy.get('[data-test="login-submit"]').find('button').click();

    cy.wait('@login');
    cy.wait('@authMeSuccess');
    cy.wait('@listDiaries');

    cy.url().should('include', '/travels');

    cy.get('[data-test="topbar-my-diaries"]').first().click();
    cy.wait('@getUserProfile');
    cy.url().should('include', `/travels/users/${userId}`);

    cy.get('[data-test="my-diaries-page"]').should('be.visible');
    cy.get('[data-test="my-diary-201"]').should('exist');

    cy.get('[data-test="my-diaries-add"]').find('button').click();
    cy.wait('@getThemes');

    cy.get('[data-test="create-diary-modal"]').should('be.visible');
    cy.get('[data-test="create-diary-title"]').find('input').type('Carnet Explorer');
    cy.get('[data-test="create-diary-cover"]').find('input').type('https://example.com/explorer.jpg');
    cy.get('[data-test="create-diary-form"] .ql-editor')
      .first()
      .clear()
      .type('Carnet des explorations méditerranéennes.');
    cy.get('[data-test="create-diary-continue"]').find('button').click();

    cy.get('[data-test="create-first-step-form"]').should('be.visible');
    cy.get('[data-test="create-step-location"]').find('button').click();
    cy.get('[data-test="location-picker-modal"]').should('be.visible');
    cy.get('[data-test="location-picker-map"]').should('be.visible').click('center', {
      force: true,
    });
    cy.get('[data-test="location-picker-confirm"]').find('button').click();
    cy.wait('@reverseGeocode');
    cy.get('[data-test="create-first-step-form"]').should('be.visible');
    cy.get('[data-test="create-step-title"]').find('input').clear().type('Capri - Jour 1');
    cy.get('[data-test="create-first-step-form"] .ql-editor')
      .first()
      .clear()
      .type('Arrivée sur l\'île et balade au coucher du soleil.');
    cy.get('[data-test="create-step-submit"]').find('button').click();

    cy.wait(['@createDiary', '@getDiary']).then(([createDiary]) => {
      createdDiaryId = createDiary?.response?.body?.id ?? null;
      expect(createdDiaryId).to.be.a('number');
      cy.url().should('include', `/travels/${createdDiaryId}`);
    });

    cy.then(() => {
      expect(createdDiaryId).to.not.be.null;
    });

    cy.wait(['@createStep', '@getDiary']).then(([createStep]) => {
      const stepId = createStep?.response?.body?.id;
      firstStepId = stepId ?? firstStepId;
      expect(firstStepId).to.be.a('number');
    });

    cy.then(() => {
      expect(firstStepId).to.not.be.null;
      cy.get(`[data-test="diary-step-${firstStepId}"]`).should('exist');
    });

    cy.contains('Carnet Explorer').should('be.visible');

    cy.get('[data-test="diary-add-step"]').find('button').click();

    cy.get('[data-test="create-step-form"]').should('be.visible');
    cy.get('[data-test="step-form-location"]').find('button').click();
    cy.get('[data-test="location-picker-modal"]').should('be.visible');
    cy.get('[data-test="location-picker-map"]').should('be.visible').click('center', {
      force: true,
    });
    cy.get('[data-test="location-picker-confirm"]').find('button').click();

    cy.get('[data-test="create-step-form"]').should('be.visible');
    cy.get('[data-test="step-form-title"]').find('input').clear().type('Capri - Jour 2');
    cy.get('[data-test="create-step-form"] .ql-editor')
      .first()
      .clear()
      .type('Exploration des grottes marines et baignade matinale.');
    cy.get('[data-test="step-form-submit"]').find('button').click();

    cy.wait(['@createStep', '@getDiary']).then(([createStep]) => {
      const stepId = createStep?.response?.body?.id;
      secondStepId = stepId ?? secondStepId;
      expect(secondStepId).to.be.a('number');
      cy.get(`[data-test="diary-step-${secondStepId}"]`).should('exist');
    });

    cy.then(() => {
      expect(secondStepId, 'second step id should be set before editing').to.be.a('number');
      return cy
        .get(`[data-test="step-edit-${secondStepId}"]`)
        .click({ force: true });
    });
    cy.get('[data-test="create-step-form"]').should('be.visible');
    cy.get('[data-test="step-form-title"]').find('input').clear().type('Capri - Jour 2 (modifié)');
    cy.get('[data-test="create-step-form"] .ql-editor')
      .first()
      .clear()
      .type('Matinée sur la mer puis dégustation de spécialités locales.');
    cy.get('[data-test="step-form-submit"]').find('button').click();

    cy.wait('@updateStep');
    cy.wait('@getDiary');
    cy.contains('Capri - Jour 2 (modifié)').scrollIntoView().should('be.visible');

    cy.then(() => {
      expect(secondStepId, 'second step id should be set before deletion').to.be.a('number');
      return cy
        .get(`[data-test="step-delete-${secondStepId}"]`)
        .click({ force: true });
    });
    cy.wait('@deleteStep');
    cy.wait('@getDiary');
    cy.get(`[data-test="diary-step-${secondStepId}"]`).should('not.exist');

    cy.get('[data-test="topbar-search-input"]').focus().clear().type('Carnet Explorer');
    cy.wait('@search').then(() => {
      expect(createdDiaryId, 'created diary id should be defined before search result click').to.be.a('number');
      cy.get('.topbar__search-results').should('be.visible');
      return cy
        .get(`[data-test="topbar-search-result-${createdDiaryId}"]`)
        .first()
        .should('be.visible')
        .click();
    });
    cy.wait('@getDiary');
    cy.then(() => {
      expect(createdDiaryId, 'created diary id should be defined before checking redirected url').to.be.a('number');
      cy.url().should('include', `/travels/${createdDiaryId}`);
    });

    cy.get('[data-test="topbar-search-input"]').focus().clear().type('Tokyo');
    cy.wait('@search').then((search) => {
      const responseBody = (search?.response?.body ?? {}) as {
        steps?: Array<{ id: number; title: string }>;
      };
      const steps = responseBody.steps ?? [];
      expect(steps.length, 'expected at least one step search result').to.be.greaterThan(0);
      const targetStep = steps.find((item) => item.title === 'Tokyo de nuit') ?? steps[0];
      const targetStepId = targetStep?.id;
      expect(targetStepId, 'step result id should be defined').to.be.a('number');
      cy.get('.topbar__search-results').should('be.visible');
      return cy
        .get(`[data-test="topbar-search-result-${targetStepId as number}"]`)
        .first()
        .should('be.visible')
        .click();
    });
    cy.wait('@getDiary');
    cy.url().should('include', '/travels/201');
    cy.get('[data-test="diary-step-801"]').should('exist');

    cy.get('[data-test="topbar-search-input"]').focus().clear().type('Islandaises');
    cy.wait('@search').then((search) => {
      const responseBody = (search?.response?.body ?? {}) as {
        diaries?: Array<{ id: number; title: string }>;
      };
      const diaries = responseBody.diaries ?? [];
      expect(diaries.length, 'expected at least one diary search result').to.be.greaterThan(0);
      const targetDiary = diaries.find((item) => item.title === 'Aventures Islandaises') ?? diaries[0];
      const targetDiaryId = targetDiary?.id;
      expect(targetDiaryId, 'diary result id should be defined').to.be.a('number');
      cy.get('.topbar__search-results').should('be.visible');
      return cy
        .get(`[data-test="topbar-search-result-${targetDiaryId as number}"]`)
        .first()
        .should('be.visible')
        .click();
    });
    cy.wait('@getDiary');
    cy.url().should('include', '/travels/202');
    cy.contains('Aventures Islandaises').should('be.visible');
  });
});
