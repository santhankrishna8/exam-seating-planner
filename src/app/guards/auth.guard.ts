import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

/** Admin routes need a signed-in account. */
export const authGuard: CanActivateFn = async () => {
  // inject() only works before the first await.
  const auth = inject(Auth);
  const router = inject(Router);
  const signedIn = await firstValueFrom(user(auth).pipe(take(1)));
  return signedIn ? true : router.createUrlTree(['/admin/login']);
};
