import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { WorldMapPageComponent } from './pages/world-map-page/world-map-page.component';
import { MyTravelsPageComponent } from './pages/my-travels-page/my-travels-page.component';
import { TravelMapLayoutPageComponent } from './pages/travel-map-layout-page/travel-map-layout-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    pathMatch: 'full',
  },
  {
    path: 'travels',
    component: TravelMapLayoutPageComponent,
    children: [
      { path: '', component: WorldMapPageComponent },
      { path: 'me', component: MyTravelsPageComponent },
    ],
  },
  {
    path: 'travels/:id',
    component: WorldMapPageComponent,
  },
];
