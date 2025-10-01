import { TestBed } from '@angular/core/testing';

import { TravelMapStateService } from './travel-map-state.service';
import { Step } from '@model/step.model';
import { TravelDiary } from '@model/travel-diary.model';
import { User } from '@model/user.model';

describe('TravelMapStateService', () => {
  let service: TravelMapStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TravelMapStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should clear current diary selection without dropping loaded diaries', () => {
    const user: User = {
      id: 1,
      avatar: 'avatar.jpg',
      biography: 'Traveller',
      enabled: true,
      status: 'ACTIVE',
      userName: 'traveler',
      username: 'traveler',
    };

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
      user,
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
        avatar: 'avatar.jpg',
        biography: 'Traveller',
        enabled: true,
        status: 'ACTIVE',
        userName: 'explorer',
        username: 'explorer',
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
        avatar: 'avatar.jpg',
        biography: 'Traveller',
        enabled: true,
        status: 'ACTIVE',
        userName: 'wanderer',
        username: 'wanderer',
      },
      media: null,
    };

    service.setAllDiaries([diary]);
    service.setVisibleDiaries([diary]);

    service.clearCurrentDiarySelection({ preserveVisibleDiaries: true });

    expect(service.visibleDiaries().length).toBe(1);
    expect(service.visibleDiaries()[0].id).toBe(diary.id);
  });
});
