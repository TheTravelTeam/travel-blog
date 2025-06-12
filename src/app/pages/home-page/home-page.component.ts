import { Component } from '@angular/core';
import { ButtonComponent } from '../../components/Button/button/button.component';
import { CheckboxComponent } from '../../components/checkbox/checkbox.component';
import { ToggleBtnComponent } from '../../components/toggle-btn/toggle-btn.component';
@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent, CheckboxComponent, ToggleBtnComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
