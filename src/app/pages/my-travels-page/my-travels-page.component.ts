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
import {
  CreateDiaryModalComponent,
  DiaryCreationPayload,
} from 'components/Organisms/create-diary-modal/create-diary-modal.component';
import { CreateDiaryDto } from '@dto/create-diary.dto';
import { CreateStepDto } from '@dto/create-step.dto';
import { ThemeService } from '@service/theme.service';
import { ItemProps } from '@model/select.model';

@Component({
  selector: 'app-my-travels-page',
  imports: [
    CommonModule,
    DividerComponent,
    TravelDiaryCardComponent,
    ButtonComponent,
    CreateDiaryModalComponent,
  ],
  templateUrl: './my-travels-page.component.html',
  styleUrl: './my-travels-page.component.scss',
})
export class MyTravelsPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly stepService = inject(StepService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  diariesList: TravelDiary[] = [];
  panelError: string | null = null;
  readonly state = inject(TravelMapStateService);

  isCreateModalOpen = false;
  isEditMode = false;
  editInitialDiary: { title: string; description: string; coverUrl: string | null } | null = null;
  isCreateModalSubmitting = false;
  createModalError: string | null = null;
  themeOptions: ItemProps[] = [];
  private themesLoaded = false;

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  // Conserve l'id utilisateur du profil affiché (utilisé comme fallback owner)
  private currentProfileUserId: number | null = null;

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
        map(params => {
          const raw = params.get('id');
          const parsed = raw !== null ? Number(raw) : NaN;
          if (Number.isFinite(parsed) && parsed > 0) {
            return parsed; // un id valide dans l’URL
          }
          return this.userService.currentUserId(); // peut être number | null
        }),
        switchMap((userId) => {
          if (userId == null) {
            // Cas où aucun utilisateur n’est dispo
            return of({ diaries: [], userId: null });
          }

          // Cas normal : on charge le profil du user
          return this.userService.getUserProfile(userId).pipe(
            map(profile => ({
              diaries: profile.travelDiaries ?? [],
              userId: profile.id,
            }))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ diaries, userId }) => {
          // Mémorise l'id du profil affiché pour isOwner
          this.currentProfileUserId =
            typeof userId === 'number' && Number.isFinite(userId) ? userId : null;

          this.diariesList = diaries ?? [];
          this.state.setAllDiaries(this.diariesList);
          this.panelError = null;

          // Si on a demandé à ouvrir la modale de création
          if (this.state.consumeCreateModalRequest()) {
            this.openCreateModal();
          }

          // Si on a demandé à ouvrir la modale d’édition
          const editId = this.state.consumeRequestedEditDiary();
          if (editId != null) {
            const diary = this.diariesList.find(d => d.id === editId);
            if (diary) {
              this.openEditModal(diary);
            }
          }
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

    // Ouvre directement la modale d'édition avec les données pré-remplies
    this.openEditModal(diary);
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

  openCreateModal(): void {
    /**
     * Ouvre la modale en mode création de carnet.
     * Réinitialise les erreurs et charge les thèmes au besoin.
     */
    this.createModalError = null;
    this.isCreateModalSubmitting = false;
    this.isEditMode = false;
    this.editInitialDiary = null;
    this.isCreateModalOpen = true;
    this.ensureThemesLoaded();
  }

  openEditModal(diary: TravelDiary): void {
    /**
     * Ouvre la modale en mode édition pour le carnet fourni.
     * Pré-remplit les champs carnet et positionne l'identité du carnet courant.
     */
    this.createModalError = null;
    this.isCreateModalSubmitting = false;
    this.isEditMode = true;
    this.editInitialDiary = {
      title: diary.title ?? '',
      description: diary.description ?? '',
      coverUrl: diary.media?.fileUrl ?? null,
    };
    // Positionner le carnet courant pour garantir l'ID lors du submit édition
    this.state.setCurrentDiary(diary);
    this.state.setCurrentDiaryId(diary.id);
    this.isCreateModalOpen = true;
    this.ensureThemesLoaded();
  }

  closeCreateModal(): void {
    if (this.isCreateModalSubmitting) {
      return;
    }
    this.isCreateModalOpen = false;
    this.createModalError = null;
  }

  onDiaryCreationSubmit(payload: DiaryCreationPayload): void {
    /**
     * Soumet la création d'un carnet puis de sa première étape.
     * En cas d'échec de création de l'étape, la suppression compensatoire
     * du carnet peut être ajoutée (rollback) si nécessaire.
     */
    this.isCreateModalSubmitting = true;
    this.createModalError = null;
    console.log('payload', payload);

    const currentUserId = this.userService.currentUserId();

    const diaryPayload: CreateDiaryDto = {
      title: payload.diary.title,
      description: payload.diary.description,
      latitude: payload.step.latitude,
      longitude: payload.step.longitude,
      media: {
        fileUrl: payload.diary.coverUrl || '/icon/logo.svg',
        mediaType: 'PHOTO',
      },
      user: currentUserId ?? null,
      isPrivate: false,
      isPublished: true,
      status: 'IN_PROGRESS',
      canComment: true,
      steps: [],
    };

    this.stepService
      .addDiary(diaryPayload)
      .pipe(
        switchMap((createdDiary) => {
          const stepPayload: CreateStepDto = {
            title: payload.step.title,
            description: payload.step.description ?? null,
            latitude: payload.step.latitude,
            longitude: payload.step.longitude,
            travelDiaryId: createdDiary.id,
            // Map travel period to start/end date if provided
            startDate: payload.step.startDate ?? null,
            endDate: payload.step.endDate ?? null,
            status: 'IN_PROGRESS',
            // Optional location metadata if available in payload.step
            city: (payload.step as any).city ?? null,
            country: (payload.step as any).country ?? null,
            continent: (payload.step as any).continent ?? null,
          };

          console.log(stepPayload)

          return this.stepService
            .addStepToTravel(createdDiary.id, stepPayload)
            .pipe(switchMap((createdStep) =>
            this.stepService.getDiaryWithSteps(createdDiary.id) // ← récupère le Diary à jour
              .pipe(map((diary) => ({ diary, createdStep })))
          )
        );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ diary, createdStep }) => {
          console.log('diary', diary)
          console.log('createdStep', { createdStep });
          this.diariesList = [...this.diariesList, diary];
          this.state.setAllDiaries(this.diariesList);
          this.isCreateModalSubmitting = false;
          this.isCreateModalOpen = false;
          this.createModalError = null;

          this.state.setCurrentDiary(diary);
          this.state.setCurrentDiaryId(diary.id);
          this.state.setSteps(diary.steps ?? []);
          this.state.setOpenedStepId(createdStep.steps?.[0]?.id ?? null);
          this.state.panelHeight.set('collapsedDiary');

          void this.router.navigate(['/travels', diary.id]);
        },
        error: (err) => {
          console.error('Failed to create diary', err);
          this.createModalError = "Impossible de créer ce carnet pour le moment.";
          this.isCreateModalSubmitting = false;
        },
      });
  }

  onDiaryEditSubmit(payload: DiaryCreationPayload): void {
    /**
     * Met à jour uniquement les champs du carnet (pas les étapes).
     * Construit un payload conforme à UpdateTravelDiaryDTO (scalaires).
     */
    if (!this.state.currentDiaryId() && !this.state.currentDiary()) {
      // Fallback: rien à éditer
      this.createModalError = "Aucun carnet à modifier.";
      return;
    }

    // On édite uniquement le carnet (pas les steps)
    const diaryId = this.state.currentDiaryId() ?? this.state.currentDiary()?.id ?? null;
    if (diaryId == null) {
      this.createModalError = "Aucun carnet à modifier.";
      return;
    }

    this.isCreateModalSubmitting = true;
    this.createModalError = null;

    // Adapter au DTO backend UpdateTravelDiaryDTO (scalaires uniquement)
    const updatePayload: any = {
      title: payload.diary.title,
      description: payload.diary.description,
      isPrivate: payload.diary.isPrivate ?? undefined,
      isPublished: payload.diary.isPublished ?? undefined,
      status: payload.diary.status ?? undefined,
      canComment: payload.diary.canComment ?? undefined,
      // latitude/longitude, steps, user, media non modifiés ici
    };

    this.stepService
      .updateDiary(diaryId, updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDiary) => {
          // Met à jour la liste locale et l'état partagé
          const idx = this.diariesList.findIndex((d) => d.id === updatedDiary.id);
          if (idx !== -1) {
            this.diariesList = [
              ...this.diariesList.slice(0, idx),
              updatedDiary,
              ...this.diariesList.slice(idx + 1),
            ];
          }
          this.state.setAllDiaries(this.diariesList);
          this.state.setCurrentDiary(updatedDiary);
          this.state.setCurrentDiaryId(updatedDiary.id);

          this.isCreateModalSubmitting = false;
          this.isCreateModalOpen = false;
          this.createModalError = null;
        },
        error: (err) => {
          console.error('Failed to update diary', err);
          this.createModalError = "Impossible de modifier ce carnet pour le moment.";
          this.isCreateModalSubmitting = false;
        },
      });
  }

  onDiaryModalSubmit(payload: DiaryCreationPayload): void {
    /**
     * Point d'entrée unique pour la soumission de la modale.
     * Route vers la création ou l'édition selon le mode courant.
     */
    if (this.isEditMode) {
      this.onDiaryEditSubmit(payload);
    } else {
      this.onDiaryCreationSubmit(payload);
    }
  }

  private ensureThemesLoaded(): void {
    if (this.themesLoaded) {
      return;
    }

    this.themeService
      .getThemes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (themes) => {
          this.themeOptions = themes.map((theme) => ({ id: theme.id, label: theme.name }));
          this.themesLoaded = true;
        },
        error: (err) => {
          console.error('Failed to load themes', err);
          this.themeOptions = [];
        },
      });
  }

  /**
   * Indique si l'utilisateur connecté est propriétaire du carnet.
   */
  isOwner(): boolean {
    const currentUserId = this.userService.currentUserId();
    if (typeof currentUserId !== 'number' || Number.isNaN(currentUserId)) {
      return false;
    }
    if (typeof this.currentProfileUserId !== 'number' || Number.isNaN(this.currentProfileUserId)) {
      return false;
    }
    // Propriétaire si l'utilisateur connecté correspond à l'utilisateur de la page
    return currentUserId === this.currentProfileUserId;
  }
   }
