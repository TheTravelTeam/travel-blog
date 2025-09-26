import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconSize, Size } from '@model/variant.model';
import { BreakpointService } from '@service/breakpoint.service';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { AvatarComponent } from 'components/Atoms/avatar/avatar.component';
import { AuthService } from '@service/auth.service';
import { UserProfileDto } from '@dto/user-profile.dto';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [IconComponent, ButtonComponent, CommonModule, AvatarComponent, RouterLink],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  readonly bp = inject(BreakpointService);
  private readonly router = inject(Router);

  // 💡 IconSize adapté automatiquement au device
  public iconSize = computed<IconSize>(() => {
    if (this.bp.isMobile()) return 'lg';
    if (this.bp.isTablet()) return 'md';
    return 'lg';
  });

  public btnSize = computed<Size>(() => {
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

  /** Indique si le lien "Carnet de voyage" doit être rendu. */
  get canDisplayDiariesLink(): boolean {
    return this.isAuthenticated() && this.currentUserId() !== null;
  }

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      // Charge l'utilisateur courant lors d'un rafraîchissement avec session déjà active
      this.authService.loadCurrentUser().subscribe({ error: () => undefined });
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
