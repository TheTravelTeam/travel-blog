import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/auth/';
  private http = inject(HttpClient);

  login(email: string, password: string) {
    return this.http
      .post(`${this.apiUrl}/login`, { email, password }, { responseType: 'text' })
      .pipe(
        tap((token: string) => {
          this.saveToken(token);
          console.log(token);
        })
      );
  }

  saveToken(token: string) {
    localStorage.setItem('authToken', token);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  clearToken() {
    localStorage.removeItem('authToken');
  }

  verifyToken() {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token found');
    }

    try {
      const decodeToken = jwtDecode(token);
      const expirationDate = new Date((decodeToken.exp ?? 0) * 1000);
      if (expirationDate < new Date()) {
        this.clearToken();
        return false;
      }
      return true;
    } catch {
      this.clearToken();
      return false;
    }
  }
}
