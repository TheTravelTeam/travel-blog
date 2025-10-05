import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ArticlesPageComponent } from './articles-page.component';
import { ArticleService } from '@service/article.service';

describe('ArticlesPageComponent', () => {
  let component: ArticlesPageComponent;
  let fixture: ComponentFixture<ArticlesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticlesPageComponent],
      providers: [
        {
          provide: ArticleService,
          useValue: {
            getArticles: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticlesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
