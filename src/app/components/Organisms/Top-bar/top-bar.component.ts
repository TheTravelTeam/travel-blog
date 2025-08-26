import { Component, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconSize, Size } from '@model/variant.model';
import { BreakpointService } from '@service/breakpoint.service';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { AvatarComponent } from 'components/Atoms/avatar/avatar.component';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [IconComponent, ButtonComponent, CommonModule, AvatarComponent, RouterLink],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  @Input() isConnected = true;
  userId = 1;

  constructor(
    public bp: BreakpointService,
    public router: Router,
    private route: ActivatedRoute
  ) {}

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
}
