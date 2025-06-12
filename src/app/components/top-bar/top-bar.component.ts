import { Component, computed, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ButtonComponent } from '../Button/button/button.component';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../Atoms/avatar/avatar.component';
import { RouterLink } from '@angular/router';
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
  @Input() isHomeOrArticlePage = true;

  constructor(public bp: BreakpointService) {}

  // 💡 IconSize adapté automatiquement au device
  public iconSize = computed<IconSize>(() => {
    if (this.bp.isMobile() || this.bp.isTablet()) return 'lg';
    return 'xl';
  });

  public btnSize = computed<Size>(() => {
    if (this.bp.isMobile()) return 'sm';
    if (this.bp.isTablet()) return 'md';
    return 'lg';
  });
}
