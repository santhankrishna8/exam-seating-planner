import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { teacherGuard } from './guards/teacher.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/public/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'search',
    loadComponent: () => import('./components/public/search-results/search-results.component').then(m => m.SearchResultsComponent)
  },
  {
    path: 'exam/:examId',
    loadComponent: () => import('./components/public/exam-public-view/exam-public-view.component').then(m => m.ExamPublicViewComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./components/admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'teacher/login',
    loadComponent: () => import('./components/teacher/teacher-login/teacher-login.component').then(m => m.TeacherLoginComponent)
  },
  {
    path: 'teacher',
    canActivate: [teacherGuard],
    loadComponent: () => import('./components/teacher/teacher-portal/teacher-portal.component').then(m => m.TeacherPortalComponent)
  },
  {
    path: 'admin/register',
    loadComponent: () => import('./components/admin/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'admin/dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'admin/rooms',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/room-management/room-management.component').then(m => m.RoomManagementComponent)
  },
  {
    path: 'admin/teachers',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/teacher-management/teacher-management.component').then(m => m.TeacherManagementComponent)
  },
  {
    path: 'admin/exams',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/exam-list/exam-list.component').then(m => m.ExamListComponent)
  },
  {
    path: 'admin/exams/new',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/exam-create/exam-create.component').then(m => m.ExamCreateComponent)
  },
  {
    path: 'admin/exams/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/exam-detail/exam-detail.component').then(m => m.ExamDetailComponent)
  },
  {
    path: 'admin/exams/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/exam-create/exam-create.component').then(m => m.ExamCreateComponent)
  },
  {
    path: 'admin/exams/:id/seating',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/seating-arrangement/seating-arrangement.component').then(m => m.SeatingArrangementComponent)
  },
  {
    path: 'admin',
    redirectTo: 'admin/dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
