import {
  Component,
  HostListener,
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
import { Comment } from '@model/comment';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { CommonModule, DOCUMENT } from '@angular/common';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { BreakpointService } from '@service/breakpoint.service';
import { AvatarComponent } from '../../components/Atoms/avatar/avatar.component';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '@service/user.service';
import { User } from '@model/user.model';
import { Observable, Subscription, forkJoin, of, EMPTY } from 'rxjs';
import { finalize, map, switchMap, take } from 'rxjs/operators';
import { CreateStepFormComponent } from 'components/Organisms/create-step-form/create-step-form.component';
import { StepService } from '@service/step.service';
import { CommentService } from '@service/comment.service';
import { CreateStepDto } from '@dto/create-step.dto';
import { ItemProps } from '@model/select.model';
import { ThemeService } from '@service/theme.service';
import { TravelDiary } from '@model/travel-diary.model';
import { Theme } from '@model/theme.model';
import { normalizeThemeSelection } from '@utils/theme-selection.util';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { MediaPayload, StepFormResult } from '@model/stepFormResult.model';
import { MediaService } from '@service/media.service';
import { CreateMediaDto } from '@dto/create-media.dto';
import { SafeHtmlPipe } from 'shared/pipes/safe-html.pipe';

type DiaryOwnerInfo = {
  id: number;
  avatar?: string | null;
  label: string;
};

type DiaryCompletionUpdate = {
  initial: TravelDiary;
  updatedDiary: TravelDiary | null | undefined;
  endDate: string;
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
    SafeHtmlPipe,
  ],
  templateUrl: './diary-page.component.html',
  styleUrl: './diary-page.component.scss',
})
export class DiaryPageComponent implements OnInit, OnDestroy {
  readonly state = inject(TravelMapStateService);
  private userService = inject(UserService);
  private stepService = inject(StepService);
  private commentService = inject(CommentService);
  private themeService = inject(ThemeService);
  private mediaService = inject(MediaService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;
  @ViewChild(CreateStepFormComponent) createStepForm?: CreateStepFormComponent;

  private readonly diaryOwner = signal<DiaryOwnerInfo | null>(null);
  private ownerFetchSub: Subscription | null = null;
  private pendingOwnerFetchId: number | null = null;
  private lastResolvedOwnerId: number | null = null;
  private themeFetchSub: Subscription | null = null;
  private stepCreationSub: Subscription | null = null;
  private readonly commentCreationSubs = new Map<number, Subscription>();
  private readonly commentDeletionSubs = new Map<number, Subscription>();
  private readonly commentUpdateSubs = new Map<number, Subscription>();
  private bodyOverflowBackup: string | null = null;

  readonly isStepFormVisible = signal(false);
  readonly isStepSubmitting = signal(false);
  readonly stepFormError = signal<string | null>(null);
  readonly stepThemes = signal<ItemProps[]>([]);
  readonly activeEditingStep = signal<Step | null>(null);
  readonly commentDrafts = signal<Record<number, string>>({});
  readonly commentErrors = signal<Record<number, string | null>>({});
  readonly commentSubmitting = signal<Record<number, boolean>>({});
  readonly commentDeleting = signal<Record<number, boolean>>({});
  readonly commentEditDrafts = signal<Record<number, string>>({});
  readonly commentEditErrors = signal<Record<number, string | null>>({});
  readonly commentUpdating = signal<Record<number, boolean>>({});
  readonly editingCommentId = signal<number | null>(null);
  readonly stepLikePending = signal<Record<number, boolean>>({});
  readonly stepLikeErrors = signal<Record<number, string | null>>({});
  readonly finishDiaryError = signal<string | null>(null);
  readonly isFinishingDiary = signal(false);

  /**
   * Indique quel média est actuellement affiché dans la visionneuse plein écran.
   * stepId permet de retrouver les médias associés à l'étape, index cible la photo active.
   */
  readonly activeMediaViewer = signal<{ stepId: number; index: number } | null>(null);

  /**
   * Dérive le média, la liste complète et l'index à partir de l'état actif.
   * Retourne null si l'étape ou le média n'existent plus (suppression concurrente, etc.).
   */
  readonly activeMediaPayload = computed(() => {
    const selection = this.activeMediaViewer();
    if (!selection) {
      return null;
    }

    const step = this.state.steps().find((item) => Number(item.id) === selection.stepId);

    if (!step) {
      return null;
    }

    const medias = this.getStepMedias(step);
    const media = medias[selection.index];

    if (!media) {
      return null;
    }

    return {
      medias,
      index: selection.index,
      media,
    };
  });

  readonly currentViewerId = computed(() => this.userService.currentUserId());

  readonly isViewerDisabled = computed(() => this.userService.isCurrentUserDisabled());
  readonly isAuthenticated = computed(() => this.userService.currentUserId() !== null);
  readonly canDiaryReceiveComments = computed(() => {
    const diary = this.state.currentDiary();
    return diary?.canComment !== false;
  });
  readonly canPostComment = computed(
    () => this.isAuthenticated() && this.canDiaryReceiveComments() && !this.isViewerDisabled()
  );

  /**
   * Wires reactive effects that keep route-driven signals aligned with the diary view.
   * Signal writes happen under Angular's default permissions, so no allowSignalWrites flag is required.
   */
  constructor() {
    effect(() => {
      if (this.state.panelHeight() === 'collapsedDiary') {
        // queueMicrotask --> Permet d’attendre que le DOM soit entièrement à jour avant d’agir (scroll, focus, etc.)
        queueMicrotask(() => {
          this.detailPanelRef?.nativeElement.scrollTo({ top: 0 });
        });
      }
    });

    effect(() => {
      this.resolveDiaryOwner(this.state.currentDiary());
    });

    effect(() => {
      const editingStep = this.activeEditingStep();
      const isVisible = this.isStepFormVisible();

      if (editingStep && isVisible) {
        queueMicrotask(() => this.createStepForm?.populateFromStep(editingStep));
      }
    });

    effect(() => {
      this.state.setViewerLikeOwner(this.currentViewerId());
    });
  }

  readonly diaryOwnerInfo = computed<DiaryOwnerInfo | null>(() => this.diaryOwner());

  readonly isDiaryOwner = computed(() => {
    const owner = this.diaryOwnerInfo();
    if (!owner) {
      return false;
    }

    if (this.isViewerDisabled()) {
      return false;
    }

    const current = this.userService.currentUserId();
    return typeof current === 'number' && owner.id === current;
  });

  readonly isEditingStep = computed(() => this.activeEditingStep() !== null);

  /**
   * Generates an accessible label for the owner navigation link.
   * @param owner Diary owner metadata.
   */
  getOwnerLinkAriaLabel(owner: DiaryOwnerInfo): string {
    const label = owner.label?.trim();
    return label ? `Voir les carnets de ${label}` : 'Voir les carnets de cet utilisateur';
  }

  /**
   * Navigates to the owner's diary list when possible.
   * @param owner Owner metadata or null when unavailable.
   */
  onOwnerNavigate(owner: DiaryOwnerInfo | null): void {
    if (!owner) {
      return;
    }

    this.router.navigate(['/travels', 'users', owner.id]).catch(() => {
      /* Navigation errors ignored */
    });
  }

  /** Opens the creation modal when the current user owns the diary. */
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
   * True when the finish button should be disabled for the current viewer.
   */
  isFinishDiaryDisabled(): boolean {
    return !this.isDiaryOwner() || this.isFinishingDiary();
  }

  /**
   * Close the current diary by aligning its end date with the last step.
   */
  onFinishDiary(): void {
    if (!this.isDiaryOwner() || this.isFinishingDiary()) {
      return;
    }

    if (this.isViewerDisabled()) {
      this.finishDiaryError.set(
        'Votre compte est désactivé. Vous ne pouvez plus modifier ce carnet.'
      );
      return;
    }

    const currentDiary = this.state.currentDiary();
    const diaryId = currentDiary?.id;

    if (!Number.isFinite(diaryId)) {
      this.finishDiaryError.set("Impossible d'identifier le carnet courant.");
      return;
    }

    this.finishDiaryError.set(null);
    this.isFinishingDiary.set(true);

    this.stepService
      .getDiaryWithSteps(diaryId as number)
      .pipe(
        take(1),
        switchMap((loadedDiary) => {
          const latestEndDate = this.extractLatestStepEndDate(loadedDiary?.steps ?? []);
          if (!latestEndDate) {
            this.finishDiaryError.set(
              'Aucune étape avec une date de fin n’est disponible pour ce carnet.'
            );
            return EMPTY as Observable<DiaryCompletionUpdate>;
          }

          return this.stepService
            .updateDiary(loadedDiary.id, {
              endDate: latestEndDate,
              status: 'COMPLETED',
            })
            .pipe(
              map((updatedDiary) => ({
                initial: loadedDiary,
                updatedDiary,
                endDate: latestEndDate,
              }))
            );
        }),
        finalize(() => {
          this.isFinishingDiary.set(false);
        })
      )
      .subscribe({
        next: ({ initial, updatedDiary, endDate }) => {
          const merged = this.mergeDiaryCompletion(initial, updatedDiary, endDate);
          this.applyUpdatedDiary(merged);
          this.finishDiaryError.set(null);
        },
        error: (err) => {
          console.error('Failed to finish diary', err);
          this.finishDiaryError.set('Impossible de terminer ce carnet pour le moment.');
        },
      });
  }

  /** Closes the step form and clears the editing state. */
  onStepFormCancel(): void {
    this.isStepFormVisible.set(false);
    this.stepFormError.set(null);
    this.createStepForm?.reset();
    this.resetEditingState();
  }

  /**
   * Persist the submitted step (create or update) and refresh the diary.
   * @param formValue Normalised form payload.
   */
  onStepFormSubmit(formValue: StepFormResult): void {
    if (this.isViewerDisabled()) {
      this.stepFormError.set('Votre compte est désactivé. Vous ne pouvez plus gérer vos étapes.');
      return;
    }

    const diaryId = this.state.currentDiaryId() ?? this.state.currentDiary()?.id ?? null;
    if (!diaryId) {
      this.stepFormError.set("Impossible d'identifier le carnet cible.");
      return;
    }

    const editingStep = this.activeEditingStep();

    const { themeIds: themeIdsPayload } = normalizeThemeSelection(
      formValue.themeId,
      formValue.themeIds
    );

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
      themeIds: themeIdsPayload,
    };

    const desiredMedia = Array.isArray(formValue.media) ? formValue.media : [];
    const existingMedia = editingStep?.media ?? [];

    this.isStepSubmitting.set(true);
    this.stepFormError.set(null);

    this.stepCreationSub?.unsubscribe();
    const stepRequest$ = editingStep
      ? this.stepService.updateStep(editingStep.id, payload).pipe(
          switchMap(() => this.syncStepMedia(editingStep.id, existingMedia, desiredMedia)),
          switchMap(() =>
            this.stepService
              .getDiaryWithSteps(diaryId)
              .pipe(map((diary) => ({ diary, targetStepId: editingStep.id })))
          )
        )
      : this.stepService.addStepToTravel(diaryId, payload).pipe(
          switchMap((createdStep) =>
            this.syncStepMedia(createdStep.id, createdStep.media ?? [], desiredMedia).pipe(
              map(() => createdStep)
            )
          ),
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

  /**
   * Synchronises the server-side media list with the desired list.
   * @param stepId Identifier of the step to update.
   * @param existingMedia Media currently attached to the step.
   * @param desiredMedia Media requested by the form.
   */
  private syncStepMedia(
    stepId: number,
    existingMedia: Media[] | undefined,
    desiredMedia: MediaPayload[]
  ): Observable<void> {
    if (!Number.isFinite(stepId)) {
      return of(void 0);
    }

    const currentMedia = Array.isArray(existingMedia) ? existingMedia : [];

    const normalizedDesired = Array.isArray(desiredMedia)
      ? desiredMedia
          .map((item) => ({
            fileUrl: item.fileUrl?.trim() ?? '',
            publicId: item.publicId ?? undefined,
          }))
          .filter((item) => !!item.fileUrl)
      : [];

    if (!normalizedDesired.length && !currentMedia.length) {
      return of(void 0);
    }

    const desiredUrls = new Set(normalizedDesired.map((item) => item.fileUrl));

    const toDelete = currentMedia.filter((media) => {
      const url = media.fileUrl?.trim();
      return !!url && !desiredUrls.has(url);
    });

    const toCreatePayloads: CreateMediaDto[] = normalizedDesired
      .filter((item) => !currentMedia.some((media) => media.fileUrl?.trim() === item.fileUrl))
      .map((item) => ({
        fileUrl: item.fileUrl,
        publicId: item.publicId,
        mediaType: 'PHOTO',
        stepId,
        isVisible: true,
      }));

    const delete$ = toDelete.length
      ? forkJoin(toDelete.map((media) => this.mediaService.deleteMedia(media.id))).pipe(
          map(() => void 0)
        )
      : of(void 0);

    const create$ = toCreatePayloads.length
      ? forkJoin(
          toCreatePayloads.map((payload) => this.mediaService.createStepMedia(payload))
        ).pipe(map(() => void 0))
      : of(void 0);

    return delete$.pipe(switchMap(() => create$));
  }

  /** Loads themes once so the selector displays them. */
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

  /**
   * Normalises a diary after a mutation and pushes it to the shared state.
   * @param updatedDiary Fresh diary returned by the backend.
   */
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

  private mergeDiaryCompletion(
    source: TravelDiary,
    updated: TravelDiary | null | undefined,
    endDate: string
  ): TravelDiary {
    const candidate = updated ?? source;
    const steps =
      Array.isArray(candidate.steps) && candidate.steps.length
        ? candidate.steps
        : (source.steps ?? []);

    return {
      ...source,
      ...candidate,
      endDate,
      status: candidate.status ?? 'COMPLETED',
      steps,
    };
  }

  private extractLatestStepEndDate(steps: Step[] | null | undefined): string | null {
    if (!Array.isArray(steps) || !steps.length) {
      return null;
    }

    let latest: { iso: string; timestamp: number } | null = null;

    for (const step of steps) {
      const iso = this.normalizeDate(step?.endDate);
      if (!iso) {
        continue;
      }

      const timestamp = Date.parse(iso);
      if (!Number.isFinite(timestamp)) {
        continue;
      }

      if (!latest || timestamp > latest.timestamp) {
        latest = { iso, timestamp };
      }
    }

    return latest?.iso ?? null;
  }

  private normalizeDate(value: string | Date | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * Ensures the diary steps contain consistent editing/theme metadata.
   * @param rawSteps Steps coming from the API.
   */
  private normalizeSteps(rawSteps: TravelDiary['steps']): Step[] {
    if (!Array.isArray(rawSteps)) {
      return [];
    }

    return rawSteps.map((step) => ({
      ...step,
      themeIds: Array.isArray(step?.themeIds)
        ? step.themeIds.filter((value): value is number => Number.isFinite(value as number))
        : [],
      themes: Array.isArray(step?.themes) ? (step.themes as Theme[]) : [],
      comments: this.normalizeComments(step?.comments),
      isEditing: typeof step?.isEditing === 'boolean' ? step.isEditing : false,
    })) as Step[];
  }

  /** Normalises comment collections coming from heterogeneous backend payloads. */
  private normalizeComments(source: unknown): Comment[] {
    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.normalizeComment(item))
      .filter((comment): comment is Comment => comment !== null);
  }

  /** Normalises a single comment entry, returning null when content is missing. */
  private normalizeComment(entry: unknown): Comment | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const raw = entry as Partial<Comment> & { user?: Partial<User> };
    const now = new Date().toISOString();

    const content = typeof raw.content === 'string' ? raw.content.trim() : '';
    if (!content) {
      return null;
    }

    return {
      id: typeof raw.id === 'number' ? raw.id : -1,
      content,
      status: typeof raw.status === 'string' ? raw.status : 'PENDING',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
      user: this.normalizeCommentUser(raw.user),
    } satisfies Comment;
  }

  /** Builds a consistent user representation for comments even when data is partial. */
  private normalizeCommentUser(user: Partial<User> | undefined): User {
    const label = this.pickUserLabel(user, 'Utilisateur');
    const pseudo =
      typeof user?.pseudo === 'string' && user.pseudo.trim() ? user.pseudo.trim() : label;

    return {
      id: typeof user?.id === 'number' ? user.id : -1,
      pseudo,
      avatar: user?.avatar ?? null,
      biography: user?.biography ?? null,
      status: user?.status ?? 'ACTIVE',
      enabled: typeof user?.enabled === 'boolean' ? user.enabled : true,
      email: user?.email ?? null,
      roles: user?.roles,
      createdAt: user?.createdAt,
      updatedAt: user?.updatedAt,
    } satisfies User;
  }

  /** Picks the most relevant label for displaying a user identity. */
  private pickUserLabel(user: unknown, fallback: string): string {
    if (!user || typeof user !== 'object') {
      return fallback;
    }

    const candidate = user as {
      pseudo?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
    };

    const pseudo = typeof candidate.pseudo === 'string' ? candidate.pseudo.trim() : '';
    if (pseudo) {
      return pseudo;
    }

    const firstName = typeof candidate.firstName === 'string' ? candidate.firstName.trim() : '';
    const lastName = typeof candidate.lastName === 'string' ? candidate.lastName.trim() : '';
    const composed = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (composed) {
      return composed;
    }

    const email = typeof candidate.email === 'string' ? candidate.email.trim() : '';
    if (email) {
      const localPart = email.split('@')[0]?.trim();
      if (localPart) {
        return localPart;
      }
    }

    return fallback;
  }

  /** Subscribes to the route params to keep the state in sync. */
  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        // Met à jour l'état global avec l'id du carnet
        this.state.setCurrentDiaryId(+id);
      }
    });
  }

  /** Releases subscriptions held by the component. */
  ngOnDestroy(): void {
    this.cancelOwnerFetch();
    this.themeFetchSub?.unsubscribe();
    this.stepCreationSub?.unsubscribe();
    this.commentCreationSubs.forEach((sub) => sub.unsubscribe());
    this.commentCreationSubs.clear();
    this.commentDeletionSubs.forEach((sub) => sub.unsubscribe());
    this.commentDeletionSubs.clear();
    this.commentUpdateSubs.forEach((sub) => sub.unsubscribe());
    this.commentUpdateSubs.clear();
    this.unlockBodyScroll();
  }

  /**
   * Determines the owner metadata from multiple backend shapes.
   * @param diary Diary payload coming from the store.
   */
  private resolveDiaryOwner(diary: unknown) {
    if (!diary || typeof diary !== 'object') {
      this.diaryOwner.set(null);
      this.lastResolvedOwnerId = null;
      this.cancelOwnerFetch();
      return;
    }

    const diaryWithUser = diary as { user?: unknown; userId?: number };
    const userField = diaryWithUser.user;
    const fallbackId = typeof diaryWithUser.userId === 'number' ? diaryWithUser.userId : undefined;
    const currentOwner = this.diaryOwner();

    if (userField && typeof userField === 'object') {
      const user = userField as Partial<User>;
      const id = typeof user.id === 'number' ? user.id : fallbackId;

      if (typeof id !== 'number') {
        this.diaryOwner.set(null);
        this.lastResolvedOwnerId = null;
        this.cancelOwnerFetch();
        return;
      }

      const nextOwner: DiaryOwnerInfo = {
        id,
        avatar: user.avatar ?? null,
        label: this.pickUserLabel(user, ''),
      };

      if (
        !currentOwner ||
        currentOwner.id !== nextOwner.id ||
        currentOwner.avatar !== nextOwner.avatar ||
        currentOwner.label !== nextOwner.label
      ) {
        this.diaryOwner.set(nextOwner);
      }

      this.lastResolvedOwnerId = nextOwner.id;

      if (this.pendingOwnerFetchId !== null) {
        this.cancelOwnerFetch();
      }

      return;
    }

    const ownerId = typeof userField === 'number' ? userField : fallbackId;

    if (typeof ownerId !== 'number') {
      this.diaryOwner.set(null);
      this.lastResolvedOwnerId = null;
      this.cancelOwnerFetch();
      return;
    }

    if (
      currentOwner?.id === ownerId &&
      (this.lastResolvedOwnerId === ownerId || this.pendingOwnerFetchId === ownerId)
    ) {
      return;
    }

    if (!currentOwner || currentOwner.id !== ownerId) {
      this.diaryOwner.set({ id: ownerId, avatar: null, label: '' });
    }

    this.lastResolvedOwnerId = null;

    this.fetchDiaryOwner(ownerId);
  }

  /**
   * Ouvre la visionneuse sur le média demandé et verrouille le scroll du body.
   * Ignoré si l'identifiant de l'étape est invalide.
   */
  openMediaViewer(step: Step, mediaIndex: number): void {
    const stepId = Number(step.id);
    if (Number.isNaN(stepId)) {
      return;
    }

    this.activeMediaViewer.set({ stepId, index: mediaIndex });
    this.lockBodyScroll();
  }

  /** Ferme la visionneuse et restaure le scroll de la page. */
  closeMediaViewer(): void {
    this.activeMediaViewer.set(null);
    this.unlockBodyScroll();
  }

  /** Navigue vers le média précédent (boucle en fin de liste). */
  showPreviousMedia(): void {
    const payload = this.activeMediaPayload();
    if (!payload) {
      return;
    }

    const nextIndex = payload.index === 0 ? payload.medias.length - 1 : payload.index - 1;
    this.activeMediaViewer.update((current) =>
      current ? { stepId: current.stepId, index: nextIndex } : current
    );
  }

  /** Navigue vers le média suivant (boucle au début de la liste). */
  showNextMedia(): void {
    const payload = this.activeMediaPayload();
    if (!payload) {
      return;
    }

    const nextIndex = payload.index === payload.medias.length - 1 ? 0 : payload.index + 1;
    this.activeMediaViewer.update((current) =>
      current ? { stepId: current.stepId, index: nextIndex } : current
    );
  }

  @HostListener('document:keydown', ['$event'])
  /** Gère les raccourcis clavier (Échap, flèches) quand la visionneuse est ouverte. */
  handleLightboxKeyboard(event: KeyboardEvent): void {
    if (!this.activeMediaViewer()) {
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeMediaViewer();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.showPreviousMedia();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.showNextMedia();
        break;
      default:
        break;
    }
  }

  /** Retient la valeur initiale de overflow et désactive le scroll de la page. */
  private lockBodyScroll(): void {
    if (this.bodyOverflowBackup !== null) {
      return;
    }

    this.bodyOverflowBackup = this.document.body.style.overflow ?? '';
    this.document.body.style.overflow = 'hidden';
  }

  /** Ré-applique la valeur initiale de overflow après fermeture de la visionneuse. */
  private unlockBodyScroll(): void {
    if (this.bodyOverflowBackup === null) {
      return;
    }

    if (this.bodyOverflowBackup) {
      this.document.body.style.overflow = this.bodyOverflowBackup;
    } else {
      this.document.body.style.removeProperty('overflow');
    }

    this.bodyOverflowBackup = null;
  }

  /**
   * Fetches owner information when only the id is available.
   * @param ownerId Identifier of the diary owner.
   */
  private fetchDiaryOwner(ownerId: number) {
    if (this.pendingOwnerFetchId === ownerId) {
      return;
    }

    this.cancelOwnerFetch();

    const subscription = this.userService
      .getUserProfile(ownerId)
      .pipe(take(1))
      .subscribe({
        next: (profile) => {
          this.diaryOwner.set({
            id: profile.id,
            avatar: profile.avatar ?? null,
            label: this.pickUserLabel(profile, profile.email ?? ''),
          });
          this.lastResolvedOwnerId = profile.id;
        },
        error: () => {
          this.diaryOwner.set({ id: ownerId, avatar: null, label: '' });
          this.lastResolvedOwnerId = ownerId;
        },
      });

    subscription.add(() => {
      if (this.pendingOwnerFetchId === ownerId) {
        this.pendingOwnerFetchId = null;
      }
      if (this.ownerFetchSub === subscription) {
        this.ownerFetchSub = null;
      }
    });

    this.pendingOwnerFetchId = ownerId;
    this.ownerFetchSub = subscription;
  }

  private cancelOwnerFetch(): void {
    if (this.ownerFetchSub) {
      this.ownerFetchSub.unsubscribe();
    }
    this.ownerFetchSub = null;
    this.pendingOwnerFetchId = null;
  }

  /** Toggles the diary detail panel height. */
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

    if (this.isViewerDisabled()) {
      this.stepFormError.set('Votre compte est désactivé. Vous ne pouvez plus gérer vos étapes.');
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

  formatLikeLabel(step: Step | null | undefined): string {
    const raw = step?.likes ?? step?.likesCount ?? 0;
    const likes = Number(raw);
    if (!Number.isFinite(likes) || likes <= 0) {
      return '';
    }

    return String(Math.max(1, Math.round(likes)));
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

  /**
   * Builds a readable author label for a comment entry.
   * @param comment Comment to inspect.
   */
  getCommentAuthor(comment: Comment): string {
    return this.pickUserLabel(comment?.user, 'Utilisateur');
  }

  /**
   * Retrieves the current draft content for a comment on the provided step.
   * @param stepId Target step identifier.
   */
  getCommentDraft(stepId: number): string {
    return this.commentDrafts()[stepId] ?? '';
  }

  /**
   * Updates the comment draft for a specific step.
   * @param stepId Target step identifier.
   * @param value Raw content typed by the user.
   */
  onCommentDraftChange(stepId: number, value: string): void {
    this.commentDrafts.update((drafts) => ({ ...drafts, [stepId]: value }));
  }

  /**
   * Retrieves the submission error message associated with a step.
   * @param stepId Target step identifier.
   */
  getCommentError(stepId: number): string | null {
    return this.commentErrors()[stepId] ?? null;
  }

  /**
   * Indicates whether the comment form for a step is currently submitting.
   * @param stepId Target step identifier.
   */
  isCommentSubmitting(stepId: number): boolean {
    return this.commentSubmitting()[stepId] ?? false;
  }

  /** Indicates whether a specific comment is in the process of being deleted. */
  isCommentDeleting(commentId: number): boolean {
    return this.commentDeleting()[commentId] ?? false;
  }

  /** Indicates whether the provided comment is currently being edited. */
  isCommentEditing(commentId: number): boolean {
    return this.editingCommentId() === commentId;
  }

  /** Retrieves the edit draft for a comment currently being edited. */
  getCommentEditDraft(commentId: number): string {
    return this.commentEditDrafts()[commentId] ?? '';
  }

  /** Updates the draft stored for a comment being edited. */
  onCommentEditDraftChange(commentId: number, value: string): void {
    this.commentEditDrafts.update((drafts) => ({ ...drafts, [commentId]: value }));
  }

  /** Returns the edit error assigned to a specific comment. */
  getCommentEditError(commentId: number): string | null {
    return this.commentEditErrors()[commentId] ?? null;
  }

  /** Tells whether a comment is currently waiting for an update response. */
  isCommentUpdating(commentId: number): boolean {
    return this.commentUpdating()[commentId] ?? false;
  }

  /**
   * Checks whether the viewer can manage (edit/delete) a comment.
   * Admins bypass ownership checks so they can moderate any comment.
   */
  canManageComment(comment: Comment | null | undefined): boolean {
    if (!comment) {
      return false;
    }

    // Administrators always retain moderation capabilities regardless of ownership.
    if (this.userService.isCurrentUserAdmin()) {
      return true;
    }

    if (this.isViewerDisabled()) {
      return false;
    }

    const viewerId = this.currentViewerId();
    if (!Number.isFinite(viewerId)) {
      return false;
    }

    if (this.isDiaryOwner()) {
      return true;
    }

    return comment.user?.id === viewerId;
  }

  /** Indicates if the viewer can edit the provided comment. */
  canEditComment(comment: Comment | null | undefined): boolean {
    if (!comment) {
      return false;
    }

    if (this.isViewerDisabled()) {
      return false;
    }

    const viewerId = this.currentViewerId();
    if (!Number.isFinite(viewerId)) {
      return false;
    }

    return comment.user?.id === viewerId;
  }

  /** Indicates if the viewer can delete the provided comment. */
  canDeleteComment(comment: Comment | null | undefined): boolean {
    return this.canManageComment(comment);
  }

  /**
   * Submits a new comment for the provided step when allowed by permissions.
   * @param step Step associated with the draft comment.
   */
  onSubmitComment(step: Step): void {
    const stepId = step?.id;
    if (!Number.isFinite(stepId)) {
      return;
    }

    if (!this.isAuthenticated()) {
      this.setCommentError(stepId, 'Vous devez être connecté pour commenter.');
      return;
    }

    if (this.isViewerDisabled()) {
      this.setCommentError(stepId, 'Votre compte est désactivé. Vous ne pouvez plus commenter.');
      return;
    }

    if (!this.canDiaryReceiveComments()) {
      this.setCommentError(stepId, 'Les commentaires sont désactivés pour ce carnet.');
      return;
    }

    const content = this.getCommentDraft(stepId).trim();
    if (!content) {
      this.setCommentError(stepId, 'Le commentaire ne peut pas être vide.');
      return;
    }

    this.setCommentError(stepId, null);
    this.setCommentSubmitting(stepId, true);

    this.commentCreationSubs.get(stepId)?.unsubscribe();

    const sub = this.commentService
      .create(stepId, content)
      .pipe(take(1))
      .subscribe({
        next: (comment) => {
          this.appendCommentToCollections(stepId, comment);
          this.setCommentDraft(stepId, '');
          this.setCommentSubmitting(stepId, false);
          this.commentCreationSubs.delete(stepId);
        },
        error: () => {
          this.setCommentError(stepId, "Impossible d'enregistrer le commentaire pour le moment.");
          this.setCommentSubmitting(stepId, false);
          this.commentCreationSubs.delete(stepId);
        },
      });

    this.commentCreationSubs.set(stepId, sub);
  }

  /** Deletes a comment when the current user owns the diary. */
  onDeleteComment(step: Step, comment: Comment): void {
    if (!this.canManageComment(comment)) {
      return;
    }

    const stepId = typeof step?.id === 'number' ? step.id : null;
    const commentId = typeof comment?.id === 'number' ? comment.id : null;

    if (stepId === null || commentId === null) {
      return;
    }

    this.setCommentError(stepId, null);
    this.setCommentDeleting(commentId, true);

    this.commentDeletionSubs.get(commentId)?.unsubscribe();

    const sub = this.commentService
      .delete(commentId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.removeCommentFromCollections(stepId, commentId);
          this.setCommentDeleting(commentId, false);
          this.commentDeletionSubs.delete(commentId);
        },
        error: () => {
          this.setCommentError(stepId, 'Impossible de supprimer le commentaire pour le moment.');
          this.setCommentDeleting(commentId, false);
          this.commentDeletionSubs.delete(commentId);
        },
      });

    this.commentDeletionSubs.set(commentId, sub);
  }

  /** Enables edit mode for the provided comment. */
  onEditComment(step: Step, comment: Comment): void {
    if (!this.canEditComment(comment)) {
      return;
    }

    const commentId = typeof comment?.id === 'number' ? comment.id : null;
    if (commentId === null) {
      return;
    }

    this.editingCommentId.set(commentId);
    this.commentEditDrafts.update((drafts) => ({
      ...drafts,
      [commentId]: comment.content ?? '',
    }));
    this.commentEditErrors.update((errors) => ({ ...errors, [commentId]: null }));
  }

  /** Cancels the edition of the current comment. */
  onCancelCommentEdit(): void {
    const editingId = this.editingCommentId();
    if (editingId !== null) {
      this.commentUpdateSubs.get(editingId)?.unsubscribe();
      this.commentUpdateSubs.delete(editingId);
      this.commentEditDrafts.update((drafts) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [editingId]: _removed, ...rest } = drafts;
        return rest;
      });
      this.commentEditErrors.update((errors) => ({ ...errors, [editingId]: null }));
      this.commentUpdating.update((state) => ({ ...state, [editingId]: false }));
    }

    this.editingCommentId.set(null);
  }

  /** Persists the edited comment content. */
  onSubmitCommentEdit(step: Step, comment: Comment): void {
    if (!this.canEditComment(comment)) {
      return;
    }

    const stepId = typeof step?.id === 'number' ? step.id : null;
    const commentId = typeof comment?.id === 'number' ? comment.id : null;

    if (stepId === null || commentId === null) {
      return;
    }

    const draft = this.getCommentEditDraft(commentId).trim();
    if (!draft) {
      this.setCommentEditError(commentId, 'Le commentaire ne peut pas être vide.');
      return;
    }

    this.setCommentEditError(commentId, null);
    this.setCommentUpdating(commentId, true);

    this.commentUpdateSubs.get(commentId)?.unsubscribe();

    const sub = this.commentService
      .update(commentId, stepId, draft)
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.updateCommentInCollections(stepId, updated);
          this.setCommentUpdating(commentId, false);
          this.commentEditDrafts.update((drafts) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [commentId]: _removed, ...rest } = drafts;
            return rest;
          });
          this.commentEditErrors.update((errors) => ({ ...errors, [commentId]: null }));
          this.editingCommentId.set(null);
          this.commentUpdateSubs.delete(commentId);
        },
        error: () => {
          this.setCommentEditError(
            commentId,
            'Impossible de mettre à jour le commentaire pour le moment.'
          );
          this.setCommentUpdating(commentId, false);
          this.commentUpdateSubs.delete(commentId);
        },
      });

    this.commentUpdateSubs.set(commentId, sub);
  }

  handleButtonClick(action: string, step: Step): void {
    if (action === 'like') {
      this.onStepLike(step);
    } else if (action === 'comment') {
      console.info(`Afficher les commentaires du step ${step.id}`);
      // Gérer l'ouverture d'une section commentaires ou autre
      const isAlreadyOpen = this.state.openedCommentStepId() === step.id;
      this.state.openedCommentStepId.set(isAlreadyOpen ? null : step.id);

      if (!isAlreadyOpen) {
        this.setCommentError(step.id, null);
      }
    }
  }

  /** Indicates whether a like request is currently pending for the provided step. */
  isStepLikePending(stepId: number): boolean {
    return !!this.stepLikePending()[stepId];
  }

  /**
   * Performs the like toggle flow: permission checks, optimistic update,
   * backend sync and rollback in case of failure. Uses both component-level
   * and service-level signals so the UI and other consumers stay aligned.
   * @param step Target step selected by the user.
   */
  private onStepLike(step: Step): void {
    const stepId = typeof step?.id === 'number' ? step.id : null;
    if (stepId === null) {
      return;
    }

    if (!this.isAuthenticated()) {
      this.setStepLikeError(stepId, 'Connectez-vous pour aimer une étape.');
      return;
    }

    if (this.isViewerDisabled()) {
      this.setStepLikeError(
        stepId,
        'Votre compte est désactivé. Vous ne pouvez plus aimer cette étape.'
      );
      return;
    }

    if (this.isStepLikePending(stepId)) {
      return;
    }

    this.setStepLikeError(stepId, null);

    const currentLikes = Number.isFinite(step?.likes) ? step.likes : 0;
    const hasLiked =
      typeof step?.viewerHasLiked === 'boolean'
        ? step.viewerHasLiked
        : this.state.hasViewerLikedStep(stepId);
    const increment = !hasLiked;
    const delta = increment ? 1 : -1;
    const optimisticLikes = Math.max(0, currentLikes + delta);
    const optimisticLikeFlag = increment;

    this.setStepLikePending(stepId, true);
    this.state.updateStepLikeState(stepId, optimisticLikes, optimisticLikeFlag);

    this.stepService
      .updateStepLikes(stepId, increment)
      .pipe(take(1))
      .subscribe({
        next: (updatedStep) => {
          const finalLikes = this.resolveLikesFromResponse(updatedStep, optimisticLikes);
          this.state.updateStepLikeState(stepId, finalLikes, optimisticLikeFlag);
          this.setStepLikePending(stepId, false);
        },
        error: () => {
          this.state.updateStepLikeState(stepId, currentLikes, hasLiked);
          this.setStepLikePending(stepId, false);
        },
      });
  }

  /**
   * Retrieves the validation/permission error currently attached to a step like action.
   * @param stepId Identifier of the targeted step.
   * @returns Error message or null when nothing is blocking the action.
   */
  getStepLikeError(stepId: number): string | null {
    return this.stepLikeErrors()[stepId] ?? null;
  }

  /** Tracks the pending status of a like update for the provided step. */
  private setStepLikePending(stepId: number, isPending: boolean): void {
    this.stepLikePending.update((state) => ({ ...state, [stepId]: isPending }));
  }

  /** Stores a like-related validation or permission error for the provided step. */
  private setStepLikeError(stepId: number, message: string | null): void {
    this.stepLikeErrors.update((errors) => ({ ...errors, [stepId]: message }));
  }

  /**
   * Retrieves the likes counter from a backend response while handling legacy fields.
   * @param step Response payload coming from the API.
   * @param fallback Value to return when the response is missing the counter.
   */
  private resolveLikesFromResponse(
    step: Partial<Step> | null | undefined,
    fallback: number
  ): number {
    if (Number.isFinite(step?.likesCount)) {
      return Math.max(0, Number(step?.likesCount));
    }

    if (Number.isFinite(step?.likes)) {
      return Math.max(0, Number(step?.likes));
    }

    return Math.max(0, Math.round(fallback));
  }

  /** Clears the tracked error message for the provided step. */
  private setCommentError(stepId: number, message: string | null): void {
    this.commentErrors.update((errors) => ({ ...errors, [stepId]: message }));
  }

  /** Updates the submitting state for the comment form of the provided step. */
  private setCommentSubmitting(stepId: number, isSubmitting: boolean): void {
    this.commentSubmitting.update((state) => ({ ...state, [stepId]: isSubmitting }));
  }

  /** Updates the deleting state for the provided comment identifier. */
  private setCommentDeleting(commentId: number, isDeleting: boolean): void {
    this.commentDeleting.update((state) => ({ ...state, [commentId]: isDeleting }));
  }

  /** Registers an error for a specific comment edition. */
  private setCommentEditError(commentId: number, message: string | null): void {
    this.commentEditErrors.update((errors) => ({ ...errors, [commentId]: message }));
  }

  /** Updates the loading state associated with a comment update. */
  private setCommentUpdating(commentId: number, isUpdating: boolean): void {
    this.commentUpdating.update((state) => ({ ...state, [commentId]: isUpdating }));
  }

  /** Overrides the comment draft value for a given step. */
  private setCommentDraft(stepId: number, value: string): void {
    this.commentDrafts.update((drafts) => ({ ...drafts, [stepId]: value }));
  }

  /**
   * Injects the freshly created comment into both the shared steps collection
   * and the current diary so the UI updates instantly.
   * @param stepId Identifier of the step that received the comment.
   * @param rawComment Comment returned by the backend.
   */
  private appendCommentToCollections(stepId: number, rawComment: Comment): void {
    const comment = this.normalizeComment(rawComment);
    if (!comment) {
      return;
    }

    const mapStep = (target: Step): Step => {
      if (target.id !== stepId) {
        return target;
      }

      const list = Array.isArray(target.comments) ? target.comments : [];
      return {
        ...target,
        comments: [...list, comment],
      };
    };

    const updatedSteps = this.state.steps().map(mapStep);
    this.state.setSteps(updatedSteps);

    const diary = this.state.currentDiary();
    if (diary) {
      const updatedDiarySteps = diary.steps.map(mapStep);
      this.state.setCurrentDiary({ ...diary, steps: updatedDiarySteps });
    }
  }

  /** Updates an existing comment in the shared collections. */
  private updateCommentInCollections(stepId: number, rawComment: Comment): void {
    const comment = this.normalizeComment(rawComment);
    if (!comment) {
      return;
    }

    const mapStep = (target: Step): Step => {
      if (target.id !== stepId) {
        return target;
      }

      const list = Array.isArray(target.comments) ? target.comments : [];
      return {
        ...target,
        comments: list.map((item) => (item.id === comment.id ? comment : item)),
      };
    };

    const updatedSteps = this.state.steps().map(mapStep);
    this.state.setSteps(updatedSteps);

    const diary = this.state.currentDiary();
    if (diary) {
      const updatedDiarySteps = diary.steps.map(mapStep);
      this.state.setCurrentDiary({ ...diary, steps: updatedDiarySteps });
    }
  }

  /** Removes a comment from the shared collections once deleted on the backend. */
  private removeCommentFromCollections(stepId: number, commentId: number): void {
    const mapStep = (target: Step): Step => {
      if (target.id !== stepId) {
        return target;
      }

      const list = Array.isArray(target.comments) ? target.comments : [];
      return {
        ...target,
        comments: list.filter((item) => item.id !== commentId),
      };
    };

    const updatedSteps = this.state.steps().map(mapStep);
    this.state.setSteps(updatedSteps);

    const diary = this.state.currentDiary();
    if (diary) {
      const updatedDiarySteps = diary.steps.map(mapStep);
      this.state.setCurrentDiary({ ...diary, steps: updatedDiarySteps });
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

    if (this.isViewerDisabled()) {
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

  /** URL de couverture pour le panneau latéral (alias pratique pour le template). */
  getDiaryCover(): string {
    const diary = this.state.currentDiary();
    return diary ? this.state.getDiaryCoverUrl(diary) : '';
  }

  /** Renvoie les médias d'une étape via le service partagé. */
  getStepMedias(step: Step): Media[] {
    return this.state.getStepMediaList(step);
  }

  getStepMediaUrl(media: Media | null | undefined): string {
    return this.injectCloudinaryTransform(media?.fileUrl ?? '', 'c_limit,w_auto:100:1000');
  }

  private injectCloudinaryTransform(source: string, transformation: string): string {
    if (!source) {
      return '';
    }

    const uploadToken = '/upload/';
    const uploadIndex = source.indexOf(uploadToken);
    if (uploadIndex === -1) {
      return source;
    }

    const afterUpload = source.slice(uploadIndex + uploadToken.length);

    if (!afterUpload) {
      return source;
    }

    const [firstSegment, ...rest] = afterUpload.split('/');

    if (firstSegment.startsWith('c_')) {
      if (firstSegment.includes('w_auto')) {
        return source;
      }

      const updatedFirstSegment = `${firstSegment},${transformation}`;
      const rebuiltPath = [updatedFirstSegment, ...rest].join('/');
      return source.slice(0, uploadIndex + uploadToken.length) + rebuiltPath;
    }

    const prefix = source.slice(0, uploadIndex + uploadToken.length);
    return `${prefix}${transformation}/${afterUpload}`;
  }
}
