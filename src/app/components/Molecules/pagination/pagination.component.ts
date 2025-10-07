import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

/**
 * Simple reusable pagination widget providing previous/next controls
 * and individual page buttons. Parents drive the current page via the
 * `currentPage` input and react to `pageChange` events.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  private readonly totalItemsSignal = signal(0);
  private readonly itemsPerPageSignal = signal(10);
  private readonly currentPageSignal = signal(1);

  readonly totalPages = computed(() => {
    const perPage = this.itemsPerPageSignal();
    if (perPage <= 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.totalItemsSignal() / perPage));
  });

  readonly pages = computed(() => {
    const length = this.totalPages();
    return Array.from({ length }, (_, index) => index + 1);
  });

  /** Emits whenever the user selects a different page. */
  @Output()
  readonly pageChange = new EventEmitter<number>();

  /** Total number of results to paginate. */
  @Input()
  set totalItems(value: number | null | undefined) {
    const safeValue = Number.isFinite(value as number) ? Math.max(0, Math.floor(value as number)) : 0;
    this.totalItemsSignal.set(safeValue);
    this.ensureCurrentPageWithinBounds();
  }

  /** Number of items displayed per page. Defaults to 10. */
  @Input()
  set itemsPerPage(value: number | null | undefined) {
    const parsed = Number.isFinite(value as number) ? Math.floor(value as number) : 10;
    const safeValue = Math.max(1, parsed);
    this.itemsPerPageSignal.set(safeValue);
    this.ensureCurrentPageWithinBounds();
  }

  /** Current active page (1-indexed). */
  @Input()
  set currentPage(value: number | null | undefined) {
    const parsed = Number.isFinite(value as number) ? Math.floor(value as number) : 1;
    const safeValue = Math.min(Math.max(1, parsed), this.totalPages());
    this.currentPageSignal.set(safeValue);
  }

  get currentPage(): number {
    return this.currentPageSignal();
  }

  canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  canGoNext(): boolean {
    return this.currentPage < this.totalPages();
  }

  goToPrevious(): void {
    if (!this.canGoPrevious()) {
      return;
    }
    this.goToPage(this.currentPage - 1);
  }

  goToNext(): void {
    if (!this.canGoNext()) {
      return;
    }
    this.goToPage(this.currentPage + 1);
  }

  goToPage(page: number): void {
    const safePage = Math.min(Math.max(1, page), this.totalPages());
    if (safePage === this.currentPage) {
      return;
    }
    this.currentPageSignal.set(safePage);
    this.pageChange.emit(safePage);
  }

  private ensureCurrentPageWithinBounds(): void {
    const current = this.currentPage;
    const safeCurrent = Math.min(Math.max(1, current), this.totalPages());
    if (safeCurrent !== current) {
      this.currentPageSignal.set(safeCurrent);
      this.pageChange.emit(safeCurrent);
    }
  }
}
