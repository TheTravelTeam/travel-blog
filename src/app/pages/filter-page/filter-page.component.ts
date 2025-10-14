import { Component, DestroyRef, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
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
import { ThemeService } from '@service/theme.service';
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
export class FilterPageComponent {
  readonly state = inject(TravelMapStateService);
  public router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly searchService = inject(SearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly themeService = inject(ThemeService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;

  readonly activeSearchQuery = signal('');
  readonly searchResults = signal<SearchResultItem[]>([]);
  readonly isSearchLoading = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly hasActiveSearch = computed(() => this.activeSearchQuery().length > 0);
  readonly noSearchResults = computed(
    () =>
      this.hasActiveSearch() &&
      !this.isSearchLoading() &&
      !this.searchError() &&
      this.searchResults().length === 0
  );

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

  readonly selectedFilters = signal<FilterSelection>(this.createEmptySelection());

  private readonly themeLookup = signal<Map<number, string>>(new Map());

  readonly hasActiveFilters = computed(() => {
    const selection = this.selectedFilters();
    return (
      selection.countries.size > 0 ||
      selection.continents.size > 0 ||
      selection.themes.size > 0 ||
      selection.durations.size > 0
    );
  });

  readonly diaryMetaList = computed(() => {
    const diaries = this.state.allDiaries();
    if (!Array.isArray(diaries)) {
      return [] as DiaryMeta[];
    }

    return diaries.map((diary) => this.buildDiaryMeta(diary));
  });

  readonly diaryMetaMap = computed(() => {
    const map = new Map<number, DiaryMeta>();
    for (const meta of this.diaryMetaList()) {
      map.set(meta.diary.id, meta);
    }
    return map;
  });

  readonly countryOptions = computed(() =>
    this.buildFilterOptions(this.diaryMetaList(), 'countries')
  );
  readonly continentOptions = computed(() =>
    this.buildFilterOptions(this.diaryMetaList(), 'continents')
  );
  readonly themeOptions = computed(() => this.buildFilterOptions(this.diaryMetaList(), 'themes'));
  readonly durationOptions = computed(() =>
    this.buildFilterOptions(this.diaryMetaList(), 'durations')
  );

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

  /**
   * Initialise les écouteurs de formulaire, synchronise l'état et déclenche les recherches.
   * - Navigation : reflète les modifications du champ de recherche dans les query params.
   * - Effets : met à jour les carnets visibles, le panneau et les thèmes disponibles.
   * - Recherche : écoute les query params et interroge l'API.
   */
  constructor() {
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

    this.themeService
      .getThemes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (themes) => {
          // Récupère les thèmes disponibles pour alimenter les filtres.
          const lookup = new Map<number, string>();
          themes.forEach((theme) => {
            lookup.set(theme.id, theme.name);
          });
          this.themeLookup.set(lookup);
        },
        error: () => {
          // Défaut : en cas d'erreur API on réinitialise la table pour éviter les valeurs obsolètes.
          this.themeLookup.set(new Map());
        },
      });

    this.search()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  isFilterSelected(type: FilterType, value: string): boolean {
    return this.selectedFilters()[type].has(value);
  }

  onFilterChecked(type: FilterType, value: string, checked: boolean): void {
    this.selectedFilters.update((current) => {
      const next: FilterSelection = {
        countries: new Set(current.countries),
        continents: new Set(current.continents),
        themes: new Set(current.themes),
        durations: new Set(current.durations),
      };

      const bucket = next[type];
      if (checked) {
        bucket.add(value);
      } else {
        bucket.delete(value);
      }

      return next;
    });
  }

  resetFilters(): void {
    this.selectedFilters.set(this.createEmptySelection());
  }

  formatFilterLabel(option: FilterOption): string {
    return option.count > 0 ? `${option.label} (${option.count})` : option.label;
  }

  buildCheckboxId(type: FilterType, value: string): string {
    const sanitized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${type}-${sanitized || 'option'}`;
  }

  onFilteredDiaryClick(diaryId: number): void {
    void this.router.navigate(['/travels', diaryId]);
  }

  getDiaryMeta(diaryId: number): DiaryMeta | undefined {
    return this.diaryMetaMap().get(diaryId);
  }

  getDurationLabel(durationId: DurationFilterId | null): string | null {
    if (!durationId) {
      return null;
    }

    return DURATION_LABEL_LOOKUP.get(durationId) ?? null;
  }

  private createEmptySelection(): FilterSelection {
    return {
      countries: new Set<string>(),
      continents: new Set<string>(),
      themes: new Set<string>(),
      durations: new Set<string>(),
    };
  }

  private buildFilterOptions(metaList: DiaryMeta[], type: FilterType): FilterOption[] {
    const counts = new Map<string, number>();

    for (const meta of metaList) {
      const values = this.extractValues(meta, type);
      if (!values.length) {
        continue;
      }

      const uniqueValues = new Set(values);
      for (const value of uniqueValues) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }

    const options: FilterOption[] = Array.from(counts.entries()).map(([value, count]) => ({
      value,
      count,
      label:
        type === 'durations'
          ? (DURATION_LABEL_LOOKUP.get(value as DurationFilterId) ?? value)
          : value,
    }));

    return options.sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }

  private extractValues(meta: DiaryMeta, type: FilterType): string[] {
    switch (type) {
      case 'countries':
        return meta.countries;
      case 'continents':
        return meta.continents;
      case 'themes':
        return meta.themes;
      case 'durations':
        return meta.durationId ? [meta.durationId] : [];
      default:
        return [];
    }
  }

  private buildDiaryMeta(diary: TravelDiary): DiaryMeta {
    const countries = new Set<string>();
    const continents = new Set<string>();
    const themes = new Set<string>();

    const steps = Array.isArray(diary.steps) ? diary.steps : [];

    for (const step of steps) {
      const country = this.normaliseValue(step?.country);
      if (country) {
        countries.add(country);
      }

      const continent = this.normaliseValue(step?.continent);
      if (continent) {
        continents.add(continent);
      }

      if (Array.isArray(step?.themeIds)) {
        for (const themeId of step.themeIds) {
          const resolved = this.resolveThemeFromId(themeId);
          if (resolved) {
            themes.add(resolved);
          }
        }
      }

      if (Array.isArray(step?.themes)) {
        for (const theme of step.themes) {
          const themeName = this.extractThemeName(theme);
          if (themeName) {
            themes.add(themeName);
          }

          const resolvedFromTheme = this.resolveThemeFromId(this.extractThemeId(theme));
          if (resolvedFromTheme) {
            themes.add(resolvedFromTheme);
          }
        }
      }

      if (Array.isArray(step?.stepThemes)) {
        for (const themeRef of step.stepThemes) {
          const themeName = this.extractThemeName(themeRef);
          if (themeName) {
            themes.add(themeName);
          }

          const themeIdFromRef = this.extractThemeId(themeRef);
          const resolvedFromRef = this.resolveThemeFromId(themeIdFromRef);
          if (resolvedFromRef) {
            themes.add(resolvedFromRef);
          }
        }
      }

      const legacyThemes = (step as { themes?: unknown }).themes;
      if (Array.isArray(legacyThemes)) {
        for (const legacy of legacyThemes) {
          const legacyName = this.extractThemeName(legacy);
          if (legacyName) {
            themes.add(legacyName);
          }
        }
      }

      const resolvedFromStep = this.resolveThemeFromId(step?.themeId ?? null);
      if (resolvedFromStep) {
        themes.add(resolvedFromStep);
      }
    }

    const diaryThemes = (diary as { themes?: unknown }).themes;
    if (Array.isArray(diaryThemes)) {
      for (const diaryTheme of diaryThemes) {
        const diaryThemeName = this.extractThemeName(diaryTheme);
        if (diaryThemeName) {
          themes.add(diaryThemeName);
        }

        const diaryThemeId = this.extractThemeId(diaryTheme);
        const resolvedFromDiaryTheme = this.resolveThemeFromId(diaryThemeId);
        if (resolvedFromDiaryTheme) {
          themes.add(resolvedFromDiaryTheme);
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

  private normaliseValue(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    const text = String(value).trim();
    return text ? text : null;
  }

  private extractThemeName(themeRef: unknown): string | null {
    if (typeof themeRef === 'string') {
      return this.normaliseValue(themeRef);
    }

    if (!themeRef || typeof themeRef !== 'object') {
      return null;
    }

    // support shapes: { theme: { name } }, { name }, { themeName }
    const possible =
      (themeRef as { theme?: { name?: unknown } }).theme?.name ??
      (themeRef as { name?: unknown }).name ??
      (themeRef as { themeName?: unknown }).themeName ??
      null;

    return this.normaliseValue(possible);
  }

  private extractThemeId(themeRef: unknown): number | null {
    if (typeof themeRef === 'number' || typeof themeRef === 'string') {
      return this.coerceThemeId(themeRef);
    }

    if (!themeRef || typeof themeRef !== 'object') {
      return null;
    }

    const candidate =
      (themeRef as { themeId?: unknown }).themeId ??
      (themeRef as { theme?: { id?: unknown } }).theme?.id ??
      (themeRef as { id?: unknown }).id ??
      null;

    return this.coerceThemeId(candidate);
  }

  private resolveThemeFromId(id: unknown): string | null {
    const coerced = this.coerceThemeId(id);
    if (coerced === null) {
      return null;
    }

    const name = this.themeLookup().get(coerced);
    return this.normaliseValue(name ?? null);
  }

  private coerceThemeId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private computeDiaryDurationInDays(steps: Step[]): number | null {
    let minTime: number | null = null;
    let maxTime: number | null = null;

    for (const step of steps) {
      const start = this.coerceDate(step?.startDate);
      const end = this.coerceDate(step?.endDate);

      if (start) {
        const time = start.getTime();
        minTime = minTime === null || time < minTime ? time : minTime;
        maxTime = maxTime === null || time > maxTime ? time : maxTime;
      }

      if (end) {
        const time = end.getTime();
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

  private coerceDate(value: string | Date | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Synchronise les query params avec l'état et déclenche les recherches côté page filtre.
   */
  private search(): Observable<SearchResultItem[]> {
    return this.route.queryParamMap.pipe(
      map((params) => (params.get('q') ?? '').trim()), // Trim : nettoie la valeur issue de l'URL avant traitement.
      distinctUntilChanged(),
      tap((query) => {
        // Synchronisation : reflète immédiatement la requête dans le formulaire sans réémettre.
        this.activeSearchQuery.set(query);
        this.searchControl.setValue(query, { emitEvent: false });
      }),
      switchMap((query) => {
        // Filtre : interprète une requête vide comme un reset et évite d'interroger l'API.
        if (!query.length) {
          this.searchResults.set([]);
          this.searchError.set(null);
          this.isSearchLoading.set(false);
          return of([] as SearchResultItem[]);
        }

        // SwitchMap : relance la recherche quand les query params changent et annule la précédente.
        this.isSearchLoading.set(true);
        return this.searchService.search(query).pipe(
          tap((results) => {
            this.searchResults.set(results);
            this.searchError.set(null);
          }), // Tap : stocke les résultats réussis et efface les erreurs avant diffusion.
          catchError(() => {
            this.searchResults.set([]);
            this.searchError.set('Impossible de lancer la recherche pour le moment.');
            return of([] as SearchResultItem[]); // Gestion erreur : retourne un tableau vide pour respecter la signature.
          }), // CatchError : capture l'échec, réinitialise l'état et reconduit un tableau vide.
          finalize(() => this.isSearchLoading.set(false)) // Finalize : stoppe l'indicateur de chargement quelle que soit l'issue.
        );
      })
    );
  }

  togglePanel() {
    if (!this.state.currentDiary() || this.router.url === '/travels') {
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

  onSearchResultClick(result: SearchResultItem): void {
    if (result.type === 'step' && result.diaryId != null) {
      void this.router.navigate(['/travels', result.diaryId], {
        queryParams: { step: result.id },
      });
      return;
    }

    void this.router.navigate(['/travels', result.diaryId ?? result.id]);
  }

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

  onClearSearchClick(): void {
    this.clearSearchQuery();
  }

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
}
