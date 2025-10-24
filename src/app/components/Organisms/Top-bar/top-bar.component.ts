import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
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
  private readonly location = inject(Location);

  // 💡 IconSize adapté automatiquement au device
  readonly iconSize = computed<IconSize>(() => {
    return 'lg';
  });

  readonly btnSize = computed<Size>(() => {
    if (this.bp.isMobileOrTablet()) return 'sm';
    return 'lg';
  });

  readonly logoutIconSize = computed<IconSize>(() => {
    return 'md';
  });

  get isHomeOrArticlePage(): boolean {
    const url = this.router.url;
    return url === '/' || url.startsWith('/articles');
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

  /**
   * Initialise le flux de recherche et charge l'utilisateur au besoin.
   */
  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      // Charge l'utilisateur courant lors d'un rafraîchissement avec session déjà active
      this.authService.loadCurrentUser().subscribe({ error: () => undefined });
    }

    this.search()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /**
   * Prépare le flux de recherche de la top bar : normalise la requête,
   * applique un délai, filtre les entrées trop courtes et interroge l'API.
   */
  private search(): Observable<SearchResultItem[]> {
    return this.searchControl.valueChanges.pipe(
      map((raw) => raw.trim()), // map : retire les espaces avant/arrière pour comparer des chaînes standardisées.
      tap((value) => {
        this.searchError.set(null); // tap : purge l'erreur éventuelle, la moindre frappe relance une recherche saine.
        const hasQuery = value.length >= 2; // calcule si la requête atteint la longueur minimum.
        this.hasSearchQuery.set(hasQuery); // enregistre la présence d'une recherche pour piloter l'affichage du panneau.
        if (!hasQuery) {
          this.searchResults.set([]); // reset : efface les résultats lorsqu'on passe sous le seuil de longueur.
          this.isSearchLoading.set(false); // annule un éventuel loader puisqu'aucune requête ne partira.
        }
      }),
      debounceTime(250), // debounceTime : impose 250 ms de silence avant de relancer la recherche (limite les frappes rapides).
      distinctUntilChanged(), // distinctUntilChanged : évite de requêter si la valeur n'a finalement pas changé.
      filter((value) => value.length >= 2), // filter : bloque la séquence tant que la requête est trop courte.
      switchMap((value) => {
        // switchMap : annule la requête précédente et ne conserve que la dernière saisie.
        this.isSearchLoading.set(true); // active le loader avant l'appel réseau.
        return this.searchService.search(value).pipe(
          tap((results) => this.searchResults.set(results)), // tap : stocke les résultats immédiatement après leur arrivée.
          catchError(() => {
            this.searchError.set('Impossible de lancer la recherche pour le moment.'); // catchError : message user-friendly.
            this.searchResults.set([]); // catchError : vide la liste pour éviter d'afficher d'anciennes données.
            return of([] as SearchResultItem[]); // catchError : renvoie un observable vide pour maintenir la chaîne.
          }),
          finalize(() => this.isSearchLoading.set(false)) // finalize : coupe le loader qu'il y ait succès ou erreur.
        );
      })
    );
  }

  ngOnDestroy(): void {
    if (this.hideResultsTimeout) {
      clearTimeout(this.hideResultsTimeout);
    }
  }

  /**
   * Navigue vers la page de connexion.
   */
  onNavigateToLogin(): void {
    void this.router.navigate(['/login']);
  }

  /**
   * Déconnecte l'utilisateur et redirige vers la connexion.
   */
  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
    });
  }

  /**
   * Affiche le panneau de recherche lorsque l'input reçoit le focus.
   */
  onSearchFocus(): void {
    this.cancelHideResultsTimeout();
    this.isSearchDropdownOpen.set(true);
  }

  /**
   * Planifie la fermeture du panneau lorsque l'input perd le focus.
   */
  onSearchBlur(): void {
    this.hideResultsTimeout = setTimeout(() => this.isSearchDropdownOpen.set(false), 150);
  }

  /**
   * Soumet la recherche manuelle et redirige vers la page des voyages.
   */
  onSearchSubmit(rawQuery: string): void {
    const query = rawQuery.trim();
    if (!query.length) {
      return;
    }
    void this.router.navigate(['/travels'], { queryParams: { q: query } });
    this.isSearchDropdownOpen.set(false);
  }

  /**
   * Navigue vers la ressource associée au résultat sélectionné.
   */
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

  /**
   * Gère le bouton retour sur mobile en se basant sur l'historique ou un fallback.
   */
  onMobileBack(): void {
    if (this.hasBrowserHistory()) {
      this.location.back();
      return;
    }

    const fallback = this.resolveMobileBackFallback();
    void this.router.navigateByUrl(fallback);
  }

  /**
   * Réinitialise le champ de recherche et les résultats affichés.
   */
  onClearSearch(): void {
    this.searchControl.setValue('');
    this.searchResults.set([]);
    this.searchError.set(null);
    this.hasSearchQuery.set(false);
  }

  /**
   * Annule la fermeture différée du panneau de recherche.
   */
  private cancelHideResultsTimeout(): void {
    if (this.hideResultsTimeout) {
      clearTimeout(this.hideResultsTimeout);
      this.hideResultsTimeout = null;
    }
  }

  /**
   * Construit le libellé de l'avatar selon les informations disponibles.
   */
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

  /**
   * Détermine si l'historique du navigateur peut être utilisé.
   */
  private hasBrowserHistory(): boolean {
    return typeof window !== 'undefined' && window.history.length > 1;
  }

  /**
   * Calcule la destination par défaut du bouton retour mobile.
   */
  private resolveMobileBackFallback(): string {
    if (this.isMapPage || this.isMyDiariesPage) {
      return '/travels';
    }

    if (this.isFilterPage) {
      return '/';
    }

    return '/';
  }
}
