import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

/** Admin routes need a signed-in account. */
export const authGuard: CanActivateFn = async () => {
  const signedIn = await firstValueFrom(user(inject(Auth)).pipe(take(1)));
  return signedIn ? true : inject(Router).createUrlTree(['/admin/login']);
};
