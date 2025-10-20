import { CreateStepDto } from '@dto/create-step.dto';
import { Step } from '@model/step.model';

export const addStepDuplicateThemesPayload: CreateStepDto = {
  title: 'Nouvelle étape',
  description: 'Description',
  latitude: 1,
  longitude: 2,
  travelDiaryId: 5,
  themeIds: [4, 4, 12],
};

export const createdStepResponse: Step = {
  id: 42,
  title: addStepDuplicateThemesPayload.title,
  description: addStepDuplicateThemesPayload.description ?? '',
  latitude: addStepDuplicateThemesPayload.latitude,
  longitude: addStepDuplicateThemesPayload.longitude,
  media: [],
  country: 'France',
  city: 'Paris',
  continent: 'Europe',
  startDate: new Date('2024-07-14'),
  isEditing: false,
  comments: [],
  likes: 0,
  likesCount: 0,
  themeIds: [4, 12],
  themes: [],
};

export const addStepValidationErrorPayload: CreateStepDto = {
  title: '',
  description: '',
  latitude: 1,
  longitude: 2,
  travelDiaryId: 5,
  themeIds: [],
};

export const addStepForbiddenPayload: CreateStepDto = {
  title: 'Etape protégée',
  description: 'Description',
  latitude: 1,
  longitude: 2,
  travelDiaryId: 5,
  themeIds: [],
};

export const updateStepWithInvalidThemesPayload: CreateStepDto = {
  title: 'Titre modifié',
  description: 'Desc modifiée',
  latitude: 5,
  longitude: 6,
  travelDiaryId: 9,
  themeIds: [Number.NaN, 7],
};

export const updatedStepResponse: Step = {
  id: 42,
  title: updateStepWithInvalidThemesPayload.title,
  description: updateStepWithInvalidThemesPayload.description ?? '',
  latitude: updateStepWithInvalidThemesPayload.latitude,
  longitude: updateStepWithInvalidThemesPayload.longitude,
  media: [],
  country: 'France',
  city: 'Paris',
  continent: 'Europe',
  startDate: null,
  endDate: null,
  status: 'IN_PROGRESS',
  isEditing: false,
  comments: [],
  likes: 10,
  likesCount: 10,
  themeIds: [7],
  themes: [],
};

export const updateStepNotFoundPayload: CreateStepDto = {
  title: 'Introuvable',
  description: 'Desc',
  latitude: 0,
  longitude: 0,
  travelDiaryId: 1,
  themeIds: [],
};

export const updateStepForbiddenPayload: CreateStepDto = {
  title: 'Accès refusé',
  description: 'Desc',
  latitude: 0,
  longitude: 0,
  travelDiaryId: 1,
  themeIds: [],
};
