import { Component, effect, ElementRef, inject, ViewChild } from '@angular/core';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { CheckboxComponent } from 'components/Atoms/Checkbox/checkbox.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { CommonModule } from '@angular/common';
import { BreakpointService } from '@service/breakpoint.service';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-filter-page',
  imports: [AccordionComponent, CheckboxComponent, IconComponent, DividerComponent, CommonModule],
  templateUrl: './filter-page.component.html',
  styleUrl: './filter-page.component.scss',
})
export class FilterPageComponent {
  readonly state = inject(TravelMapStateService);
  public router = inject(Router);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;

  // Reset du scroll avec des signals & un sélector via Angular ci dessus
  constructor() {
    effect(() => {
      if (this.router.url === '/travels' && this.state.panelHeight() !== 'expanded') {
        this.state.panelHeight.set('collapsed');
      }
    });
  }

  togglePanel() {
    if (!this.state.currentDiary() || this.router.url === '/travels') {
      console.log('dans le if du toogle');
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
