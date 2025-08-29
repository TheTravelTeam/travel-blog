import { Component } from '@angular/core';

import { ModalComponent } from 'components/Organisms/modal/modal.component';

@Component({
  selector: 'app-test-page',
  imports: [ModalComponent],
  templateUrl: './test-page.component.html',
  styleUrl: './test-page.component.scss',
})
export class TestPageComponent {}
