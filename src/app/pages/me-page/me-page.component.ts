import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { AvatarComponent } from 'components/Atoms/avatar/avatar.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { EditorComponent } from '../../shared/editor/editor.component';
import { TravelDiaryCardComponent } from 'components/Molecules/Card-ready-to-use/travel-diary-card/travel-diary-card.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { Router } from '@angular/router';
import { BreakpointService } from '@service/breakpoint.service';
import { UserService } from '@service/user.service';
import { AuthService } from '@service/auth.service';
import { ArticleService } from '@service/article.service';
import { ThemeService } from '@service/theme.service';
import { StepService } from '@service/step.service';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { TravelDiary } from '@model/travel-diary.model';
import { UserProfile } from '@model/user-profile.model';
import { Article } from '@model/article.model';
import { Theme } from '@model/theme.model';
import { ItemProps } from '@model/select.model';
import { UpsertArticleDto } from '@dto/article.dto';
import { UserProfileDto } from '@dto/user-profile.dto';
import {
  ArticleDraft,
  ArticleItem,
  INITIAL_ARTICLE_DRAFT,
  INITIAL_PROFILE_FORM,
  ManagedDiarySummary,
  ManagedUser,
  ManagedUserAction,
  NormalizedDiary,
  ProfileFormState,
  SectionId,
  SectionItem,
} from './models/me-page.models';

/**
 * Profile page mapped to the `/me` route. It follows the provided mock-ups
 * (mobile first) and progressively enhances the layout for larger screens.
 */
@Component({
  selector: 'app-me-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AvatarComponent,
    IconComponent,
    ButtonComponent,
    DividerComponent,
    TextInputComponent,
    EditorComponent,
    TravelDiaryCardComponent,
    SelectComponent,
  ],
  templateUrl: './me-page.component.html',
  styleUrl: './me-page.component.scss',
})
export class MePageComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly breakpointService = inject(BreakpointService);
  private readonly authService = inject(AuthService);
  private readonly articleService = inject(ArticleService);
  private readonly themeService = inject(ThemeService);
  private readonly stepService = inject(StepService);
  private readonly travelMapState = inject(TravelMapStateService);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  // Signal utilitaire exposé par le service de breakpoint : utilisé tel quel dans le template.
  readonly isMobileOrTablet = this.breakpointService.isMobileOrTablet;
  readonly isMobile = this.breakpointService.isMobile;

  // --- Signaux d'état principaux utilisés pour orchestrer la vue ---
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly profile = signal<UserProfile | null>(null);
  readonly diaries = signal<NormalizedDiary[]>([]);
  readonly diariesError = signal<string | null>(null);

  readonly openSection = signal<SectionId | null>('info');
  readonly searchTerm = signal('');
  readonly selectedManagedUserId = signal<number | null>(null);
  readonly articleDraft = signal<ArticleDraft>({ ...INITIAL_ARTICLE_DRAFT });
  readonly articleMediaSlots = signal(3);
  readonly profileForm = signal<ProfileFormState>({ ...INITIAL_PROFILE_FORM });
  readonly articleSearchTerm = signal('');
  readonly articleEditorView = signal<'list' | 'form'>('list');
  readonly articleFormMode = signal<'create' | 'edit'>('create');
  readonly articleFormSubmitting = signal(false);
  readonly articleFormError = signal<string | null>(null);
  readonly editingArticleId = signal<number | null>(null);
  readonly profileFormSubmitting = signal(false);
  readonly profileFormError = signal<string | null>(null);
  readonly profileDeleteSubmitting = signal(false);
  readonly profileDeleteError = signal<string | null>(null);

  private readonly defaultDiaryCover = '/Images/nosy-iranja.jpg';
  private managedUsersLoaded = false;

  readonly managedUsers = signal<ManagedUser[]>([]);
  readonly managedUsersLoading = signal(false);
  readonly managedUsersError = signal<string | null>(null);
  readonly selectedManagedUser = signal<ManagedUser | null>(null);
  readonly managedUserDetailsLoading = signal(false);
  readonly managedUserDetailsError = signal<string | null>(null);
  readonly managedUserAction = signal<ManagedUserAction | null>(null);

  readonly articles = signal<ArticleItem[]>([]);
  readonly articlesLoading = signal(false);
  readonly articlesError = signal<string | null>(null);
  readonly themes = signal<Theme[]>([]);
  readonly themeOptions = computed(() =>
    this.themes().map((theme) => ({ id: theme.id, label: theme.name }))
  );

  readonly roleBadges = computed(() => this.profile()?.roles ?? []);
  readonly isAdmin = computed(() => this.roleBadges().includes('ADMIN'));
  readonly userRoleLabel = computed(() => (this.isAdmin() ? 'Administrateur' : 'Voyageur'));

  // Construit le menu latéral : ajoute l'onglet admin si l'utilisateur possède le rôle adéquat.
  readonly sections = computed<SectionItem[]>(() => {
    const base: SectionItem[] = [
      { id: 'info', label: 'Mes informations' },
      { id: 'diaries', label: 'Mes carnets' },
      { id: 'articles', label: 'Gestion des articles' },
    ];

    if (this.isAdmin()) {
      base.push({ id: 'users', label: 'Gestion des utilisateurs', adminOnly: true });
    }

    return base;
  });

  // Simplissime filtrage côté client alimenté par l'input de recherche.
  readonly filteredManagedUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.managedUsers();
    }

    return this.managedUsers().filter((user) => user.name.toLowerCase().includes(term));
  });

  readonly filteredArticles = computed(() => {
    const term = this.articleSearchTerm().trim().toLowerCase();
    if (!term) {
      return this.articles();
    }

    return this.articles().filter((article) => {
      const textPreview = this.stripHtml(article.content);
      const haystack =
        `${article.title} ${article.author} ${article.category} ${textPreview}`.toLowerCase();
      return haystack.includes(term);
    });
  });

  readonly articleSubmitLabel = computed(() => {
    if (this.articleFormSubmitting()) {
      return 'Enregistrement…';
    }
    return this.articleFormMode() === 'edit' ? "Enregistrer l'article" : "Créer l'article";
  });

  // Génère les index nécessaires pour itérer sur les boutons d'upload.
  readonly mediaSlotIndexes = computed(() =>
    Array.from({ length: this.articleMediaSlots() }, (_, idx) => idx)
  );

  /** Initialise la page et attache les effets réactifs liés aux signaux. */
  ngOnInit(): void {
    this.loadProfile();
    this.loadThemes();
    this.loadArticles();
  }

  /** Libère les abonnements RxJS pour éviter les fuites mémoire. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Relance la récupération du profil après une erreur utilisateur. */
  reload(): void {
    this.loadProfile();
  }

  /** Ouvre la section souhaitée dans la navigation latérale. */
  setActiveSection(id: SectionId): void {
    this.openSection.set(id);
  }

  /** Vérifie si une section donnée est actuellement sélectionnée. */
  isSectionOpen(id: SectionId): boolean {
    return this.openSection() === id;
  }

  /** Met à jour le terme de recherche pour filtrer les utilisateurs gérés. */
  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  /** Ouvre un utilisateur dans le panneau latéral détaillé. */
  onSelectManagedUser(userId: number): void {
    this.selectedManagedUserId.set(userId);
    this.managedUserDetailsError.set(null);
    const cached = this.managedUsers().find((user) => user.id === userId) ?? null;
    this.selectedManagedUser.set(cached);
    this.managedUserDetailsLoading.set(true);

    this.userService
      .getUserProfile(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          const managed = this.mapProfileToManagedUser(profile);
          this.selectedManagedUser.set(managed);
          this.managedUsers.update((users) => {
            const index = users.findIndex((user) => user.id === managed.id);
            if (index === -1) {
              return [...users, managed];
            }

            const clone = [...users];
            clone[index] = managed;
            return clone;
          });
          this.managedUserDetailsLoading.set(false);
        },
        error: (err) => {
          this.managedUserDetailsLoading.set(false);
          this.managedUserDetailsError.set(
            err?.message ?? "Impossible de charger les carnets de l'utilisateur."
          );
          console.error('managed user details fetch failed', err);
        },
      });
  }

  /** Ferme le panneau détaillé des utilisateurs administrés. */
  clearSelectedManagedUser(): void {
    this.selectedManagedUserId.set(null);
    this.selectedManagedUser.set(null);
    this.managedUserDetailsLoading.set(false);
    this.managedUserDetailsError.set(null);
  }

  reloadManagedUsers(): void {
    this.managedUsersLoaded = false;
    this.loadManagedUsers(true);
  }

  isManagedUserActionPending(userId: number): boolean {
    const action = this.managedUserAction();
    return Boolean(action && action.userId === userId);
  }

  /** Met à jour le rôle administrateur d'un utilisateur via l'API. */
  toggleAdmin(userId: number): void {
    const currentAction = this.managedUserAction();
    if (currentAction && currentAction.userId === userId) {
      return;
    }

    const target = this.managedUsers().find((user) => user.id === userId);
    if (!target) {
      return;
    }

    const admin = !target.isAdmin;
    this.managedUsersError.set(null);
    this.setManagedUserAction({ userId, type: 'toggle-role' });

    this.userService
      .setAdminRole(userId, admin)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          const managed = this.mapProfileToManagedUser(profile);
          this.managedUsers.update((list) =>
            list.map((user) => (user.id === userId ? managed : user))
          );
          if (this.selectedManagedUserId() === userId) {
            this.selectedManagedUser.set(managed);
          }
          this.setManagedUserAction(null);
        },
        error: (err) => {
          this.managedUsersError.set(
            err?.message ?? 'Impossible de mettre à jour le rôle administrateur.'
          );
          this.setManagedUserAction(null);
          console.error('managed user admin toggle failed', err);
        },
      });
  }

  /** Supprime un utilisateur via l'API puis synchronise la liste locale. */
  removeManagedUser(userId: number): void {
    const currentAction = this.managedUserAction();
    if (currentAction && currentAction.userId === userId) {
      return;
    }

    this.managedUsersError.set(null);
    this.setManagedUserAction({ userId, type: 'delete' });

    this.userService
      .deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.managedUsers.update((list) => list.filter((user) => user.id !== userId));
          if (this.selectedManagedUserId() === userId) {
            this.clearSelectedManagedUser();
          }
          this.setManagedUserAction(null);
        },
        error: (err) => {
          const message = err?.message ?? 'Impossible de supprimer cet utilisateur.';
          this.managedUsersError.set(message);
          this.setManagedUserAction(null);
          console.error('managed user deletion failed', err);
        },
      });
  }

  /** Gestion du terme de recherche côté articles. */
  onArticleSearch(term: string): void {
    this.articleSearchTerm.set(term);
  }

  /** Affiche la vue liste des articles. */
  showArticleList(): void {
    this.articleEditorView.set('list');
    this.articleFormMode.set('create');
    this.editingArticleId.set(null);
    this.resetArticleForm();
    this.articleFormError.set(null);
    this.articleFormSubmitting.set(false);
  }

  /** Prépare la création d'un nouvel article. */
  startArticleCreation(): void {
    this.articleEditorView.set('form');
    this.articleFormMode.set('create');
    this.editingArticleId.set(null);
    this.resetArticleForm();
    this.articleFormError.set(null);
  }

  /** Prépare l'édition d'un article existant. */
  startArticleEdition(articleId: number): void {
    const article = this.articles().find((item) => item.id === articleId);
    if (!article) {
      return;
    }

    this.articleEditorView.set('form');
    this.articleFormMode.set('edit');
    this.editingArticleId.set(articleId);
    const categoryLabel = this.resolveThemeLabel(article.themeId, article.category);
    this.articleDraft.set({
      title: article.title,
      author: article.author,
      category: categoryLabel,
      content: article.content,
      themeId: article.themeId ?? null,
    });
    this.articleMediaSlots.set(3);
    this.articleFormError.set(null);
  }

  /** Supprime un article via l'API et synchronise la liste locale. */
  deleteArticle(articleId: number): void {
    this.articlesError.set(null);

    this.articleService
      .deleteArticle(articleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.articles.update((items) => items.filter((article) => article.id !== articleId));
          if (this.editingArticleId() === articleId) {
            this.showArticleList();
          }
        },
        error: (err) => {
          this.articlesError.set(err?.message ?? "La suppression de l'article a échoué.");
          console.error('article deletion failed', err);
        },
      });
  }

  /**
   * Met à jour un champ du brouillon d'article en conservant les autres valeurs.
   * L'approche immuable garantit que le signal détecte le changement.
   */
  updateDraft<K extends keyof ArticleDraft>(field: K, value: ArticleDraft[K]): void {
    this.articleDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  /**
   * Met à jour un champ du formulaire profil (nom, prénom, pseudo, email).
   */
  onProfileFieldChange(field: keyof ProfileFormState, value: string): void {
    this.profileForm.update((state) => ({ ...state, [field]: value }));
  }

  /** Ajoute un slot média supplémentaire dans la limite autorisée. */
  addMediaSlot(): void {
    this.articleMediaSlots.update((count) => Math.min(count + 1, 5));
  }

  onThemeSelect(selection: ItemProps | ItemProps[]): void {
    const item = Array.isArray(selection) ? (selection.at(0) ?? null) : selection;

    if (!item) {
      this.updateDraft('category', '');
      this.updateDraft('themeId', null);
      return;
    }

    const themeId = Number(item.id);
    this.updateDraft('category', item.label);
    this.updateDraft('themeId', Number.isNaN(themeId) ? null : themeId);
  }

  /** Envoie le brouillon d'article vers l'API puis réinitialise le formulaire. */
  submitArticle(): void {
    if (this.articleFormSubmitting()) {
      return;
    }

    const draft = this.articleDraft();
    const mode = this.articleFormMode();
    const editingId = this.editingArticleId();
    const isEdit = mode === 'edit' && editingId != null;

    if (!draft.title.trim()) {
      this.articleFormError.set('Le titre est obligatoire.');
      return;
    }

    if (!draft.content.trim()) {
      this.articleFormError.set('Le contenu est obligatoire.');
      return;
    }

    const profile = this.profile();
    const baseUserId = profile?.id ?? null;
    let targetUserId = baseUserId;

    if (isEdit && editingId != null) {
      const existing = this.articles().find((article) => article.id === editingId);
      if (existing?.userId != null) {
        targetUserId = existing.userId;
      }
    }

    if (targetUserId == null) {
      this.articleFormError.set("Impossible de déterminer l'utilisateur associé à l'article.");
      return;
    }

    const payload = this.buildUpsertPayload(draft, targetUserId);

    this.articleFormSubmitting.set(true);
    this.articleFormError.set(null);

    const upsert$ = isEdit
      ? this.articleService.updateArticle(editingId!, payload)
      : this.articleService.createArticle(payload);

    upsert$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (article) => {
        const item = this.mapArticleToItem(article);
        if (isEdit) {
          this.articles.update((items) =>
            items.map((existing) => (existing.id === item.id ? item : existing))
          );
        } else {
          this.articles.update((items) => [item, ...items]);
        }

        this.articleFormSubmitting.set(false);
        this.articleFormError.set(null);
        this.showArticleList();
      },
      error: (err) => {
        this.articleFormSubmitting.set(false);
        this.articleFormError.set(
          err?.message ?? "Une erreur est survenue lors de l'enregistrement de l'article."
        );
        console.error('article upsert failed', err);
      },
    });
  }

  /** Placeholder d'enregistrement des modifications de profil. */
  saveProfileChanges(): void {
    if (this.profileFormSubmitting()) {
      return;
    }

    const current = this.profile();
    if (!current) {
      return;
    }

    this.profileFormError.set(null);
    const payload = this.buildProfileUpdatePayload();
    if (!payload) {
      return;
    }

    this.profileFormSubmitting.set(true);
    this.profileFormError.set(null);

    this.userService
      .updateUser(current.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProfile) => {
          this.profile.set(updatedProfile);
          this.patchProfileForm(updatedProfile);
          this.profileFormSubmitting.set(false);
          this.profileFormError.set(null);
        },
        error: (err) => {
          this.profileFormSubmitting.set(false);
          this.profileFormError.set(
            err?.message ?? 'Impossible de mettre à jour vos informations pour le moment.'
          );
          console.error('profile update failed', err);
        },
      });
  }

  /** Action destructive à confirmer : suppression du compte (non implémenté ici). */
  deleteAccount(): void {
    if (this.profileDeleteSubmitting()) {
      return;
    }

    const current = this.profile();
    if (!current) {
      return;
    }

    this.profileDeleteSubmitting.set(true);
    this.profileDeleteError.set(null);

    this.userService
      .deleteUser(current.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.profileDeleteSubmitting.set(false);
          this.profileDeleteError.set(null);
          this.logout();
        },
        error: (err) => {
          this.profileDeleteSubmitting.set(false);
          this.profileDeleteError.set(err?.message ?? 'La suppression du compte a échoué.');
          console.error('account deletion failed', err);
        },
      });
  }

  /** Réinitialise le formulaire d'article et ses slots média. */
  resetArticleForm(): void {
    const pseudo = this.profile()?.pseudo ?? '';
    this.articleDraft.set({ ...INITIAL_ARTICLE_DRAFT, author: pseudo });
    this.articleMediaSlots.set(3);
  }

  /** Nettoie les informations d'authentification avant redirection éventuelle. */
  logout(): void {
    this.authService.clearToken();
    console.info('User logged out');
  }

  private loadArticles(): void {
    this.articlesLoading.set(true);
    this.articlesError.set(null);

    this.articleService
      .getArticles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (articles) => {
          const items = articles.map((article) => this.mapArticleToItem(article));
          this.articles.set(items);
          this.articlesLoading.set(false);
          this.refreshArticleCategories();
        },
        error: (err) => {
          this.articlesError.set(
            err?.message ?? 'Une erreur est survenue lors du chargement des articles.'
          );
          this.articlesLoading.set(false);
          console.error('articles fetch failed', err);
        },
      });
  }

  private loadThemes(): void {
    this.themeService
      .getThemes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (themes) => {
          this.themes.set(themes);
          this.refreshArticleCategories();
        },
        error: (err) => {
          console.error('themes fetch failed', err);
          this.themes.set([]);
        },
      });
  }

  private loadManagedUsers(force = false): void {
    if (!this.isAdmin()) {
      return;
    }

    if (!force && (this.managedUsersLoaded || this.managedUsersLoading())) {
      return;
    }

    this.managedUsersLoading.set(true);
    this.managedUsersError.set(null);

    this.userService
      .getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profiles) => {
          const managed = profiles.map((profile) => this.mapProfileToManagedUser(profile));
          this.managedUsers.set(managed);
          this.managedUsersLoading.set(false);
          this.managedUsersLoaded = true;
          const selectedId = this.selectedManagedUserId();
          if (selectedId != null) {
            const updated = managed.find((user) => user.id === selectedId) ?? null;
            this.selectedManagedUser.set(updated);
          }
        },
        error: (err) => {
          this.managedUsersLoading.set(false);
          this.managedUsersError.set(
            err?.message ?? 'Impossible de charger la liste des utilisateurs.'
          );
          console.error('managed users fetch failed', err);
        },
      });
  }

  private mapProfileToManagedUser(profile: UserProfile): ManagedUser {
    const diaries = (profile.travelDiaries ?? []).map((diary) =>
      this.createManagedDiarySummary(diary)
    );

    return {
      id: profile.id,
      name: this.buildUserDisplayName(profile),
      email: profile.email ?? 'Email non communiqué',
      isAdmin: profile.roles.includes('ADMIN'),
      diaries,
    };
  }

  private buildUserDisplayName(profile: UserProfile): string {
    const firstName = profile.firstName?.trim() ?? '';
    const lastName = profile.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || profile.pseudo;
  }

  private createManagedDiarySummary(diary: TravelDiary): ManagedDiarySummary {
    /**
     * On réutilise la normalisation utilisateur pour conserver un traitement
     * homogène (steps, médias) puis on délègue la résolution d'image au service
     * partagé afin d'éviter les divergences entre `/me`, `/travels` et `/travels/users/:id`.
     */
    const normalized = this.normalizeDiary(diary);
    return {
      id: normalized.id,
      title: normalized.title,
      destination: this.getDiaryDestination(normalized),
      coverUrl: this.travelMapState.getDiaryCoverUrl(normalized) ?? this.defaultDiaryCover,
      durationLabel: undefined,
      stepCount: normalized.steps.length,
      isPrivate: normalized.private,
    };
  }

  private getDiaryDestination(diary: NormalizedDiary): string {
    const firstStep = diary.steps[0];
    return firstStep?.country || firstStep?.title || '';
  }

  private resetManagedUsers(): void {
    this.managedUsers.set([]);
    this.managedUsersLoaded = false;
    this.managedUsersError.set(null);
    this.managedUsersLoading.set(false);
    this.selectedManagedUserId.set(null);
    this.selectedManagedUser.set(null);
    this.managedUserDetailsLoading.set(false);
    this.managedUserDetailsError.set(null);
    this.managedUserAction.set(null);
  }

  private setManagedUserAction(action: ManagedUserAction | null): void {
    this.managedUserAction.set(action);
  }

  private buildProfileUpdatePayload(): Partial<UserProfileDto> | null {
    const form = this.profileForm();
    const current = this.profile();

    if (!current) {
      return null;
    }

    const pseudo = form.pseudo.trim();
    if (!pseudo) {
      this.profileFormError.set('Le pseudo est obligatoire.');
      return null;
    }

    const maybeTrim = (value: string | undefined) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length ? trimmed : undefined;
    };
    const payload: Partial<UserProfileDto> = {
      pseudo,
      firstName: maybeTrim(form.firstName),
      lastName: maybeTrim(form.lastName),
      email: maybeTrim(form.email),
    };

    const password = form.password.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (password || confirmPassword) {
      if (!password || !confirmPassword) {
        this.profileFormError.set('Les deux champs mot de passe sont requis.');
        return null;
      }

      if (password !== confirmPassword) {
        this.profileFormError.set('Les mots de passe doivent être identiques.');
        return null;
      }

      if (password.length < 8) {
        this.profileFormError.set('Le mot de passe doit contenir au moins 8 caractères.');
        return null;
      }

      payload.password = password;
    }

    return payload;
  }

  private mapArticleToItem(article: Article): ArticleItem {
    const rawThemeId = article.themeId;
    const themeId = rawThemeId != null ? Number(rawThemeId) : null;
    const normalizedThemeId = themeId !== null && Number.isNaN(themeId) ? null : themeId;
    const categoryLabel = this.resolveThemeLabel(normalizedThemeId, article.category ?? undefined);
    const fallbackCategory = categoryLabel || this.resolveCategoryFromThemes(article.themes);
    return {
      id: article.id,
      title: article.title,
      author: article.author ?? '',
      category: fallbackCategory,
      content: article.content,
      themeId: normalizedThemeId,
      publishedAt: article.updatedAt,
      slug: article.slug,
      themes: article.themes,
      userId: article.userId ?? null,
    };
  }

  private buildUpsertPayload(draft: ArticleDraft, userId: number): UpsertArticleDto {
    const rawThemeId = draft.themeId;
    const themeId = rawThemeId != null ? Number(rawThemeId) : undefined;
    const normalizedThemeId = themeId !== undefined && Number.isNaN(themeId) ? undefined : themeId;
    const themeIds = normalizedThemeId != null ? [normalizedThemeId] : [];

    return {
      title: draft.title.trim(),
      content: draft.content,
      userId,
      themeIds,
    };
  }

  private resolveThemeLabel(themeId: number | null | undefined, fallback?: string | null): string {
    if (themeId != null) {
      const theme = this.themes().find((item) => item.id === themeId);
      if (theme) {
        return theme.name;
      }
    }

    return fallback?.trim() ?? '';
  }

  private resolveCategoryFromThemes(themes?: Theme[] | null): string {
    if (!themes || !themes.length) {
      return '';
    }

    const firstTheme = themes.find((theme) => Boolean(theme?.name?.trim()));
    return firstTheme?.name?.trim() ?? '';
  }

  private refreshArticleCategories(): void {
    this.articles.update((items) =>
      items.map((article) => {
        const resolved = this.resolveThemeLabel(article.themeId, article.category);
        const category = resolved || this.resolveCategoryFromThemes(article.themes);
        return {
          ...article,
          category,
        };
      })
    );
  }

  /**
   * Récupère en parallèle le profil utilisateur et ses carnets.
   * Les signaux `isLoading`, `error`, `profile` et `diaries` sont mis à jour en cascade
   * pour piloter les différents états du template.
   */
  private loadProfile(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.diariesError.set(null);

    this.userService
      .getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          const normalizedDiaries = (profile.travelDiaries ?? []).map((diary) =>
            this.normalizeDiary(diary)
          );
          this.diaries.set(normalizedDiaries);
          this.patchProfileForm(profile);
          this.isLoading.set(false);
          this.profileDeleteSubmitting.set(false);
          this.profileDeleteError.set(null);
          if (this.isAdmin()) {
            this.loadManagedUsers();
          } else {
            this.resetManagedUsers();
          }
          console.info('profile loaded', profile);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Une erreur est survenue lors du chargement du profil.');
          console.error('profile load failed', err);

          this.isLoading.set(false);
        },
      });
  }

  /** Alimente le formulaire local avec les données du profil récupéré en API. */
  private patchProfileForm(profile: UserProfile): void {
    this.profileForm.set({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email ?? '',
      pseudo: profile.pseudo,
      password: '',
      confirmPassword: '',
    });
    this.profileFormSubmitting.set(false);
    this.profileFormError.set(null);
  }

  /**
   * Couverture utilisée dans la section "Mes carnets".
   * Le helper centralise la récupération de l'URL (média principal ou fallback étape).
   */
  getUserDiaryCover(diary: NormalizedDiary): string {
    return this.travelMapState.getDiaryCoverUrl(diary) || this.defaultDiaryCover;
  }

  /** Couverture utilisée pour les carnets affichés dans le panneau admin. */
  getManagedDiaryCover(summary: ManagedDiarySummary): string {
    return summary.coverUrl ?? this.defaultDiaryCover;
  }

  /** Retourne une description prête à afficher pour un carnet utilisateur. */
  getDiaryDescription(diary: NormalizedDiary): string {
    return diary.description?.trim() || 'Description à venir.';
  }

  /** Résume les étapes d'un carnet (ex: 3 étapes). */
  getDiaryStepLabel(diary: NormalizedDiary): string {
    const count = diary.steps.length;
    return count ? `${count} étape${count > 1 ? 's' : ''}` : 'Aucune étape';
  }

  /** Retourne le pays de la première étape ou un texte de secours. */
  getDiaryCountry(diary: NormalizedDiary): string {
    return diary.steps[0]?.country ?? '';
  }

  /** Produit un sous-titre pour les carnets affichés dans le panneau admin. */
  getManagedDiarySubtitle(diary: ManagedDiarySummary): string {
    const parts = [diary.destination, diary.durationLabel];
    if (typeof diary.stepCount === 'number') {
      const label = `${diary.stepCount} étape${diary.stepCount > 1 ? 's' : ''}`;
      parts.push(label);
    }
    return parts.filter(Boolean).join(' • ');
  }

  getArticlePreview(html: string | undefined | null): string {
    if (!html) {
      return 'Aucun aperçu disponible.';
    }

    const text = this.stripHtml(html);
    if (!text) {
      return 'Aucun aperçu disponible.';
    }
    return text.length > 160 ? `${text.slice(0, 160)}…` : text;
  }

  /** Garantit que les tableaux optionnels des carnets sont toujours définis. */
  private normalizeDiary(diary: TravelDiary): NormalizedDiary {
    const steps = Array.isArray(diary.steps) ? diary.steps : [];

    return {
      ...diary,
      steps,
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Placeholders en attendant le branchement API : navigation vers un carnet
   * ou actions admin (privacy/suppression).
   */
  openDiary(diaryId: number): void {
    void this.router.navigate(['/travels', diaryId]);
  }

  openManagedDiary(_userId: number, diaryId: number): void {
    void this.router.navigate(['/travels', diaryId]);
  }

  toggleDiaryPrivacy(diaryId: number): void {
    this.diaries.update((items) =>
      items.map((diary) =>
        diary.id === diaryId
          ? {
              ...diary,
              private: !diary.private,
            }
          : diary
      )
    );
  }

  toggleManagedDiaryPrivacy(userId: number, diaryId: number): void {
    this.managedUsers.update((users) =>
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              diaries: user.diaries.map((diary) =>
                diary.id === diaryId
                  ? {
                      ...diary,
                      isPrivate: !diary.isPrivate,
                    }
                  : diary
              ),
            }
          : user
      )
    );
  }

  deleteDiary(diaryId: number): void {
    const snapshotDiaries = this.diaries().map((diary) => ({
      ...diary,
      media: diary.media ? { ...diary.media } : null,
      steps: [...diary.steps],
    }));

    this.diariesError.set(null);

    this.diaries.update((items) => items.filter((diary) => diary.id !== diaryId));

    this.stepService
      .deleteDiary(diaryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => undefined,
        error: (err) => {
          this.diaries.set(snapshotDiaries);
          const message = err?.message ?? 'Impossible de supprimer ce carnet pour le moment.';
          this.diariesError.set(message);
          console.error('diary deletion failed', err);
        },
      });
  }

  deleteManagedDiary(userId: number, diaryId: number): void {
    const snapshotUsers = this.managedUsers().map((user) => ({
      ...user,
      diaries: user.diaries.map((diary) => ({ ...diary })),
    }));
    const snapshotSelected = (() => {
      const current = this.selectedManagedUser();
      if (!current) {
        return null;
      }
      return {
        ...current,
        diaries: current.diaries.map((diary) => ({ ...diary })),
      };
    })();

    this.managedUserDetailsError.set(null);

    this.managedUsers.update((users) =>
      users.map((user) =>
        user.id === userId
          ? {
              ...user,
              diaries: user.diaries.filter((diary) => diary.id !== diaryId),
            }
          : user
      )
    );

    if (this.selectedManagedUserId() === userId) {
      this.selectedManagedUser.update((selected) =>
        selected
          ? {
              ...selected,
              diaries: selected.diaries.filter((diary) => diary.id !== diaryId),
            }
          : selected
      );
    }

    this.stepService
      .deleteDiary(diaryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => undefined,
        error: (err) => {
          this.managedUsers.set(snapshotUsers);
          this.selectedManagedUser.set(snapshotSelected);
          const message = err?.message ?? 'Impossible de supprimer ce carnet pour le moment.';
          this.managedUserDetailsError.set(message);
          console.error('managed diary deletion failed', err);
        },
      });
  }
}
