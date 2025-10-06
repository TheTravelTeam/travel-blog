import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { DiaryPageComponent } from './pages/world-map-page/diary-page.component';
import { MyTravelsPageComponent } from './pages/my-travels-page/my-travels-page.component';
import { TravelMapLayoutPageComponent } from './pages/travel-map-layout-page/travel-map-layout-page.component';
import { FilterPageComponent } from './pages/filter-page/filter-page.component';
import { TestPageComponent } from 'pages/test-page/test-page.component';
import { LoginFormComponent } from './components/Organisms/login-form/login-form.component';
import { RegisterFormComponent } from './components/Organisms/register-form/register-form.component';
import { MePageComponent } from './pages/me-page/me-page.component';
import { ForgotPasswordFormComponent } from './components/Organisms/forgot-password-form/forgot-password-form.component';
import { ResetPasswordPageComponent } from './pages/reset-password-page/reset-password-page.component';

import { ArticlesPageComponent } from './pages/articles-page/articles-page.component';
import { ArticleDetailPageComponent } from './pages/article-detail-page/article-detail-page.component';
export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    pathMatch: 'full',
  },
  { path: 'login', component: LoginFormComponent },
  { path: 'register', component: RegisterFormComponent },
  { path: 'forgot-password', component: ForgotPasswordFormComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'articles', component: ArticlesPageComponent },
  { path: 'articles/:articleId', component: ArticleDetailPageComponent },
  { path: 'me', component: MePageComponent },
  {
    path: 'travels',
    component: TravelMapLayoutPageComponent,
    children: [
      { path: '', component: FilterPageComponent },
      {
        path: ':id',
        component: DiaryPageComponent,
      },
      { path: 'users/:id', component: MyTravelsPageComponent },
    ],
  },
  { path: 'test', component: TestPageComponent },
];
