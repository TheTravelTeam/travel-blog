import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { CheckboxComponent } from 'components/Atoms/Checkbox/checkbox.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BreakpointService } from '@service/breakpoint.service';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  map,
  distinctUntilChanged,
  debounceTime,
  tap,
  switchMap,
  catchError,
  finalize,
} from 'rxjs/operators';
import { SearchService } from '@service/search.service';
import { SearchResultItem } from '@model/search-result.model';
import { TravelDiary } from '@model/travel-diary.model';
import { Step } from '@model/step.model';
import { SearchBarComponent } from 'components/Molecules/search-bar/search-bar.component';
import { Observable, of } from 'rxjs';

const DURATION_BUCKETS = [
  { id: '0-3' as const, label: '0-3 jours', min: 0, max: 3 },
  { id: '4-7' as const, label: '4-7 jours', min: 4, max: 7 },
  { id: '8-14' as const, label: '8-14 jours', min: 8, max: 14 },
  { id: '15+' as const, label: '15+ jours', min: 15 },
];

type DurationFilterId = (typeof DURATION_BUCKETS)[number]['id'];

const DURATION_LABEL_LOOKUP = new Map<DurationFilterId, string>(
  DURATION_BUCKETS.map((bucket) => [bucket.id, bucket.label])
);

const DAY_IN_MS = 86_400_000;

type FilterType = 'countries' | 'continents' | 'themes' | 'durations';

type FilterSelection = {
  countries: Set<string>;
  continents: Set<string>;
  themes: Set<string>;
  durations: Set<string>;
};

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface DiaryMeta {
  diary: TravelDiary;
  countries: string[];
  continents: string[];
  themes: string[];
  durationId: DurationFilterId | null;
}

@Component({
  selector: 'app-filter-page',
  imports: [
    AccordionComponent,
    CheckboxComponent,
    IconComponent,
    DividerComponent,
    CommonModule,
    ReactiveFormsModule,
    SearchBarComponent,
  ],
  templateUrl: './filter-page.component.html',
  styleUrl: './filter-page.component.scss',
})
export class FilterPageComponent implements OnInit {
  readonly state = inject(TravelMapStateService);
  public router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly searchService = inject(SearchService);
  private readonly destroyRef = inject(DestroyRef);
  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  readonly activeSearchQuery = signal('');
  readonly searchResults = signal<SearchResultItem[]>([]);
  readonly isSearchLoading = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });

  /** Sélection des filtres actifs (pays, continents, thèmes, durées). */
  readonly selectedFilters = signal<FilterSelection>(this.createEmptySelection());

  /** Métadonnées normalisées pour chaque carnet. */
  readonly diaryMetaList = computed(() =>
    (this.state.allDiaries() ?? []).map((diary) => this.buildDiaryMeta(diary))
  );

  /** Accès rapide aux métadonnées d'un carnet donné. */
  readonly diaryMetaMap = computed(() => {
    const map = new Map<number, DiaryMeta>();
    this.diaryMetaList().forEach((meta) => map.set(meta.diary.id, meta));
    return map;
  });

  /** Liste des carnets filtrée selon la sélection en cours. */
  readonly filteredDiaryMeta = computed(() => {
    const metaList = this.diaryMetaList();
    const selection = this.selectedFilters();
    const hasFilters =
      selection.countries.size > 0 ||
      selection.continents.size > 0 ||
      selection.themes.size > 0 ||
      selection.durations.size > 0;

    if (!hasFilters) {
      return metaList;
    }

    return metaList.filter((meta) => this.matchesSelection(meta, selection));
  });

  readonly filteredDiaries = computed(() =>
    this.filteredDiaryMeta()
      .map((meta) => meta.diary)
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))
  );

  /** Options disponibles pour chacun des filtres. */
  readonly countryOptions = computed(() => this.buildFilterOptions('countries'));
  readonly continentOptions = computed(() => this.buildFilterOptions('continents'));
  readonly themeOptions = computed(() => this.buildFilterOptions('themes'));
  readonly durationOptions = computed(() => this.buildFilterOptions('durations'));

  /** Résultats de recherche (carnets) triés par libellé. */
  readonly diaryResults = computed(() =>
    this.sortResultsByLabel(this.searchResults().filter((item) => item.type === 'diary'))
  );

  /** Résultats de recherche (étapes) triés par libellé. */
  readonly stepResults = computed(() =>
    this.sortResultsByLabel(this.searchResults().filter((item) => item.type === 'step'))
  );

  /** Indique si un texte de recherche est saisi. */
  readonly hasActiveSearch = computed(() => this.activeSearchQuery().length > 0);

  /** Indique que la recherche est active mais ne retourne aucun résultat. */
  readonly noSearchResults = computed(
    () =>
      this.hasActiveSearch() &&
      !this.isSearchLoading() &&
      !this.searchError() &&
      this.searchResults().length === 0
  );

  /** Indique qu'au moins un filtre est coché. */
  readonly hasActiveFilters = computed(() => {
    const selection = this.selectedFilters();
    return (
      selection.countries.size > 0 ||
      selection.continents.size > 0 ||
      selection.themes.size > 0 ||
      selection.durations.size > 0
    );
  });

  /**
   * Initialise les effets et synchronise l'état applicatif.
   * - Effets : met à jour les carnets visibles, le panneau et les thèmes disponibles.
   * - Formulaire de recherche, requêtes et thèmes : initialisés via ngOnInit pour conserver un cycle de vie clair.
   */
  constructor() {
    effect(() => {
      const filtered = this.filteredDiaries();
      this.state.setVisibleDiaries(filtered.length ? filtered : null);
    });

    this.destroyRef.onDestroy(() => {
      this.state.setVisibleDiaries(null);
    });

    effect(() => {
      if (this.router.url === '/travels' && this.state.panelHeight() !== 'expanded') {
        this.state.panelHeight.set('collapsed');
      }
    });
  }

  ngOnInit(): void {
    this.initSearchControlSync();
    this.search()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /** Renvoie true si la valeur donnée figure dans les filtres sélectionnés. */
  isFilterSelected(type: FilterType, value: string): boolean {
    return this.selectedFilters()[type].has(value);
  }

  /** Met à jour le filtre correspondant lorsqu'une case est cochée/décochée. */
  onFilterChecked(type: FilterType, value: string, checked: boolean): void {
    this.selectedFilters.update((current) => {
      const next = this.cloneSelection(current);

      const bucket = next[type];
      if (checked) {
        bucket.add(value);
      } else {
        bucket.delete(value);
      }

      return next;
    });
  }

  /** Réinitialise la sélection des filtres. */
  resetFilters(): void {
    this.selectedFilters.set(this.createEmptySelection());
  }

  /** Génère un identifiant HTML stable pour les cases à cocher. */
  buildCheckboxId(type: FilterType, value: string): string {
    const sanitized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${type}-${sanitized || 'option'}`;
  }

  /** Ouvre le carnet sélectionné dans la carte. */
  onFilteredDiaryClick(diaryId: number): void {
    void this.router.navigate(['/travels', diaryId]);
  }

  /** Retourne les métadonnées associées à un carnet. */
  getDiaryMeta(diaryId: number): DiaryMeta | undefined {
    return this.diaryMetaMap().get(diaryId);
  }

  /** Retourne le libellé à afficher pour une tranche de durée. */
  getDurationLabel(durationId: DurationFilterId | null): string | null {
    if (!durationId) {
      return null;
    }

    return DURATION_LABEL_LOOKUP.get(durationId) ?? null;
  }

  /** Crée un objet de sélection vide (utilisé pour l'initialisation et la remise à zéro). */
  private createEmptySelection(): FilterSelection {
    return {
      countries: new Set<string>(),
      continents: new Set<string>(),
      themes: new Set<string>(),
      durations: new Set<string>(),
    };
  }

  /** Construit la liste des options pour un type de filtre donné. */
  private buildFilterOptions(type: FilterType): FilterOption[] {
    const counts = new Map<string, number>();

    for (const meta of this.diaryMetaList()) {
      let values: string[] = [];

      switch (type) {
        case 'countries':
          values = meta.countries;
          break;
        case 'continents':
          values = meta.continents;
          break;
        case 'themes':
          values = meta.themes;
          break;
        case 'durations':
          values = meta.durationId ? [meta.durationId] : [];
          break;
      }

      for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        count,
        label:
          type === 'durations'
            ? (DURATION_LABEL_LOOKUP.get(value as DurationFilterId) ?? value)
            : value,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }

  /** Crée une copie profonde de la sélection (chaque filtre est un Set distinct). */
  private cloneSelection(selection: FilterSelection): FilterSelection {
    return {
      countries: new Set(selection.countries),
      continents: new Set(selection.continents),
      themes: new Set(selection.themes),
      durations: new Set(selection.durations),
    };
  }

  /** Trie une liste de résultats de recherche par libellé. */
  private sortResultsByLabel(items: SearchResultItem[]): SearchResultItem[] {
    return items
      .slice()
      .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '', 'fr', { sensitivity: 'base' }));
  }

  /** Prépare les métadonnées (pays, continents, thèmes, durée) d'un carnet. */
  private buildDiaryMeta(diary: TravelDiary): DiaryMeta {
    const countries = new Set<string>();
    const continents = new Set<string>();
    const themes = new Set<string>();

    const steps = diary.steps ?? [];

    for (const step of steps) {
      const country = (step?.country ?? '').trim();
      if (country) {
        countries.add(country);
      }

      const continent = (step?.continent ?? '').trim();
      if (continent) {
        continents.add(continent);
      }

      for (const theme of step?.themes ?? []) {
        const name = (theme?.name ?? '').trim();
        if (name) {
          themes.add(name);
        }
      }
    }

    const durationDays = this.computeDiaryDurationInDays(steps);
    const durationId = durationDays != null ? this.resolveDurationBucket(durationDays) : null;

    return {
      diary,
      countries: Array.from(countries),
      continents: Array.from(continents),
      themes: Array.from(themes),
      durationId,
    };
  }

  /** Vérifie si un carnet correspond à la sélection courante. */
  private matchesSelection(meta: DiaryMeta, selection: FilterSelection): boolean {
    if (
      selection.countries.size > 0 &&
      !meta.countries.some((country) => selection.countries.has(country))
    ) {
      return false;
    }

    if (
      selection.continents.size > 0 &&
      !meta.continents.some((continent) => selection.continents.has(continent))
    ) {
      return false;
    }

    if (selection.themes.size > 0 && !meta.themes.some((theme) => selection.themes.has(theme))) {
      return false;
    }

    if (selection.durations.size > 0) {
      if (!meta.durationId || !selection.durations.has(meta.durationId)) {
        return false;
      }
    }

    return true;
  }

  /** Retourne la durée globale d'un carnet (en jours) à partir des dates d'étapes. */
  private computeDiaryDurationInDays(steps: Step[]): number | null {
    let minTime: number | null = null;
    let maxTime: number | null = null;

    for (const step of steps) {
      const startDate = step?.startDate ? new Date(step.startDate) : null;
      if (startDate) {
        const time = startDate.getTime();
        minTime = minTime === null || time < minTime ? time : minTime;
        maxTime = maxTime === null || time > maxTime ? time : maxTime;
      }

      const endDate = step?.endDate ? new Date(step.endDate) : null;
      if (endDate) {
        const time = endDate.getTime();
        minTime = minTime === null || time < minTime ? time : minTime;
        maxTime = maxTime === null || time > maxTime ? time : maxTime;
      }
    }

    if (minTime === null || maxTime === null) {
      return null;
    }

    const diff = Math.max(0, maxTime - minTime);
    return Math.max(1, Math.ceil(diff / DAY_IN_MS));
  }

  /** Transforme une durée (en jours) en tranche lisible pour l'interface. */
  private resolveDurationBucket(days: number): DurationFilterId | null {
    for (const bucket of DURATION_BUCKETS) {
      const meetsMin = days >= bucket.min;
      const meetsMax = bucket.max == null || days <= bucket.max;
      if (meetsMin && meetsMax) {
        return bucket.id;
      }
    }

    return DURATION_BUCKETS[DURATION_BUCKETS.length - 1]?.id ?? null;
  }

  /** Gère l'ouverture/fermeture du panneau latéral selon le contexte. */
  togglePanel(): void {
    const hasDiary = Boolean(this.state.currentDiary());
    const isTravelsRoot = this.router.url === '/travels';

    if (!hasDiary || isTravelsRoot) {
      const next = this.state.panelHeight() === 'collapsed' ? 'expanded' : 'collapsed';
      this.state.panelHeight.set(next);
      return;
    }

    const transitions: Record<
      'collapsed' | 'expanded' | 'collapsedDiary',
      'collapsed' | 'expanded' | 'collapsedDiary'
    > = {
      collapsed: 'expanded',
      expanded: 'collapsedDiary',
      collapsedDiary: 'expanded',
    };

    const current = this.state.panelHeight();
    this.state.panelHeight.set(transitions[current as keyof typeof transitions] ?? 'collapsed');
  }

  /** Navigation depuis un résultat de recherche vers un carnet ou une étape. */
  onSearchResultClick(result: SearchResultItem): void {
    if (result.type === 'step' && result.diaryId != null) {
      void this.router.navigate(['/travels', result.diaryId], {
        queryParams: { step: result.id },
      });
      return;
    }

    void this.router.navigate(['/travels', result.diaryId ?? result.id]);
  }

  /** Déclenche la recherche quand l'utilisateur soumet le formulaire. */
  onSearchSubmit(rawQuery: string): void {
    const query = rawQuery.trim();

    if (!query) {
      this.clearSearchQuery();
      return;
    }

    this.searchControl.setValue(query, { emitEvent: false });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query },
      queryParamsHandling: 'merge',
    });
  }

  /** Handler pour le bouton "Effacer" de la recherche. */
  onClearSearchClick(): void {
    this.clearSearchQuery();
  }

  /** Réinitialise l'état de la recherche et nettoie les query params. */
  clearSearchQuery(): void {
    this.activeSearchQuery.set('');
    this.searchResults.set([]);
    this.searchError.set(null);
    this.isSearchLoading.set(false);
    this.searchControl.setValue('', { emitEvent: false });
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Synchronise les query params avec l'état et déclenche les recherches côté page filtre.
   */
  private search(): Observable<SearchResultItem[]> {
    return this.route.queryParamMap.pipe(
      map((params) => (params.get('q') ?? '').trim()),
      distinctUntilChanged(),
      tap((query) => {
        this.activeSearchQuery.set(query);
        this.searchControl.setValue(query, { emitEvent: false });
      }),
      switchMap((query) => {
        if (!query.length) {
          this.searchResults.set([]);
          this.searchError.set(null);
          this.isSearchLoading.set(false);
          return of([] as SearchResultItem[]);
        }

        this.isSearchLoading.set(true);
        return this.searchService.search(query).pipe(
          tap((results) => {
            this.searchResults.set(results);
            this.searchError.set(null);
          }),
          catchError(() => {
            this.searchResults.set([]);
            this.searchError.set('Impossible de lancer la recherche pour le moment.');
            return of([] as SearchResultItem[]);
          }),
          finalize(() => this.isSearchLoading.set(false))
        );
      })
    );
  }

  /** Synchronise la valeur du champ de recherche avec les query params. */
  private initSearchControlSync(): void {
    this.searchControl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((raw) => raw.trim()),
        debounceTime(200),
        distinctUntilChanged()
      )
      .subscribe((query) => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            q: query.length ? query : null,
          },
          queryParamsHandling: 'merge',
        });
      });
  }
}
