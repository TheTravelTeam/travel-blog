import { Routes } from '@angular/router';
// import { HomePageComponent } from './pages/home-page/home-page.component';
import { WorldMapPageComponent } from './pages/world-map-page/world-map-page.component';
import { MyTravelsPageComponent } from './pages/my-travels-page/my-travels-page.component';
import { TravelMapLayoutPageComponent } from './pages/travel-map-layout-page/travel-map-layout-page.component';
import { FilterPageComponent } from './pages/filter-page/filter-page.component';
import { TestPageComponent } from 'pages/test-page/test-page.component';
import { LoginFormComponent } from './components/Organisms/login-form/login-form.component';
import { RegisterFormComponent } from './components/Organisms/register-form/register-form.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    pathMatch: 'full',
  },
  { path: 'login', component: LoginFormComponent },
  { path: 'register', component: RegisterFormComponent },
  {
    path: 'travels',
    component: TravelMapLayoutPageComponent,
    children: [
      { path: '', component: FilterPageComponent },
      {
        path: ':id',
        component: WorldMapPageComponent,
      },
      { path: 'users/:id', component: MyTravelsPageComponent },
    ],
  },
  { path: 'test', component: TestPageComponent },
];
