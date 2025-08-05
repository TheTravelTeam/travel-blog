import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ButtonService {
  clickEvent() {
    alert('vous avez cliqué 🎉');
  }
}
