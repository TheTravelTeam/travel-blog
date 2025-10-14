/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaGridUploaderComponent } from './media-grid-uploader.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('MediaGridUploaderComponent', () => {
  let component: MediaGridUploaderComponent;
  let fixture: ComponentFixture<MediaGridUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaGridUploaderComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediaGridUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
