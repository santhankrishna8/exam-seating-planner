import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';

describe('LandingComponent lookup', () => {
  let landing: LandingComponent;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LandingComponent], providers: [provideRouter([])] }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    landing = TestBed.createComponent(LandingComponent).componentInstance;
  });

  it('asks for a number instead of searching on an empty field', () => {
    landing.hallTicket = '   ';
    landing.search();
    expect(landing.error()).toMatch(/enter your hall ticket/i);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('rejects a number too short to be real', () => {
    landing.hallTicket = '21a';
    landing.search();
    expect(landing.error()).toMatch(/too short/i);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('searches with the normalised ticket and clears the error', () => {
    landing.error.set('old error');
    landing.hallTicket = ' 21wh1a 0501 ';
    landing.search();
    expect(landing.error()).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/search'], { queryParams: { q: '21WH1A0501' } });
  });
});
