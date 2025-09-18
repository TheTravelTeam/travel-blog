import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root', // rend le service global sans besoin d'importer dans un module
})
export class ToastService {
  success(message: string): void {
    console.info('✅ SUCCESS:', message);
    // remplace par un vrai toast ici (ex: Angular Material / Toastr)
  }

  error(message: string): void {
    console.error('❌ ERROR:', message);
    // idem ici
  }

  info(message: string): void {
    console.info('ℹ️ INFO:', message);
  }
}
