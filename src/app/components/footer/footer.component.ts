import { BreakpointService } from '@service/breakpoint.service';
import { Component, computed, inject } from '@angular/core';
import { LogoComponent } from '../Atoms/logo/logo.component';
import { CommonModule } from '@angular/common';
import { LinkComponent } from 'components/Atoms/Link/link/link.component';

@Component({
  selector: 'app-footer',
  imports: [LogoComponent, LinkComponent, CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private breakpointService = inject(BreakpointService);

  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  colorSignal = computed(() => (this.breakpointService.isMobileOrTablet() ? 'white' : 'primary'));
}
