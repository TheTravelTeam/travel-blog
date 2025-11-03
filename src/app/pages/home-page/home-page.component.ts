import { VisualTripCardComponent } from 'components/Molecules/Card-ready-to-use/visual-trip-card/visual-trip-card.component';
import { FooterComponent } from 'components/Molecules/footer/footer.component';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CardComponent } from 'components/Atoms/Card/card.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { ChipComponent } from 'components/Atoms/chip/chip.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { CommonModule } from '@angular/common';
import { BreakpointService } from '@service/breakpoint.service';
import { StepService } from '@service/step.service';
import { ArticleService } from '@service/article.service';
import { VariantTripCard } from '@model/visual-trip-card.model';
import { TravelDiary } from '@model/travel-diary.model';
import { Article } from '@model/article.model';
import { catchError, map, of, take } from 'rxjs';
import { Router } from '@angular/router';

type ArticlePreview = {
  id: number;
  title: string;
  image: string;
  slug: string;
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    FooterComponent,
    VisualTripCardComponent,
    CardComponent,
    ButtonComponent,
    ChipComponent,
    IconComponent,
    CommonModule,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  articleContent = '';

  public breakpoint = inject(BreakpointService);
  private readonly stepService = inject(StepService);
  private readonly articleService = inject(ArticleService);
  private readonly router = inject(Router);

  private readonly diaryPlaceholder = 'Images/paysage.jpg';
  private readonly articlePlaceholder = 'Images/paysage.jpg';

  /** Cartes de carnet de voyage affichées sur la home. */
  readonly diaryCards = signal<VariantTripCard[]>([]);
  /** Vignettes d'articles affichées sur la home. */
  readonly articlePreviews = signal<ArticlePreview[]>([]);

  /** Cartes visibles dans le carrousel mobile (maximum quatre). */
  readonly heroDiaryCards = computed(() => {
    const cards = this.diaryCards();
    return cards.slice(0, Math.min(4, cards.length));
  });

  /** Cartes affichées dans la grille desktop (limitées à six). */
  readonly gridDiaryCards = computed(() => this.diaryCards());

  /** Vignettes d'article utilisées pour l'encart destinations. */
  readonly gridArticlePreviews = computed(() => this.articlePreviews());

  saveContent() {
    console.info(this.articleContent);
    this.articleContent = '';
  }

  ngOnInit(): void {
    this.loadFeaturedDiaries();
    this.loadFeaturedArticles();
  }

  /**
   * Récupère les carnets publiés et en extrait les six premiers pour l'accueil.
   */
  private loadFeaturedDiaries(): void {
    this.stepService
      .getAllDiaries()
      .pipe(
        map((diaries) => diaries.filter((diary) => this.isDiaryVisible(diary)).slice(0, 8)),
        map((visible) => visible.map((diary) => this.mapDiaryToCard(diary))),
        catchError(() => of<VariantTripCard[]>([])),
        take(1)
      )
      .subscribe((cards) => {
        this.diaryCards.set(cards);
      });
  }

  /**
   * Récupère les articles disponibles et conserve les six premiers sous forme de vignettes.
   */
  private loadFeaturedArticles(): void {
    this.articleService
      .getArticles()
      .pipe(
        map((articles) => articles.slice(0, 6).map((article) => this.mapArticleToPreview(article))),
        catchError(() => of<ArticlePreview[]>([])),
        take(1)
      )
      .subscribe((previews) => this.articlePreviews.set(previews));
  }

  /**
   * Convertit un carnet en carte visuelle utilisée par les trip cards.
   * @param diary Carnet de voyage source.
   */
  private mapDiaryToCard(diary: TravelDiary): VariantTripCard {
    return {
      id: diary.id,
      title: diary.title,
      description: diary.description?.trim() || 'Découvrez ce carnet',
      image: this.resolveDiaryImage(diary) || this.diaryPlaceholder,
      author: this.resolveDiaryAuthor(diary),
      dateCreation: diary.startDate || diary.endDate || '',
    };
  }

  /**
   * Normalise un article pour l'encart destinations.
   * @param article Article issu de l'API.
   */
  private mapArticleToPreview(article: Article): ArticlePreview {
    return {
      id: article.id,
      title: article.title,
      image: article.thumbnailUrl || article.coverUrl || this.articlePlaceholder,
      slug: article.slug,
    };
  }

  /** Détermine si un carnet peut être affiché sur la page d'accueil. */
  private isDiaryVisible(diary: TravelDiary): boolean {
    if (typeof diary.published === 'boolean') {
      if (diary.published) {
        return true;
      }
    }

    if (typeof diary.status === 'string') {
      const normalized = diary.status.toUpperCase();
      if (normalized != 'DISABLED') {
        return true;
      }
    }

    return diary.private === false;
  }

  /** Utilise la vignette du carnet ou, à défaut, le premier média des étapes. */
  private resolveDiaryImage(diary: TravelDiary): string | undefined {
    if (diary.media?.fileUrl) {
      return diary.media.fileUrl;
    }

    const firstStepMedia = diary.steps
      ?.flatMap((step) => (Array.isArray(step.media) ? step.media : []))
      .find((media) => media?.fileUrl);

    return firstStepMedia?.fileUrl;
  }

  /** Fournit le nom d'auteur disponible directement dans la payload (rare). */
  private resolveAuthorFromDiaryPayload(diary: TravelDiary): string | undefined {
    const author = (diary as { author?: string | null }).author?.trim();
    if (author) {
      return author;
    }

    const userRef = diary.user as unknown;
    if (typeof userRef === 'object' && userRef !== null) {
      const pseudo = (userRef as { pseudo?: string | null }).pseudo?.trim();
      if (pseudo) {
        return pseudo;
      }
    }
    return undefined;
  }

  /** Retourne le nom d'auteur à afficher pour un carnet. */
  private resolveDiaryAuthor(diary: TravelDiary): string {
    return this.resolveAuthorFromDiaryPayload(diary) ?? 'Voyageur anonyme';
  }

  /** Redirige vers la carte sur le carnet demandé. */
  navigateToDiary(diaryId: number): void {
    void this.router.navigate(['/travels', diaryId]);
  }

  /** Ouvre la page de détail de l'article sélectionné. */
  openArticle(slug: string): void {
    void this.router.navigate(['/articles', slug]);
  }

  /** Redirige vers la liste complète des articles. */
  openArticlesListing(): void {
    void this.router.navigate(['/articles']);
  }
}
