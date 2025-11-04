import { Step } from '@model/step.model';
import { Media } from '@model/media.model';

export const createStepFormBaseValues = {
  title: 'Nouvelle étape test',
  city: 'Paris',
  country: 'France',
  continent: 'Europe',
  latitude: '48.8566',
  longitude: '2.3522',
  description: 'Une description suffisamment longue',
  mediaUrl: '',
  startDate: '2024-07-14',
  endDate: '2024-07-20',
  themeId: null,
};

export const createStepFormFrenchDateValues = {
  startDate: '2024-07-14',
  endDate: '2024-07-20',
  latitude: '48.8566',
  longitude: '2.3522',
};

export const invalidCoordinateValues = {
  latitude: 'north',
  longitude: 'east',
};

const sampleMedia: Media = {
  id: 1,
  fileUrl: 'https://example.com/pic.jpg',
  mediaType: 'PHOTO',
  status: 'VISIBLE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  publicId: null,
  travelDiaryId: 5,
  stepId: 12,
};

export const existingStepFixture: Step = {
  id: 12,
  title: 'Titre existant',
  description: 'Description existante',
  latitude: 12.34,
  longitude: 56.78,
  media: [sampleMedia],
  country: 'France',
  city: 'Paris',
  continent: 'Europe',
  startDate: '2024-07-14T10:00',
  endDate: '2024-07-20T16:30',
  status: 'IN_PROGRESS',
  themeId: 3,
  travelDiaryId: 5,
  isEditing: false,
  comments: [],
  likes: 0,
  themeIds: [3],
  themes: [{ id: 3, name: 'Nature', updatedAt: '2023-01-01' }],
};
