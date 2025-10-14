import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconSize, Size } from '@model/variant.model';
import { BreakpointService } from '@service/breakpoint.service';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { AvatarComponent } from 'components/Atoms/avatar/avatar.component';
import { AuthService } from '@service/auth.service';
import { UserProfileDto } from '@dto/user-profile.dto';
import { SearchService } from '@service/search.service';
import { SearchResultItem } from '@model/search-result.model';
import { SearchBarComponent } from 'components/Molecules/search-bar/search-bar.component';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [
    IconComponent,
    ButtonComponent,
    CommonModule,
    AvatarComponent,
    RouterLink,
    ReactiveFormsModule,
    SearchBarComponent,
  ],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  readonly bp = inject(BreakpointService);
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);
  private readonly destroyRef = inject(DestroyRef);

  // 💡 IconSize adapté automatiquement au device
  readonly iconSize = computed<IconSize>(() => {
    if (this.bp.isMobile()) return 'lg';
    if (this.bp.isTablet()) return 'md';
    return 'lg';
  });

  readonly btnSize = computed<Size>(() => {
    if (this.bp.isMobileOrTablet()) return 'sm';
    return 'lg';
  });

  get isHomeOrArticlePage(): boolean {
    return this.router.url === '/';
  }

  get isMapPage(): boolean {
    return /^\/travels\/\d+$/.test(this.router.url);
  }

  get isMyDiariesPage(): boolean {
    return /^\/travels\/users\/\d+$/.test(this.router.url);
  }
  get isFilterPage(): boolean {
    return this.router.url === '/travels';
  }

  /** Identifiant de l'utilisateur connecté (null tant que non authentifié). */
  readonly currentUser = computed(() => this.authService.currentUser());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly currentUserId = computed(() => this.currentUser()?.id ?? null);
  readonly avatarLabel = computed(() => this.buildAvatarLabel(this.currentUser()));
  readonly avatarPicture = computed(() => this.currentUser()?.avatar ?? undefined);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly isSearchDropdownOpen = signal(false);
  readonly isSearchLoading = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searchResults = signal<SearchResultItem[]>([]);
  readonly hasSearchQuery = signal(false);

  readonly diaryResults = computed(() =>
    this.searchResults()
      .filter((item) => item.type === 'diary')
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  );

  readonly stepResults = computed(() =>
    this.searchResults()
      .filter((item) => item.type === 'step')
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  );

  readonly shouldDisplaySearchPanel = computed(() => {
    if (!this.isSearchDropdownOpen()) {
      return false;
    }
    if (this.isSearchLoading() || this.searchError()) {
      return true;
    }
    return this.hasSearchQuery();
  });

  private hideResultsTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Indique si le lien "Carnet de voyage" doit être rendu. */
  get canDisplayDiariesLink(): boolean {
    return this.isAuthenticated() && this.currentUserId() !== null;
  }

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      // Charge l'utilisateur courant lors d'un rafraîchissement avec session déjà active
      this.authService.loadCurrentUser().subscribe({ error: () => undefined });
    }

    this.searchControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((raw) => raw.trim()),
        tap((value) => {
          this.searchError.set(null);
          const hasQuery = value.length >= 2;
          this.hasSearchQuery.set(hasQuery);
          if (!hasQuery) {
            this.searchResults.set([]);
            this.isSearchLoading.set(false);
          }
        }),
        debounceTime(250),
        distinctUntilChanged(),
        filter((value) => value.length >= 2),
        switchMap((value) => {
          this.isSearchLoading.set(true);
          return this.searchService.search(value).pipe(
            tap((results) => this.searchResults.set(results)),
            finalize(() => this.isSearchLoading.set(false)),
            catchError(() => {
              this.searchError.set('Impossible de lancer la recherche pour le moment.');
              this.searchResults.set([]);
              return of([] as SearchResultItem[]);
            })
          );
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    if (this.hideResultsTimeout) {
      clearTimeout(this.hideResultsTimeout);
    }
  }

  onNavigateToLogin(): void {
    void this.router.navigate(['/login']);
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
    });
  }

  onSearchFocus(): void {
    this.cancelHideResultsTimeout();
    this.isSearchDropdownOpen.set(true);
  }

  onSearchBlur(): void {
    this.hideResultsTimeout = setTimeout(() => this.isSearchDropdownOpen.set(false), 150);
  }

  onSearchSubmit(rawQuery: string): void {
    const query = rawQuery.trim();
    if (!query.length) {
      return;
    }
    void this.router.navigate(['/travels'], { queryParams: { q: query } });
    this.isSearchDropdownOpen.set(false);
  }

  onSearchResultClick(result: SearchResultItem): void {
    this.isSearchDropdownOpen.set(false);
    if (result.type === 'step' && result.diaryId != null) {
      void this.router.navigate(['/travels', result.diaryId], {
        queryParams: { step: result.id },
      });
      return;
    }

    void this.router.navigate(['/travels', result.diaryId ?? result.id]);
  }

  onClearSearch(): void {
    this.searchControl.setValue('');
    this.searchResults.set([]);
    this.searchError.set(null);
    this.hasSearchQuery.set(false);
  }

  private cancelHideResultsTimeout(): void {
    if (this.hideResultsTimeout) {
      clearTimeout(this.hideResultsTimeout);
      this.hideResultsTimeout = null;
    }
  }

  private buildAvatarLabel(user: UserProfileDto | null): string {
    if (!user) {
      return 'Voyageur';
    }

    const names = [user.firstName, user.lastName].filter((value): value is string => {
      return typeof value === 'string' && value.trim().length > 0;
    });

    if (names.length) {
      return names.join(' ');
    }

    if (user.pseudo?.trim().length) {
      return user.pseudo;
    }

    if (user.email?.trim().length) {
      return user.email.split('@')[0] ?? 'Voyageur';
    }

    return 'Voyageur';
  }
}
