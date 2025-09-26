import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { CheckboxComponent } from 'components/Atoms/Checkbox/checkbox.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { CommonModule } from '@angular/common';
import { BreakpointService } from '@service/breakpoint.service';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, distinctUntilChanged, switchMap, tap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { SearchService } from '@service/search.service';
import { SearchResultItem } from '@model/search-result.model';

@Component({
  selector: 'app-filter-page',
  imports: [AccordionComponent, CheckboxComponent, IconComponent, DividerComponent, CommonModule],
  templateUrl: './filter-page.component.html',
  styleUrl: './filter-page.component.scss',
})
export class FilterPageComponent {
  readonly state = inject(TravelMapStateService);
  public router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly searchService = inject(SearchService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;

  readonly activeSearchQuery = signal('');
  readonly searchResults = signal<SearchResultItem[]>([]);
  readonly isSearchLoading = signal(false);
  readonly searchError = signal<string | null>(null);

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

  // Reset du scroll avec des signals & un sélector via Angular ci dessus
  constructor() {
    effect(() => {
      if (this.router.url === '/travels' && this.state.panelHeight() !== 'expanded') {
        this.state.panelHeight.set('collapsed');
      }
    });

    this.route.queryParamMap
      .pipe(
        takeUntilDestroyed(),
        map((params) => (params.get('q') ?? '').trim()),
        distinctUntilChanged(),
        switchMap((query) => {
          this.activeSearchQuery.set(query);

          if (!query) {
            this.searchResults.set([]);
            this.searchError.set(null);
            this.isSearchLoading.set(false);
            return of(null);
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
      )
      .subscribe();
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

  clearSearchQuery(): void {
    void this.router.navigate(['/travels']);
  }
}
