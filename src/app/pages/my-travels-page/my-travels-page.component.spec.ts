import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyTravelsPageComponent } from './my-travels-page.component';

describe('MyTravelsPageComponent', () => {
  let component: MyTravelsPageComponent;
  let fixture: ComponentFixture<MyTravelsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyTravelsPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyTravelsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
