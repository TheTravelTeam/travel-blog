import { Component, Input } from '@angular/core';
import { LogoComponent } from '../Atoms/logo/logo.component';
import { LinkComponent } from '../link/link/link.component';

@Component({
  selector: 'app-footer',
  imports: [LogoComponent, LinkComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  @Input() isMobile = false;
}
