import { Component, effect, ElementRef, inject, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { TravelDiaryCardComponent } from 'components/Molecules/Card-ready-to-use/travel-diary-card/travel-diary-card.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { TravelDiary } from '@model/travel-diary.model';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { BreakpointService } from '@service/breakpoint.service';
import { UserService } from '@service/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { StepService } from '@service/step.service';
import { Subject, of } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-my-travels-page',
  imports: [CommonModule, DividerComponent, TravelDiaryCardComponent, ButtonComponent],
  templateUrl: './my-travels-page.component.html',
  styleUrl: './my-travels-page.component.scss',
})
export class MyTravelsPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly stepService = inject(StepService);
  private readonly router = inject(Router);

  diariesList: TravelDiary[] = [];
  panelError: string | null = null;
  readonly state = inject(TravelMapStateService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;

  // Reset du scroll avec des signals & un sélector via Angular ci dessus
  constructor() {
    effect(() => {
      if (this.state.panelHeight() === 'collapsedDiary') {
        // queueMicrotask --> Permet d’attendre que le DOM soit entièrement à jour avant d’agir (scroll, focus, etc.)
        queueMicrotask(() => {
          this.detailPanelRef?.nativeElement.scrollTo({ top: 0 });
        });
      }
    });
  }

  /**
   * Détermine l'identité ciblée (paramètre `:id` ou utilisateur connecté) et
   * hydrate la liste des carnets. Les images sont résolues depuis le template
   * via `TravelMapStateService.getDiaryCoverUrl`.
   */
  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => {
          const rawId = params.get('id');
          const parsed = rawId != null ? Number(rawId) : NaN;
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
          return this.userService.currentUserId();
        }),
        switchMap((userId) => {
          if (typeof userId !== 'number' || Number.isNaN(userId)) {
            return of<TravelDiary[]>([]);
          }
          return this.userService
            .getUserProfile(userId)
            .pipe(map((profile) => profile.travelDiaries ?? []));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (diaries) => {
          this.diariesList = Array.isArray(diaries) ? diaries : [];
          this.state.setAllDiaries(this.diariesList);
          this.panelError = null;
        },
        error: (err) => {
          console.error('Failed to load user diaries', err);
          this.diariesList = [];
          this.panelError = "Impossible de charger les carnets pour cet utilisateur.";
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePanel() {
    if (!this.state.currentDiary()) {
      // Si pas de diary, toggle simple entre collapsed/expanded
      this.state.panelHeight.set(
        this.state.panelHeight() === 'collapsed' ? 'expanded' : 'collapsed'
      );
      return;
    }

    // Si diary présent, logique spéciale à 3 états
    switch (this.state.panelHeight()) {
      case 'collapsed':
        this.state.panelHeight.set('expanded');
        break;
      case 'expanded':
        this.state.panelHeight.set('collapsedDiary');
        break;
      case 'collapsedDiary':
        this.state.panelHeight.set('expanded');
        break;
      default:
        this.state.panelHeight.set('collapsed');
        break;
    }
  }

  /**
   * Sélectionne un carnet dans la liste et redirige vers la page dédiée.
   */
  onDiaryCardClick(diary: TravelDiary): void {
    if (!diary) {
      return;
    }

    this.panelError = null;
    this.state.setCurrentDiaryId(diary.id);
    this.state.setCurrentDiary(null);
    void this.router.navigate(['/travels', diary.id]);
  }

  /**
   * Redirige vers la page détaillée d'un carnet pour modification.
   */
  onDiaryEdit(diary: TravelDiary): void {
    if (!diary) {
      return;
    }

    void this.router.navigate(['/travels', diary.id], { queryParams: { mode: 'edit' } });
  }

  /**
   * Supprime un carnet et remet l'état partagé en cohérence avec la carte.
   */
  onDiaryDelete(diary: TravelDiary): void {
    if (!diary) {
      return;
    }

    const snapshot = [...this.diariesList];
    this.panelError = null;

    this.diariesList = this.diariesList.filter((item) => item.id !== diary.id);
    this.state.setAllDiaries(this.state.allDiaries().filter((item) => item.id !== diary.id));

    if (this.state.currentDiaryId() === diary.id) {
      this.state.reset();
      this.state.panelHeight.set('collapsed');
    }

    this.stepService
      .deleteDiary(diary.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => undefined,
        error: (err) => {
          console.error('Failed to delete diary', err);
          this.diariesList = snapshot;
          this.state.setAllDiaries(snapshot);
          this.panelError = "Impossible de supprimer ce carnet pour le moment.";
        },
      });
  }
}
