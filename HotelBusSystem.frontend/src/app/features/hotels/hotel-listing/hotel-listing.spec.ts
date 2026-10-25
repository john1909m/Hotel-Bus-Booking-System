import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { HotelListing } from './hotel-listing';
import { HotelService } from '../../../core/services/hotel.service';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { PageHotelDTO } from '../../../core/models/Pagination/hotelPage.model';
import { DEFAULT_IMAGE_PLACEHOLDER, SafeImageUrlPipe } from '../../../../utils/safe-image-url';

describe('HotelListing - Cover Images & Listing Integration', () => {
  let component: HotelListing;
  let mockHotelService: any;
  let safeImageUrlPipe: SafeImageUrlPipe;

  const mockHotels: HotelDTO[] = [
    {
      id: 1,
      name: 'Nile Palace Resort',
      city: 'Luxor',
      address: 'Corniche El Nile',
      rating: 4.9,
      latitude: 25.68,
      longitude: 32.63,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'A luxurious resort on the banks of the Nile.',
      coverImageUrl: 'https://pub-9188aaa3f1d74a5ca857aecc65c7c25f.r2.dev/hotels/1/cover.jpg',
    },
    {
      id: 2,
      name: 'Red Sea Vista',
      city: 'Hurghada',
      address: 'Sheraton Rd',
      rating: 4.5,
      latitude: 27.25,
      longitude: 33.81,
      checkInTime: '15:00',
      checkOutTime: '12:00',
      description: 'Stunning beachfront view.',
      coverImageUrl: '', // Empty cover image
    },
    {
      id: 3,
      name: 'Pyramids View Inn',
      city: 'Giza',
      address: 'Sphinx St',
      rating: 4.2,
      latitude: 29.97,
      longitude: 31.13,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      description: 'Overlooking the Great Pyramids.',
      coverImageUrl: null as unknown as string, // Null cover image
    },
  ];

  const mockPageResponse: PageHotelDTO = {
    content: mockHotels,
    empty: false,
    first: true,
    last: true,
    number: 0,
    numberOfElements: 3,
    size: 12,
    totalElements: 3,
    totalPages: 1,
  };

  beforeEach(() => {
    safeImageUrlPipe = new SafeImageUrlPipe();

    mockHotelService = {
      getHotels: vi.fn().mockReturnValue(of(mockPageResponse)),
    };

    const injector = Injector.create({
      providers: [{ provide: HotelService, useValue: mockHotelService }],
    });

    component = runInInjectionContext(injector, () => new HotelListing());
  });

  describe('Cover Images Integration', () => {
    it('should transform a valid coverImageUrl to the exact persisted public URL', () => {
      const validUrl = mockHotels[0].coverImageUrl;
      const transformed = safeImageUrlPipe.transform(validUrl);

      expect(transformed).toBe(
        'https://pub-9188aaa3f1d74a5ca857aecc65c7c25f.r2.dev/hotels/1/cover.jpg'
      );
    });

    it('should fallback to DEFAULT_IMAGE_PLACEHOLDER when coverImageUrl is empty string', () => {
      const emptyUrl = mockHotels[1].coverImageUrl;
      const transformed = safeImageUrlPipe.transform(emptyUrl);

      expect(transformed).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    });

    it('should fallback to DEFAULT_IMAGE_PLACEHOLDER when coverImageUrl is null or undefined', () => {
      const nullUrl = mockHotels[2].coverImageUrl;
      const transformed = safeImageUrlPipe.transform(nullUrl);

      expect(transformed).toBe(DEFAULT_IMAGE_PLACEHOLDER);
      expect(safeImageUrlPipe.transform(undefined)).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    });

    it('should fallback to DEFAULT_IMAGE_PLACEHOLDER when coverImageUrl is from an untrusted origin', () => {
      const untrustedUrl = 'https://malicious-external-site.com/hotel.jpg';
      const transformed = safeImageUrlPipe.transform(untrustedUrl);

      expect(transformed).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    });

    it('should handle image error event by setting src to DEFAULT_IMAGE_PLACEHOLDER', () => {
      const imgEl = { src: 'https://pub-9188aaa3f1d74a5ca857aecc65c7c25f.r2.dev/hotels/1/broken.jpg' } as HTMLImageElement;
      const event = { target: imgEl } as unknown as Event;

      component.onImageError(event);

      expect(imgEl.src).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    });

    it('should not cause infinite loop if placeholder image itself triggers error', () => {
      const imgEl = { src: 'http://localhost:4200/assets/images/hotel-placeholder.svg' } as HTMLImageElement;
      const event = { target: imgEl } as unknown as Event;

      // Call onImageError when src is already the placeholder
      component.onImageError(event);

      // Verify src was not reassigned repeatedly
      expect(imgEl.src).toBe('http://localhost:4200/assets/images/hotel-placeholder.svg');
    });
  });

  describe('Preserving Existing Hotel Listing Behavior', () => {
    it('should load hotels with default pagination params on init', () => {
      component.ngOnInit();

      expect(mockHotelService.getHotels).toHaveBeenCalledWith({
        page: 0,
        size: 12,
      });
      expect(component.pageState()).toBe('success');
      expect(component.hotels().length).toBe(3);
      expect(component.totalElements()).toBe(3);
    });

    it('should handle error state when hotelService fails', () => {
      mockHotelService.getHotels.mockReturnValue(throwError(() => new Error('Network error')));

      component.ngOnInit();

      expect(component.pageState()).toBe('error');
      expect(component.errorMessage()).toContain('Network error');
      expect(component.hotels().length).toBe(0);
    });

    it('should handle empty state when hotelService returns empty page', () => {
      mockHotelService.getHotels.mockReturnValue(
        of({ content: [], empty: true, totalElements: 0, totalPages: 0, size: 12, number: 0 })
      );

      component.ngOnInit();

      expect(component.pageState()).toBe('empty');
      expect(component.hotels().length).toBe(0);
    });

    it('should filter by city and reset to page 0', () => {
      component.onCityChange('Cairo');

      expect(component.cityFilter()).toBe('Cairo');
      expect(component.currentPage()).toBe(0);
      expect(mockHotelService.getHotels).toHaveBeenCalledWith({
        page: 0,
        size: 12,
        city: 'Cairo',
      });
    });

    it('should filter by rating and sort order', () => {
      component.onRatingChange('4');
      component.onSortChange('rating,desc');

      expect(component.minRatingFilter()).toBe(4);
      expect(component.sortFilter()).toBe('rating,desc');
      expect(mockHotelService.getHotels).toHaveBeenCalledWith({
        page: 0,
        size: 12,
        minRating: 4,
        sort: 'rating,desc',
      });
    });

    it('should reset all filters on clearSearch()', () => {
      component.searchQuery.set('Resort');
      component.cityFilter.set('Luxor');
      component.minRatingFilter.set(4);
      component.sortFilter.set('name,asc');
      component.currentPage.set(2);

      component.clearSearch();

      expect(component.searchQuery()).toBe('');
      expect(component.cityFilter()).toBe('');
      expect(component.minRatingFilter()).toBeNull();
      expect(component.sortFilter()).toBe('');
      expect(component.currentPage()).toBe(0);
    });

    it('should navigate through pages using goToPage, previousPage, and nextPage', () => {
      mockHotelService.getHotels.mockReturnValue(
        of({
          ...mockPageResponse,
          totalPages: 5,
          totalElements: 60,
        })
      );
      component.pageData.set({
        ...mockPageResponse,
        totalPages: 5,
        totalElements: 60,
      });

      component.goToPage(2);
      expect(component.currentPage()).toBe(2);

      component.nextPage();
      expect(component.currentPage()).toBe(3);

      component.previousPage();
      expect(component.currentPage()).toBe(2);

      // Out of bounds should be ignored
      component.goToPage(99);
      expect(component.currentPage()).toBe(2);

      component.goToPage(-1);
      expect(component.currentPage()).toBe(2);
    });

    it('should generate star array matching hotel rating', () => {
      expect(component.getStarArray(4.8)).toEqual([1, 1, 1, 1, 1]);
      expect(component.getStarArray(3.2)).toEqual([1, 1, 1, 0, 0]);
      expect(component.getStarArray(0)).toEqual([0, 0, 0, 0, 0]);
    });
  });
});
