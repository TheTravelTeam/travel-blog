import { Component, computed, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ButtonComponent } from '../Button/button/button.component';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../Atoms/avatar/avatar.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconSize, Size } from '../../model/variant';
import { BreakpointService } from '../../services/breakpoint.service';

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
