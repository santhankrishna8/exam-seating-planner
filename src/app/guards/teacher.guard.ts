import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { CollegeService } from '../services/college.service';

/**
 * The invigilator portal needs a signed-in account. An examination office
 * account is sent to its own console rather than an always-empty duty list.
 */
export const teacherGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const colleges = inject(CollegeService);

  const signedIn = await firstValueFrom(user(auth).pipe(take(1)));
  if (!signedIn) return router.createUrlTree(['/teacher/login']);

  const isOffice = await colleges.isOffice().catch(() => false);
  return isOffice ? router.createUrlTree(['/admin/dashboard']) : true;
};
