import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ProgressBarComponent } from '../../components/Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { FormsModule } from '@angular/forms';
import { Step } from '@model/step.model';
import { Media } from '@model/media.model';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { CommonModule } from '@angular/common';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { BreakpointService } from '@service/breakpoint.service';
import { AvatarComponent } from '../../components/Atoms/avatar/avatar.component';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '@service/user.service';
import { User } from '@model/user.model';
import { Subscription } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { CreateStepFormComponent } from 'components/Organisms/create-step-form/create-step-form.component';
import { StepService } from '@service/step.service';
import { CreateStepDto } from '@dto/create-step.dto';
import { ItemProps } from '@model/select.model';
import { ThemeService } from '@service/theme.service';
import { TravelDiary } from '@model/travel-diary.model';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { StepFormResult } from '@model/stepFormResult.model';

type DiaryOwnerInfo = {
  id: number;
  avatar?: string | null;
  label: string;
};

@Component({
  selector: 'app-world-map-page',
  imports: [
    ProgressBarComponent,
    AccordionComponent,
    FormsModule,
    ButtonComponent,
    CommonModule,
    DividerComponent,
    AvatarComponent,
    CreateStepFormComponent,
    IconComponent,
  ],
  templateUrl: './diary-page.component.html',
  styleUrl: './diary-page.component.scss',
})
export class DiaryPageComponent implements OnInit, OnDestroy {
  readonly state = inject(TravelMapStateService);
  private userService = inject(UserService);
  private stepService = inject(StepService);
  private themeService = inject(ThemeService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;
  @ViewChild(CreateStepFormComponent) createStepForm?: CreateStepFormComponent;

  private readonly diaryOwner = signal<DiaryOwnerInfo | null>(null);
  private ownerFetchSub: Subscription | null = null;
  private themeFetchSub: Subscription | null = null;
  private stepCreationSub: Subscription | null = null;

  readonly isStepFormVisible = signal(false);
  readonly isStepSubmitting = signal(false);
  readonly stepFormError = signal<string | null>(null);
  readonly stepThemes = signal<ItemProps[]>([]);
  readonly activeEditingStep = signal<Step | null>(null);

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

    effect(
      () => {
        this.resolveDiaryOwner(this.state.currentDiary());
      },
      { allowSignalWrites: true }
    );

    effect(() => {
      const editingStep = this.activeEditingStep();
      const isVisible = this.isStepFormVisible();

      if (editingStep && isVisible) {
        queueMicrotask(() => this.createStepForm?.populateFromStep(editingStep));
      }
    });
  }

  readonly diaryOwnerInfo = computed<DiaryOwnerInfo | null>(() => this.diaryOwner());

  readonly isDiaryOwner = computed(() => {
    const owner = this.diaryOwnerInfo();
    if (!owner) {
      return false;
    }

    const current = this.userService.currentUserId();
    return typeof current === 'number' && owner.id === current;
  });

  readonly isEditingStep = computed(() => this.activeEditingStep() !== null);

  getOwnerLinkAriaLabel(owner: DiaryOwnerInfo): string {
    const label = owner.label?.trim();
    return label ? `Voir les carnets de ${label}` : 'Voir les carnets de cet utilisateur';
  }

  onOwnerNavigate(owner: DiaryOwnerInfo | null): void {
    if (!owner) {
      return;
    }

    this.router.navigate(['/travels', 'users', owner.id]).catch(() => {
      /* Navigation errors ignored */
    });
  }

  /**
   * Opens the creation modal for the diary owner and ensures a clean form state.
   */
  onCreateStepClick(): void {
    if (!this.isDiaryOwner()) {
      return;
    }

    this.applyStepEditing(null);
    this.activeEditingStep.set(null);
    this.isStepFormVisible.set(true);
    this.stepFormError.set(null);
    this.ensureThemesLoaded();
    queueMicrotask(() => this.createStepForm?.reset());
  }

  /**
   * Hides the modal and reverts to the read-only view when the user aborts the flow.
   */
  onStepFormCancel(): void {
    this.isStepFormVisible.set(false);
    this.stepFormError.set(null);
    this.createStepForm?.reset();
    this.resetEditingState();
  }

  /**
   * Handles both creation and edition flows depending on whether a step is currently selected.
   * Normalises the payload before hitting the API and refreshes the diary to keep the UI in sync.
   */
  onStepFormSubmit(formValue: StepFormResult): void {
    const diaryId = this.state.currentDiaryId() ?? this.state.currentDiary()?.id ?? null;
    if (!diaryId) {
      this.stepFormError.set("Impossible d'identifier le carnet cible.");
      return;
    }

    const editingStep = this.activeEditingStep();

    const payload: CreateStepDto = {
      title: formValue.title,
      description: formValue.description,
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      travelDiaryId: diaryId,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      status: editingStep?.status ?? 'IN_PROGRESS',
      city: formValue.city,
      country: formValue.country,
      continent: formValue.continent,
    };

    this.isStepSubmitting.set(true);
    this.stepFormError.set(null);

    this.stepCreationSub?.unsubscribe();
    const stepRequest$ = editingStep
      ? this.stepService
          .updateStep(editingStep.id, payload)
          .pipe(
            switchMap(() =>
              this.stepService
                .getDiaryWithSteps(diaryId)
                .pipe(map((diary) => ({ diary, targetStepId: editingStep.id })))
            )
          )
      : this.stepService
          .addStepToTravel(diaryId, payload)
          .pipe(
            switchMap((createdStep) =>
              this.stepService
                .getDiaryWithSteps(diaryId)
                .pipe(map((diary) => ({ diary, targetStepId: createdStep.id })))
            )
          );

    this.stepCreationSub = stepRequest$.pipe(take(1)).subscribe({
      next: ({ diary, targetStepId }) => {
        this.applyUpdatedDiary(diary);

        if (targetStepId) {
          this.state.openedStepId.set(targetStepId);
        }

        this.isStepSubmitting.set(false);
        this.isStepFormVisible.set(false);
        this.createStepForm?.reset();
        this.resetEditingState();
        this.stepCreationSub = null;
      },
      error: () => {
        this.isStepSubmitting.set(false);
        this.stepFormError.set(
          editingStep
            ? 'Impossible de mettre à jour cette étape pour le moment.'
            : "Impossible d'ajouter cette étape pour le moment."
        );
        this.stepCreationSub = null;
      },
    });
  }

  private ensureThemesLoaded(): void {
    if (this.stepThemes().length || this.themeFetchSub) {
      return;
    }

    this.themeFetchSub = this.themeService
      .getThemes()
      .pipe(take(1))
      .subscribe({
        next: (themes) => {
          const items = themes.map(
            (theme) => ({ id: theme.id, label: theme.name }) satisfies ItemProps
          );
          this.stepThemes.set(items);
        },
        error: () => {
          this.stepThemes.set([]);
          this.themeFetchSub = null;
        },
        complete: () => {
          this.themeFetchSub = null;
        },
      });
  }

  private applyUpdatedDiary(updatedDiary: TravelDiary): void {
    const normalizedSteps = this.normalizeSteps(updatedDiary.steps);
    const normalizedDiary: TravelDiary = {
      ...updatedDiary,
      steps: normalizedSteps,
    };

    this.state.setCurrentDiary(normalizedDiary);
    this.state.setCurrentDiaryId(null);
    this.state.setCurrentDiaryId(normalizedDiary.id);
    this.state.setSteps(normalizedSteps);
    this.state.openedCommentStepId.set(null);

    const lastStepId = normalizedSteps.length
      ? normalizedSteps[normalizedSteps.length - 1].id
      : null;
    this.state.openedStepId.set(lastStepId);

    const diaries = this.state.allDiaries();
    const diaryIndex = diaries.findIndex((diary) => diary.id === normalizedDiary.id);
    if (diaryIndex !== -1) {
      const updatedList = [...diaries];
      updatedList[diaryIndex] = normalizedDiary;
      this.state.setAllDiaries(updatedList);
    }
  }

  private normalizeSteps(rawSteps: TravelDiary['steps']): Step[] {
    if (!Array.isArray(rawSteps)) {
      return [];
    }

    return rawSteps.map((step) => ({
      ...step,
      isEditing: typeof step?.isEditing === 'boolean' ? step.isEditing : false,
    })) as Step[];
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        // Met à jour l'état global avec l'id du carnet
        this.state.setCurrentDiaryId(+id); // <-- tu peux juste mettre un `TravelDiary` partiel ici
      }
    });
  }

  ngOnDestroy(): void {
    this.ownerFetchSub?.unsubscribe();
    this.themeFetchSub?.unsubscribe();
    this.stepCreationSub?.unsubscribe();
  }

  private resolveDiaryOwner(diary: unknown) {
    this.ownerFetchSub?.unsubscribe();
    this.ownerFetchSub = null;

    if (!diary || typeof diary !== 'object') {
      this.diaryOwner.set(null);
      return;
    }

    const diaryWithUser = diary as { user?: unknown; userId?: number };
    const userField = diaryWithUser.user;
    const fallbackId = typeof diaryWithUser.userId === 'number' ? diaryWithUser.userId : undefined;

    if (userField && typeof userField === 'object') {
      const user = userField as Partial<User>;
      const id = typeof user.id === 'number' ? user.id : fallbackId;

      if (typeof id !== 'number') {
        this.diaryOwner.set(null);
        return;
      }

      this.diaryOwner.set({
        id,
        avatar: user.avatar ?? null,
        label: user.username ?? user.userName ?? '',
      });
      return;
    }

    const ownerId = typeof userField === 'number' ? userField : fallbackId;

    if (typeof ownerId !== 'number') {
      this.diaryOwner.set(null);
      return;
    }

    this.diaryOwner.set({ id: ownerId, avatar: null, label: '' });
    this.fetchDiaryOwner(ownerId);
  }

  private fetchDiaryOwner(ownerId: number) {
    this.ownerFetchSub = this.userService
      .getUserProfile(ownerId)
      .pipe(take(1))
      .subscribe({
        next: (profile) => {
          this.diaryOwner.set({
            id: profile.id,
            avatar: profile.avatar ?? null,
            label: profile.pseudo || profile.email || '',
          });
        },
        error: () => {
          this.diaryOwner.set({ id: ownerId, avatar: null, label: '' });
        },
      });
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

  onAccordionToggle(stepId: number | undefined, isOpen: boolean) {
    if (!stepId) return;
    if (isOpen) {
      this.state.openedStepId.set(stepId); // ✅ Ferme tous les autres, ouvre celui-ci
    } else {
      this.state.openedStepId.set(null); // ✅ Ferme tout
    }
  }

  /**
   * Removes a step from the backend then refreshes the diary so the timeline stays consistent.
   * Keeps the UI responsive by resetting the edit state if the deleted step was being edited.
   */
  onDeleteSteps(id: number | undefined) {
    if (!id) {
      return;
    }

    const diaryId = this.state.currentDiaryId() ?? this.state.currentDiary()?.id ?? null;
    if (!diaryId) {
      this.stepFormError.set("Impossible d'identifier le carnet cible.");
      return;
    }

    this.stepService
      .deleteStep(id)
      .pipe(
        switchMap(() => this.stepService.getDiaryWithSteps(diaryId)),
        take(1)
      )
      .subscribe({
        next: (diary) => {
          this.applyUpdatedDiary(diary);
          if (this.activeEditingStep()?.id === id) {
            this.resetEditingState();
            this.isStepFormVisible.set(false);
            this.createStepForm?.reset();
          }
        },
        error: () => {
          this.stepFormError.set('Impossible de supprimer cette étape pour le moment.');
        },
      });
  }

  onStepClicked(stepId: number) {
    const step = this.state.steps().find((step) => step.id === stepId);
    if (step) {
      this.state.mapCenterCoords.set({
        lat: step.latitude,
        lng: step.longitude,
      });
    }
  }

  getCommentLabel(step: Step) {
    const count = step.comments?.length ?? 0;
    if (count === 1) {
      return '1 commentaire';
    } else if (count > 1) {
      return `${count} commentaires`;
    } else {
      return 'commentaire';
    }
  }

  handleButtonClick(action: string, step: Step): void {
    if (action === 'like') {
      console.info(`Step ${step.id} liké ! Total : ${step.likes}`);
      // Logique d'ajout de like dans le step -- Si pas déjà aimé en fonction de l'user
    } else if (action === 'comment') {
      console.info(`Afficher les commentaires du step ${step.id}`);
      // Gérer l'ouverture d'une section commentaires ou autre
      this.state.openedCommentStepId.set(
        this.state.openedCommentStepId() === step.id ? null : step.id
      );
    }
  }

  /**
   * Toggles edit mode for a step. When enabling, shows the modal with pre-filled data.
   * When cancelling, restores the default state and closes the modal if needed.
   */
  onStepEditModeChange(step: Step, isEditing: boolean): void {
    if (!step?.id) {
      return;
    }

    if (isEditing) {
      this.activeEditingStep.set(step);
      this.applyStepEditing(step.id);
      this.isStepFormVisible.set(true);
      this.stepFormError.set(null);
      this.ensureThemesLoaded();
    } else {
      if (this.activeEditingStep()?.id === step.id) {
        this.resetEditingState();
        this.isStepFormVisible.set(false);
        this.stepFormError.set(null);
        this.createStepForm?.reset();
      }
      this.applyStepEditing(null);
    }
  }

  /**
   * Clears the editing flags and deselects the active step when an edition ends.
   */
  private resetEditingState(): void {
    const current = this.activeEditingStep();
    this.activeEditingStep.set(null);
    if (current?.id) {
      this.applyStepEditing(null);
    }
  }

  /**
   * Updates the shared state so the accordion reflects which step is currently being edited.
   */
  private applyStepEditing(stepId: number | null): void {
    const steps = this.state.steps();
    if (!steps.length) {
      return;
    }

    const updatedSteps = steps.map((item) => ({
      ...item,
      isEditing: stepId != null && item.id === stepId,
    }));

    this.state.setSteps(updatedSteps);

    const diary = this.state.currentDiary();
    if (diary) {
      this.state.setCurrentDiary({ ...diary, steps: updatedSteps });
    }
  }

  scrollMediaContainer(stepId: number, direction: 'left' | 'right') {
    // Trouver le container avec querySelector
    const container = document.querySelector<HTMLDivElement>(
      `.step__media__container[data-id="${stepId}"]`
    );

    if (!container) return;

    const scrollAmount = 200; // pixels à scroller

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  /** URL de couverture pour le panneau latéral (alias pratique pour le template). */
  getDiaryCover(): string {
    const diary = this.state.currentDiary();
    return diary ? this.state.getDiaryCoverUrl(diary) : '';
  }

  /** Renvoie les médias d'une étape via le service partagé. */
  getStepMedias(step: Step): Media[] {
    return this.state.getStepMediaList(step);
  }
}
