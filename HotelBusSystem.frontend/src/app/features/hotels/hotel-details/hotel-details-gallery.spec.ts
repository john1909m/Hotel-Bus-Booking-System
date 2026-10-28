import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { HotelDetails } from './hotel-details';
import { HotelService } from '../../../core/services/hotel.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelBookingService } from '../../../core/services/hotel-booking.service';
import { HotelImageService } from '../../../core/services/hotel-image.service';
import { AuthService } from '../../../core/services/auth.service';
import { HotelImageDto } from '../../../core/models/Image/hotel_image.model';
import { DEFAULT_IMAGE_PLACEHOLDER } from '../../../../utils/safe-image-url';

describe('HotelDetails - Customer Gallery (Phase C)', () => {
  let component: HotelDetails;
  let mockHotelService: any;
  let mockRoomService: any;
  let mockHotelBookingService: any;
  let mockHotelImageService: any;
  let mockAuthService: any;
  let mockRouter: any;
  let paramMapSubject: BehaviorSubject<any>;

  const mockHotel = {
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
  };

  const mockImages: HotelImageDto[] = [
    {
      id: 201,
      hotelId: 1,
      roomType: null,
      url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/lobby.jpg',
      sortOrder: 0,
    },
    {
      id: 202,
      hotelId: 1,
      roomType: 'DELUXE', // Room-specific image (should be filtered out of general gallery)
      url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/deluxe.jpg',
      sortOrder: 1,
    },
    {
      id: 203,
      hotelId: 1,
      roomType: null,
      url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/pool.jpg',
      sortOrder: 2,
    },
    {
      id: 204,
      hotelId: 1,
      roomType: 'SUITE', // Room-specific image (should be filtered out)
      url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/suite.jpg',
      sortOrder: 3,
    },
  ];

  beforeEach(() => {
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: '1' }));

    mockHotelService = {
      getHotelById: vi.fn().mockReturnValue(of(mockHotel)),
    };
    mockRoomService = {
      getPaginatedRoomsByHotelId: vi.fn().mockReturnValue(of({ content: [], page: { totalElements: 0, totalPages: 1 } })),
      getRoomsByHotelId: vi.fn().mockReturnValue(of([])),
    };
    mockHotelBookingService = {
      getUserBookings: vi.fn().mockReturnValue(of([])),
    };
    mockHotelImageService = {
      getImages: vi.fn().mockReturnValue(of(mockImages)),
    };
    mockAuthService = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      currentUser: vi.fn().mockReturnValue(null),
    };
    mockRouter = {
      url: '/hotels/1',
      navigate: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable(),
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        { provide: Router, useValue: mockRouter },
        { provide: HotelService, useValue: mockHotelService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: HotelBookingService, useValue: mockHotelBookingService },
        { provide: HotelImageService, useValue: mockHotelImageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    component = runInInjectionContext(injector, () => new HotelDetails());
  });

  it('should load only general gallery images (roomType === null) and filter out room images by default', () => {
    component.ngOnInit();

    expect(mockHotelImageService.getImages).toHaveBeenCalledWith(1);
    expect(mockHotelImageService.getImages).toHaveBeenCalledTimes(1);
    expect(component.galleryState()).toBe('success');
    expect(component.totalGalleryImages()).toBe(2);

    const loaded = component.galleryImages();
    expect(loaded.every((img) => !img.roomType)).toBe(true);
    expect(loaded.map((img) => img.id)).toEqual([201, 203]);

    // First image should be active by default
    expect(component.activeImageIndex()).toBe(0);
    expect(component.activeImage()?.id).toBe(201);
  });

  it('should dynamically extract distinct room types in uppercase', () => {
    component.ngOnInit();

    const distinct = component.distinctImageRoomTypes();
    expect(distinct).toEqual(['DELUXE', 'SUITE']);
  });

  it('should switch gallery filter locally without making additional HTTP requests', () => {
    component.ngOnInit();
    expect(mockHotelImageService.getImages).toHaveBeenCalledTimes(1);

    // Switch to ALL
    component.setGalleryFilter('ALL');
    expect(component.galleryFilter()).toBe('ALL');
    expect(component.totalGalleryImages()).toBe(4);
    expect(component.galleryImages().map((img) => img.id)).toEqual([201, 202, 203, 204]);

    // Switch to DELUXE
    component.setGalleryFilter('DELUXE');
    expect(component.galleryFilter()).toBe('DELUXE');
    expect(component.totalGalleryImages()).toBe(1);
    expect(component.galleryImages()[0].id).toBe(202);
    expect(component.galleryImages()[0].roomType).toBe('DELUXE');

    // Switch back to GENERAL
    component.setGalleryFilter('GENERAL');
    expect(component.galleryFilter()).toBe('GENERAL');
    expect(component.totalGalleryImages()).toBe(2);
    expect(component.galleryImages().map((img) => img.id)).toEqual([201, 203]);

    // Confirm getImages was never called again
    expect(mockHotelImageService.getImages).toHaveBeenCalledTimes(1);
  });

  it('should set galleryState to "empty" when hotel has no photos at all', () => {
    mockHotelImageService.getImages.mockReturnValue(of([]));

    component.ngOnInit();

    expect(component.galleryState()).toBe('empty');
    expect(component.galleryImages().length).toBe(0);
    expect(component.activeImage()).toBeNull();
  });

  it('should have 0 filtered gallery images when hotel only has room photos and filter is GENERAL', () => {
    mockHotelImageService.getImages.mockReturnValue(of([
      { id: 301, hotelId: 1, roomType: 'SINGLE', url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/single.jpg', sortOrder: 0 }
    ]));

    component.ngOnInit();

    expect(component.galleryState()).toBe('success');
    expect(component.galleryFilter()).toBe('GENERAL');
    expect(component.filteredGalleryImages().length).toBe(0);
    expect(component.activeImage()).toBeNull();
  });

  it('should set galleryState to "error" when HotelImageService fails and support retry', () => {
    mockHotelImageService.getImages.mockReturnValue(throwError(() => new Error('Storage unavailable')));

    component.ngOnInit();

    expect(component.galleryState()).toBe('error');
    expect(component.galleryError()).toContain('Storage unavailable');
    expect(component.galleryImages().length).toBe(0);

    // Now test retry
    mockHotelImageService.getImages.mockReturnValue(of(mockImages));
    component.retryGalleryLoad();

    expect(component.galleryState()).toBe('success');
    expect(component.totalGalleryImages()).toBe(2);
  });

  it('should allow selecting a thumbnail to update the primary active image', () => {
    component.ngOnInit();
    expect(component.activeImageIndex()).toBe(0);

    component.setActiveImage(1);
    expect(component.activeImageIndex()).toBe(1);
    expect(component.activeImage()?.id).toBe(203);

    // Out of bounds selection should be ignored
    component.setActiveImage(99);
    expect(component.activeImageIndex()).toBe(1);
  });

  it('should open and close the lightbox modal at the specified index', () => {
    component.ngOnInit();
    expect(component.lightboxVisible()).toBe(false);

    component.openLightbox(1);
    expect(component.lightboxVisible()).toBe(true);
    expect(component.lightboxIndex()).toBe(1);
    expect(component.currentLightboxImage()?.id).toBe(203);

    component.closeLightbox();
    expect(component.lightboxVisible()).toBe(false);
  });

  it('should cycle through lightbox photos using nextLightboxImage and prevLightboxImage', () => {
    component.ngOnInit();
    component.openLightbox(0);

    // Next from 0 -> 1
    component.nextLightboxImage();
    expect(component.lightboxIndex()).toBe(1);

    // Next from 1 -> 0 (wraps around)
    component.nextLightboxImage();
    expect(component.lightboxIndex()).toBe(0);

    // Prev from 0 -> 1 (wraps backwards)
    component.prevLightboxImage();
    expect(component.lightboxIndex()).toBe(1);
  });

  it('should reset gallery state and clear images when switching between hotels', () => {
    component.ngOnInit();
    expect(component.galleryImages().length).toBe(2);

    // Switch hotel to ID 2
    mockHotelImageService.getImages.mockReturnValue(of([]));
    paramMapSubject.next(convertToParamMap({ id: '2' }));

    expect(mockHotelImageService.getImages).toHaveBeenCalledWith(2);
    expect(component.hotelId()).toBe(2);
    expect(component.galleryImages().length).toBe(0);
    expect(component.galleryState()).toBe('empty');
    expect(component.activeImageIndex()).toBe(0);
    expect(component.lightboxVisible()).toBe(false);
  });

  it('should handle keyboard navigation (ArrowLeft, ArrowRight, Escape) when lightbox is open', () => {
    component.ngOnInit();
    component.openLightbox(0);

    const rightArrowEvent = { key: 'ArrowRight', preventDefault: vi.fn() } as unknown as KeyboardEvent;
    component.handleKeyboardEvent(rightArrowEvent);
    expect(component.lightboxIndex()).toBe(1);

    const leftArrowEvent = { key: 'ArrowLeft', preventDefault: vi.fn() } as unknown as KeyboardEvent;
    component.handleKeyboardEvent(leftArrowEvent);
    expect(component.lightboxIndex()).toBe(0);

    const escapeEvent = { key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent;
    component.handleKeyboardEvent(escapeEvent);
    expect(component.lightboxVisible()).toBe(false);
  });

  it('should fallback to placeholder and record failed image ID on image error', () => {
    component.ngOnInit();

    const mockImgElement = { src: 'original.jpg' } as HTMLImageElement;
    const mockEvent = { target: mockImgElement } as unknown as Event;

    component.onImageError(201, mockEvent);

    expect(mockImgElement.src).toBe(DEFAULT_IMAGE_PLACEHOLDER);
    expect(component.failedImageIds().has(201)).toBe(true);
  });

  describe('Phase D: Room Images Integration', () => {
    it('should match room images to the correct room type and exclude hotel-level images', () => {
      component.ngOnInit();

      const deluxePrimary = component.getRoomPrimaryImage('DELUXE');
      expect(deluxePrimary).not.toBeNull();
      expect(deluxePrimary?.id).toBe(202);
      expect(deluxePrimary?.roomType).toBe('DELUXE');

      const suitePrimary = component.getRoomPrimaryImage('SUITE');
      expect(suitePrimary).not.toBeNull();
      expect(suitePrimary?.id).toBe(204);

      // Hotel-level images (roomType === null) must be excluded
      expect(component.getRoomImages(null)).toEqual([]);
      expect(component.getRoomPrimaryImage(null)).toBeNull();
    });

    it('should normalize case and whitespace when matching room types', () => {
      component.ngOnInit();

      // Variations of DELUXE
      expect(component.getRoomPrimaryImage(' deluxe ')?.id).toBe(202);
      expect(component.getRoomPrimaryImage('deluxe')?.id).toBe(202);
      expect(component.getRoomPrimaryImage('Deluxe')?.id).toBe(202);

      // Variations of SUITE
      expect(component.getRoomPrimaryImage(' suite ')?.id).toBe(204);
      expect(component.getRoomPrimaryImage('Suite')?.id).toBe(204);
    });

    it('should select the first matching image according to sortOrder ASC, then id ASC when multiple match', () => {
      component.allHotelImages.set([
        { id: 99, hotelId: 1, roomType: 'DOUBLE', url: 'double-high-sort.jpg', sortOrder: 10 },
        { id: 50, hotelId: 1, roomType: 'DOUBLE', url: 'double-low-sort.jpg', sortOrder: 1 },
        { id: 55, hotelId: 1, roomType: 'DOUBLE', url: 'double-low-sort-second.jpg', sortOrder: 1 },
        { id: 10, hotelId: 1, roomType: null, url: 'lobby.jpg', sortOrder: 0 },
      ]);

      const primary = component.getRoomPrimaryImage('DOUBLE');
      expect(primary).not.toBeNull();
      expect(primary?.id).toBe(50); // sortOrder 1, id 50 < id 55

      const allDouble = component.getRoomImages('DOUBLE');
      expect(allDouble.map((img) => img.id)).toEqual([50, 55, 99]);
    });

    it('should return null and empty list when no matching image exists for a room type', () => {
      component.ngOnInit();

      expect(component.getRoomPrimaryImage('SINGLE')).toBeNull();
      expect(component.getRoomImages('SINGLE')).toEqual([]);
    });

    it('should open the Lightbox containing ONLY the selected room type images', () => {
      component.ngOnInit();

      // Open room lightbox for DELUXE room #101
      component.openRoomLightbox('DELUXE', '101');

      expect(component.lightboxVisible()).toBe(true);
      expect(component.lightboxIndex()).toBe(0);
      expect(component.lightboxImages().length).toBe(1);
      expect(component.lightboxImages()[0].id).toBe(202);
      expect(component.lightboxTitle()).toContain('Room #101');
      expect(component.lightboxTitle()).toContain('Deluxe');

      component.closeLightbox();
      expect(component.lightboxVisible()).toBe(false);
    });

    it('should keep Lightbox closed when room has no images', () => {
      component.ngOnInit();

      // SINGLE has 0 images
      component.openRoomLightbox('SINGLE', '201');
      expect(component.lightboxVisible()).toBe(false);
    });

    it('should avoid making additional API calls when querying room images or opening room Lightbox', () => {
      component.ngOnInit();
      expect(mockHotelImageService.getImages).toHaveBeenCalledTimes(1);

      // Access primary images and open room lightbox
      component.getRoomPrimaryImage('DELUXE');
      component.getRoomImages('DELUXE');
      component.openRoomLightbox('DELUXE', '101');

      // Still exactly 1 call
      expect(mockHotelImageService.getImages).toHaveBeenCalledTimes(1);
    });

    it('should handle room image loading errors by replacing src with placeholder without loop', () => {
      component.ngOnInit();

      const mockImg = { src: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/deluxe.jpg' } as HTMLImageElement;
      const mockEvent = { target: mockImg } as unknown as Event;

      component.onRoomImageError(202, mockEvent);

      expect(mockImg.src).toBe(DEFAULT_IMAGE_PLACEHOLDER);
      expect(component.failedImageIds().has(202)).toBe(true);

      // Trigger error again on placeholder: must not reassign or loop
      mockImg.src = 'http://localhost:4200/assets/images/hotel-placeholder.svg';
      component.onRoomImageError(202, mockEvent);
      expect(mockImg.src).toBe('http://localhost:4200/assets/images/hotel-placeholder.svg');
    });

    it('should preserve hotel gallery behavior when opening hotel gallery Lightbox', () => {
      component.ngOnInit();

      // Open general hotel gallery lightbox
      component.openLightbox(1);

      expect(component.lightboxVisible()).toBe(true);
      expect(component.lightboxIndex()).toBe(1);
      // General gallery lightbox uses filteredGalleryImages (2 general images)
      expect(component.lightboxImages().length).toBe(2);
      expect(component.lightboxImages()[0].id).toBe(201);
      expect(component.lightboxTitle()).toBe(mockHotel.name);
    });
  });
});

