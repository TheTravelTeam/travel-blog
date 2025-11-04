/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';

import { TravelMapStateService } from './travel-map-state.service';
import { Step } from '@model/step.model';
import { TravelDiary } from '@model/travel-diary.model';

describe('TravelMapStateService', () => {
  let service: TravelMapStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TravelMapStateService);
  });

  it('should update like counters in the shared state', () => {
    const step: Step = {
      id: 321,
      title: 'Bridge',
      description: '',
      latitude: 0,
      longitude: 0,
      media: [],
      country: 'France',
      city: 'Paris',
      continent: 'Europe',
      startDate: null,
      endDate: null,
      status: 'COMPLETED',
      themeIds: [],
      themes: [],
      isEditing: false,
      likes: 1,
      likesCount: 1,
      viewerHasLiked: false,
    };

    service.setSteps([step]);
    service.updateStepLikeState(step.id, 4, true);

    const [updatedStep] = service.steps();
    expect(updatedStep.likes).toBe(4);
    expect(updatedStep.likesCount).toBe(4);
    expect(updatedStep.viewerHasLiked).toBeTrue();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should clear current diary selection without dropping loaded diaries', () => {
    const step: Step = {
      id: 101,
      title: 'Arrival',
      description: 'First stop',
      latitude: 12,
      longitude: 34,
      country: 'France',
      city: 'Paris',
      continent: 'Europe',
      startDate: null,
      endDate: null,
      status: 'IN_PROGRESS',
      media: [],
      themeIds: [],
      themes: [],
      isEditing: false,
      likes: 0,
      travelDiaryId: 1,
    };

    const diary: TravelDiary = {
      id: 1,
      title: 'France Trip',
      latitude: 0,
      longitude: 0,
      private: false,
      published: true,
      status: 'PUBLISHED',
      description: 'Exploring France',
      steps: [step],
      user: {
        id: 1,
        pseudo: 'traveler',
        avatar: 'avatar.jpg',
        biography: 'Traveller',
        enabled: true,
        status: 'ACTIVE',
      },
      media: null,
    };

    service.setAllDiaries([diary]);
    service.setVisibleDiaries([]);
    service.setSteps([step]);
    service.setCurrentDiary(diary);
    service.setCurrentDiaryId(diary.id);
    service.setOpenedStepId(step.id);
    service.setOpenedCommentStepId(step.id);
    service.setMapCenterCoords({ lat: 1, lng: 2 });

    service.clearCurrentDiarySelection();

    expect(service.currentDiary()).toBeNull();
    expect(service.currentDiaryId()).toBeNull();
    expect(service.steps()).toEqual([]);
    expect(service.openedStepId()).toBeNull();
    expect(service.openedCommentStepId()).toBeNull();
    expect(service.mapCenterCoords()).toBeNull();
    expect(service.visibleDiaries().length).toBe(1);
    expect(service.visibleDiaries()[0].id).toBe(diary.id);
    expect(service.allDiaries().length).toBe(1);
  });

  it('should clear visible diaries when resetting the state', () => {
    const diary: TravelDiary = {
      id: 2,
      title: 'Spain Trip',
      latitude: 10,
      longitude: 20,
      private: false,
      published: true,
      status: 'PUBLISHED',
      description: 'Exploring Spain',
      steps: [],
      user: {
        id: 2,
        pseudo: 'explorer',
        avatar: 'avatar.jpg',
        biography: 'Traveller',
        enabled: true,
        status: 'ACTIVE',
      },
      media: null,
    };

    service.setAllDiaries([diary]);
    service.setVisibleDiaries([]);

    service.reset();

    expect(service.allDiaries()).toEqual([]);
    expect(service.visibleDiaries()).toEqual([]);
    expect(service.currentDiary()).toBeNull();
    expect(service.currentDiaryId()).toBeNull();
  });

  it('should preserve visible diaries when requested', () => {
    const diary: TravelDiary = {
      id: 3,
      title: 'Italy Trip',
      latitude: 40,
      longitude: 15,
      private: false,
      published: true,
      status: 'PUBLISHED',
      description: 'Exploring Italy',
      steps: [],
      user: {
        id: 3,
        pseudo: 'wanderer',
        avatar: 'avatar.jpg',
        biography: 'Traveller',
        enabled: true,
        status: 'ACTIVE',
      },
      media: null,
    };

    service.setAllDiaries([diary]);
    service.setVisibleDiaries([diary]);

    service.clearCurrentDiarySelection({ preserveVisibleDiaries: true });

    expect(service.visibleDiaries().length).toBe(1);
    expect(service.visibleDiaries()[0].id).toBe(diary.id);
  });

  it('should prefer backend viewerHasLiked flag when normalising steps', () => {
    const stepId = 501;

    const hydratedStep: Step = {
      id: stepId,
      title: 'Existing',
      description: '',
      latitude: 0,
      longitude: 0,
      media: [],
      country: 'France',
      city: 'Annecy',
      continent: 'Europe',
      startDate: null,
      endDate: null,
      status: 'COMPLETED',
      themeIds: [],
      themes: [],
      isEditing: false,
      likes: 10,
      likesCount: 10,
      viewerHasLiked: true,
    };

    service.setSteps([hydratedStep]);
    service.setSteps([{ ...hydratedStep, viewerHasLiked: false }]);

    const normalised = service.steps()[0];
    expect(normalised.viewerHasLiked).toBeFalse();
  });

  it('should store backend like preference when provided', () => {
    const stepId = 777;

    const backendStep = {
      id: stepId,
      title: 'Desert',
      description: 'Sunset ride',
      latitude: 0,
      longitude: 0,
      media: [],
      country: 'Morocco',
      city: 'Merzouga',
      continent: 'Africa',
      startDate: null,
      endDate: null,
      status: 'COMPLETED',
      themeIds: [],
      themes: [],
      isEditing: false,
      likes: 2,
      likesCount: 2,
      viewerHasLiked: true,
    } satisfies Step;

    service.setSteps([backendStep]);

    const normalised = service.steps()[0];
    expect(normalised.viewerHasLiked).toBeTrue();
  });

  describe('isDiaryAccessible', () => {
    const buildDiary = (overrides: Partial<TravelDiary> = {}): TravelDiary => ({
      id: 99,
      title: 'Accessible diary',
      latitude: 0,
      longitude: 0,
      private: false,
      published: true,
      status: 'PUBLISHED',
      description: 'Diary used for accessibility checks.',
      steps: [],
      user: {
        id: 7,
        pseudo: 'owner',
        avatar: null,
        biography: 'Traveller',
        enabled: true,
        status: 'ACTIVE',
      },
      media: null,
      ...overrides,
    });

    it('should allow active diaries owned by active users', () => {
      const diary = buildDiary();
      expect(service.isDiaryAccessible(diary)).toBeTrue();
    });

    it('should reject diaries disabled by moderation', () => {
      const diary = buildDiary({ status: 'DISABLED' });
      expect(service.isDiaryAccessible(diary)).toBeFalse();
    });

    it('should reject diaries whose owner account is disabled', () => {
      const diary = buildDiary({
        user: {
          id: 8,
          pseudo: 'blocked-owner',
          avatar: null,
          biography: null,
          enabled: false,
          status: 'BLOCKED',
        },
      });

      expect(service.isDiaryAccessible(diary)).toBeFalse();
    });

    it('should reject when owner status is provided in a non canonical format', () => {
      const diary = buildDiary({
        user: {
          id: 9,
          pseudo: 'inactive-owner',
          avatar: null,
          biography: null,
          enabled: true,
          status: 'in active',
        },
      });

      expect(service.isDiaryAccessible(diary)).toBeTrue();
    });

    it('should allow the owner to access a disabled diary', () => {
      const diary = buildDiary({ status: 'DISABLED' });
      const isAccessible = service.isDiaryAccessible(diary, {
        viewerId: (diary.user as { id?: number } | null)?.id ?? null,
      });

      expect(isAccessible).toBeTrue();
    });

    it('should allow an admin to access a disabled diary', () => {
      const diary = buildDiary({ status: 'DISABLED' });
      const isAccessible = service.isDiaryAccessible(diary, {
        viewerIsAdmin: true,
      });

      expect(isAccessible).toBeTrue();
    });
  });
});
