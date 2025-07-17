import { TestBed } from '@angular/core/testing';

import { TravelMapStateService } from './travel-map-state.service';

describe('TravelMapStateService', () => {
  let service: TravelMapStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TravelMapStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
