import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { MyTravelsPageComponent } from './my-travels-page.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';


describe('MyTravelsPageComponent', () => {
  let component: MyTravelsPageComponent;
  let fixture: ComponentFixture<MyTravelsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyTravelsPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyTravelsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
