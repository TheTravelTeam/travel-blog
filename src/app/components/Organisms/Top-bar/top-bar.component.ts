import { Component, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
