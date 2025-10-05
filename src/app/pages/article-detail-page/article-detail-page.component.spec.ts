import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { ArticleDetailPageComponent } from './article-detail-page.component';
import { ArticleService } from '@service/article.service';
import { Article } from '@model/article.model';

describe('ArticleDetailPageComponent', () => {
  let component: ArticleDetailPageComponent;
  let fixture: ComponentFixture<ArticleDetailPageComponent>;

  const articleMock: Article = {
    id: 1,
    title: 'Titre test',
    content: '<p>Contenu</p>',
    updatedAt: '2024-01-01T00:00:00Z',
    slug: 'titre-test',
    author: 'Auteur',
    category: 'France',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleDetailPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ articleId: '1' })),
          },
        },
        {
          provide: ArticleService,
          useValue: {
            getArticleById: () => of(articleMock),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
