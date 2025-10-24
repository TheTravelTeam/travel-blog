import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Article } from '@model/article.model';
import { Media } from '@model/media.model';
import { ArticleService } from '@service/article.service';
import { BreadcrumbItem } from '@model/breadcrumb.model';
import { BreadcrumbComponent } from 'components/Atoms/breadcrumb/breadcrumb.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { SafeHtmlPipe } from 'shared/pipes/safe-html.pipe';

@Component({
  selector: 'app-article-detail-page',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, IconComponent, SafeHtmlPipe],
  templateUrl: './article-detail-page.component.html',
  styleUrl: './article-detail-page.component.scss',
})
export class ArticleDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly articleService = inject(ArticleService);
  private readonly destroyRef = inject(DestroyRef);
  readonly article = signal<Article | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Articles', href: '/articles' },
    { label: 'Article', href: '', isDisabled: true },
  ]);

  readonly heroImage = computed(() => {
    const current = this.article();
    if (!current) {
      return 'image 3.svg';
    }
    return this.getArticleCover(current);
  });

  readonly heroDestination = computed(() => {
    const current = this.article();
    if (!current) {
      return 'Destination';
    }
    const category = this.getArticleCategory(current);
    return category || 'Destination';
  });

  readonly formattedUpdatedAt = computed(() => {
    const current = this.article();
    if (!current?.updatedAt) {
      return '';
    }
    const date = new Date(current.updatedAt);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  });

  readonly galleryImages = computed(() => {
    const current = this.article();
    if (!current?.medias?.length) {
      return [] as Media[];
    }

    const heroUrl = this.normalizeUrl(this.heroImage());
    const uniqueByUrl = new Map<string, Media>();

    for (const media of current.medias) {
      const url = this.normalizeUrl(media?.fileUrl);
      if (!url) {
        continue;
      }

      if (heroUrl && url === heroUrl) {
        continue;
      }

      if (!uniqueByUrl.has(url)) {
        uniqueByUrl.set(url, {
          ...media,
          fileUrl: url,
        });
      }
    }

    return Array.from(uniqueByUrl.values());
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((params) => params.get('articleId')),
        switchMap((rawId) => {
          if (!rawId) {
            this.article.set(null);
            this.isLoading.set(false);
            this.error.set("Identifiant d'article manquant.");
            return EMPTY;
          }

          const articleId = Number(rawId);
          if (Number.isNaN(articleId) || articleId <= 0) {
            this.article.set(null);
            this.isLoading.set(false);
            this.error.set("Identifiant d'article invalide.");
            return EMPTY;
          }

          this.isLoading.set(true);
          this.error.set(null);

          return this.articleService.getArticleById(articleId);
        })
      )
      .subscribe({
        next: (article) => {
          this.article.set(article);
          this.isLoading.set(false);
          this.updateBreadcrumb(article);
        },
        error: () => {
          this.article.set(null);
          this.error.set('Impossible de charger cet article pour le moment.');
          this.isLoading.set(false);
        },
      });
  }

  getArticleCategory(article: Article): string {
    if (article.category?.trim()) {
      return article.category.trim();
    }
    return '';
  }

  getArticleAuthor(article: Article | null): string {
    if (!article) {
      return 'Auteur indisponible';
    }
    return article.author?.trim() || 'Auteur indisponible';
  }

  getArticleCover(article: Article): string {
    const cover = this.normalizeUrl(article.coverUrl) ?? this.normalizeUrl(article.thumbnailUrl);
    if (cover) {
      return cover;
    }

    const firstMedia = article.medias?.find((media) => this.normalizeUrl(media.fileUrl));
    return this.normalizeUrl(firstMedia?.fileUrl) ?? 'image 3.svg';
  }

  updateBreadcrumb(article: Article): void {
    const label = article.title?.trim() || 'Article';
    this.breadcrumbItems.set([
      { label: 'Articles', href: '/articles' },
      { label, href: '', isDisabled: true },
    ]);
  }

  trackMedia(_: number, media: Media): string | number {
    return media.id ?? media.fileUrl;
  }

  getGalleryImageAlt(media: Media): string {
    const title = this.article()?.title?.trim();
    if (title) {
      return `${title} – illustration`;
    }
    return media.publicId?.trim() || 'Illustration de l’article';
  }

  private normalizeUrl(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed;
  }
}
