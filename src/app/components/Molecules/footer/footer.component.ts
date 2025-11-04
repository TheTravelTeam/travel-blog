import { BreakpointService } from '@service/breakpoint.service';
import { Component, inject } from '@angular/core';
import { LogoComponent } from 'components/Atoms/logo/logo.component';
import { LinkComponent } from 'components/Atoms/Link/link/link.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  imports: [LogoComponent, LinkComponent, CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private breakpointService = inject(BreakpointService);

  get isMobile(): boolean {
    return this.breakpointService.isMobile();
  }

  get linkColor(): 'white' | 'primary' {
    return this.breakpointService.isMobile() ? 'white' : 'primary';
  }
}
