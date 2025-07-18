import { TravelDiary } from './../../model/travelDiary';
import { Component, effect, ElementRef, inject, ViewChild, OnInit } from '@angular/core';

import { BreakpointService } from '../../services/breakpoint.service';
import { TravelMapStateService } from '../../services/travel-map-state.service';
import { CommonModule } from '@angular/common';
import { DividerComponent } from '../../components/divider/divider.component';
import { StepService } from '../../services/step.service';
import { TravelDiaryCardComponent } from '../../components/card-ready-to-use/travel-diary-card/travel-diary-card.component';

@Component({
  selector: 'app-my-travels-page',
  imports: [CommonModule, DividerComponent, TravelDiaryCardComponent],
  templateUrl: './my-travels-page.component.html',
  styleUrl: './my-travels-page.component.scss',
})
export class MyTravelsPageComponent implements OnInit {
  // private authService = inject(AuthService); // A créer
  connectedUserId = 1;
  diariesList: TravelDiary[] = [];
  readonly state = inject(TravelMapStateService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  private stepService = inject(StepService);

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

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    if (this.connectedUserId) {
      this.stepService
        .getDiaryListByUser(this.connectedUserId)
        .subscribe((diaries: TravelDiary[]) => {
          this.diariesList = diaries;
        });
    }
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
