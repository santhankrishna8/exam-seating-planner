import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { CollegeService } from '../services/college.service';

/**
 * Admin routes require a signed-in account that owns a college document.
 * Invigilators share the same Firebase project, so without the second check
 * they would land on an empty examination office instead of their duty list.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const colleges = inject(CollegeService);

  const signedIn = await firstValueFrom(user(auth).pipe(take(1)));
  if (!signedIn) return router.createUrlTree(['/admin/login']);

  // A failed read (offline, rules) must not lock the office out of its own console.
  const isOffice = await colleges.isOffice().catch(() => true);
  return isOffice ? true : router.createUrlTree(['/teacher']);
};
