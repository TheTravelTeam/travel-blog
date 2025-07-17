import { Component, effect, ElementRef, inject, ViewChild } from '@angular/core';

import { BreakpointService } from '../../services/breakpoint.service';
import { TravelMapStateService } from '../../services/travel-map-state.service';
import { CommonModule } from '@angular/common';
import { DividerComponent } from '../../components/divider/divider.component';
import { AvatarComponent } from '../../components/Atoms/avatar/avatar.component';

@Component({
  selector: 'app-my-travels-page',
  imports: [CommonModule, DividerComponent, AvatarComponent],
  templateUrl: './my-travels-page.component.html',
  styleUrl: './my-travels-page.component.scss',
})
export class MyTravelsPageComponent {
  // private authService = inject(AuthService); // A créer
  connectedUserId = 1;
  readonly state = inject(TravelMapStateService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;

  // Reset du scroll avec des signals & un sélector via Angular ci dessus
  constructor() {
    effect(() => {
      if (this.state.panelHeight() === 'collapsedDiary') {
        // queueMicrotask --> Permet d’attendre que le DOM soit entièrement à jour avant d’agir (scroll, focus, etc.)
        queueMicrotask(() => {
          this.detailPanelRef?.nativeElement.scrollTo({ top: 0 });
        });
      }
    });
  }

  togglePanel() {
    if (!this.state.currentDiary()) {
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
}
