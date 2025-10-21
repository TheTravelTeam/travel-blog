import { computed, Injectable, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';

@Injectable({
  providedIn: 'root',
})
export class BreakpointService {
  private _isMobile = signal(false);
  private _isTablet = signal(false);
  private _isDesktop = signal(false);

  // Signaux publics en lecture seule
  isMobile = this._isMobile.asReadonly();
  isTablet = this._isTablet.asReadonly();
  isDesktop = this._isDesktop.asReadonly();

  // Signaux computed pour des combinaisons
  isMobileOrTablet = computed(() => this.isMobile() || this.isTablet());
  isDesktopOrTablet = computed(() => this.isDesktop() || this.isTablet());
  isLargeScreen = computed(() => !this.isMobile() && !this.isTablet());

  constructor(private breakpointObserver: BreakpointObserver) {
    // Mobile
    this.breakpointObserver
      .observe(['(max-width: 431px)'])
      .subscribe((result) => this._isMobile.set(result.matches));

    // Tablet
    this.breakpointObserver
      .observe(['(min-width: 432px) and (max-width: 1023px)'])
      .subscribe((result) => this._isTablet.set(result.matches));

    // Desktop (custom breakpoint)
    this.breakpointObserver
      .observe(['(min-width: 1024px)'])
      .subscribe((result) => this._isDesktop.set(result.matches));
  }
}
