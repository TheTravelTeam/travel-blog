import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { WorldMapPageComponent } from './pages/world-map-page/world-map-page.component';
import { MyTravelsPageComponent } from './pages/my-travels-page/my-travels-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    pathMatch: 'full',
  },
  {
    path: 'travels',
    component: WorldMapPageComponent,
  },
  {
    path: 'travels/:id',
    component: WorldMapPageComponent,
  },
  {
    path: 'travels/me',
    component: MyTravelsPageComponent,
  },
];
