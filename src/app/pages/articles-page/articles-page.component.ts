import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Article } from '@model/article.model';
import { ArticleService } from '@service/article.service';
import { BreadcrumbItem } from '@model/breadcrumb.model';
import { BreadcrumbComponent } from 'components/Atoms/breadcrumb/breadcrumb.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';

@Component({
  selector: 'app-articles-page',
  standalone: true,
  imports: [CommonModule, RouterLink, BreadcrumbComponent, IconComponent],
  templateUrl: './articles-page.component.html',
  styleUrl: './articles-page.component.scss',
})
export class ArticlesPageComponent implements OnInit {
  private readonly articleService = inject(ArticleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Articles', href: '/articles', isDisabled: true },
  ]);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly articles = signal<Article[]>([]);
  readonly hasArticles = computed(() => this.articles().length > 0);

  readonly heroImage = computed(() => {
    const firstArticle = this.articles()[0];
    if (!firstArticle) {
      return 'image 3.svg';
    }
    return this.getArticleCover(firstArticle);
  });

  ngOnInit(): void {
    this.articleService
      .getArticles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (articles) => {
          this.articles.set(articles);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les articles pour le moment.');
          this.isLoading.set(false);
        },
      });
  }

  trackByArticleId(_index: number, article: Article): number {
    return article.id;
  }

  getArticleCategory(article: Article): string {
    if (article.category?.trim()) {
      return article.category.trim();
    }
    const primaryTheme = article.themes?.find((theme) => theme?.name?.trim());
    if (primaryTheme?.name) {
      return primaryTheme.name.trim();
    }
    return 'Destination inconnue';
  }

  getArticleAuthor(article: Article): string {
    return article.author?.trim() || 'Auteur indisponible';
  }

  getArticlePreview(article: Article): string {
    return this.buildPreview(article.content);
  }

  getArticleCover(article: Article): string {
    return article.coverUrl?.trim() || article.thumbnailUrl?.trim() || 'image 3.svg';
  }

  private buildPreview(html: string | undefined | null): string {
    if (!html) {
      return 'Aucun aperçu disponible.';
    }

    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      return 'Aucun aperçu disponible.';
    }

    return text.length > 180 ? `${text.slice(0, 180)}…` : text;
  }
}
