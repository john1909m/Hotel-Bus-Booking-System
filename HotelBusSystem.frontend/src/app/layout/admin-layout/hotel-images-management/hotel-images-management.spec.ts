import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HotelImagesManagement } from './hotel-images-management';
import { HotelService } from '../../../core/services/hotel.service';
import { RoomService } from '../../../core/services/room.service';
import { HotelImageService } from '../../../core/services/hotel-image.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';
import { MessageService } from 'primeng/api';
import { HotelDTO } from '../../../core/models/Hotel/hotel.model';
import { HotelImageDto } from '../../../core/models/Image/hotel_image.model';

describe('HotelImagesManagement Component', () => {
  let component: HotelImagesManagement;
  let mockHotelService: any;
  let mockRoomService: any;
  let mockHotelImageService: any;
  let mockImageUploadService: any;
  let mockMessageService: any;

  const mockHotels: HotelDTO[] = [
    { id: 1, name: 'Grand Nile Plaza', city: 'Cairo', address: 'Garden City', rating: 4.8, latitude: 30.0, longitude: 31.0, checkInTime: '14:00', checkOutTime: '11:00', description: 'Desc', coverImageUrl: '' },
    { id: 2, name: 'Red Sea Resort', city: 'Hurghada', address: 'Beach Rd', rating: 4.5, latitude: 27.0, longitude: 33.0, checkInTime: '14:00', checkOutTime: '11:00', description: 'Desc', coverImageUrl: '' },
  ];

  const mockImages: HotelImageDto[] = [
    { id: 101, hotelId: 1, roomType: null, url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/lobby.jpg', sortOrder: 0 },
    { id: 102, hotelId: 1, roomType: 'DOUBLE', url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/double.jpg', sortOrder: 1 },
    { id: 103, hotelId: 1, roomType: 'SUITE', url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/hotels/1/suite.jpg', sortOrder: 2 },
  ];

  const mockRooms = [
    { id: 11, roomNumber: '101', roomType: 'DOUBLE', hotelId: 1 },
    { id: 12, roomNumber: '102', roomType: 'SUITE', hotelId: 1 },
  ];

  beforeEach(() => {
    mockHotelService = {
      getHotels: vi.fn().mockReturnValue(of({ content: mockHotels, totalElements: 2 })),
    };
    mockRoomService = {
      getRoomsByHotelId: vi.fn().mockReturnValue(of(mockRooms)),
    };
    mockHotelImageService = {
      getImages: vi.fn().mockReturnValue(of(mockImages)),
      deleteImage: vi.fn().mockReturnValue(of(null)),
    };
    mockImageUploadService = {
      validateFile: vi.fn().mockReturnValue({ valid: true }),
      uploadImage: vi.fn().mockReturnValue(of({
        step: 'completed',
        progress: 100,
        publicUrl: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/new.jpg',
        imageDto: { id: 104, hotelId: 1, roomType: null, url: 'https://pub-e3f67119581e41a09e34c0a920c52720.r2.dev/new.jpg', sortOrder: 3 },
      })),
    };
    mockMessageService = {
      add: vi.fn(),
    };

    // Mock global URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-preview');
    global.URL.revokeObjectURL = vi.fn();

    const injector = Injector.create({
      providers: [
        { provide: HotelService, useValue: mockHotelService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: HotelImageService, useValue: mockHotelImageService },
        { provide: ImageUploadService, useValue: mockImageUploadService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new HotelImagesManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should initialize, load hotels, and auto-select the first hotel', () => {
    component.ngOnInit();

    expect(mockHotelService.getHotels).toHaveBeenCalledWith({ size: 100 });
    expect(component.hotels()).toEqual(mockHotels);
    expect(component.selectedHotelId()).toBe(1);
    expect(component.selectedHotel()).toEqual(mockHotels[0]);

    // Images and rooms should be fetched for hotel #1
    expect(mockHotelImageService.getImages).toHaveBeenCalledWith(1);
    expect(mockRoomService.getRoomsByHotelId).toHaveBeenCalledWith(1);
    expect(component.images()).toEqual(mockImages);
    expect(component.availableRoomTypes()).toEqual(['DOUBLE', 'SUITE']);
  });

  it('should filter images by category (ALL, HOTEL_GALLERY, or RoomType)', () => {
    component.ngOnInit();

    // Default: ALL
    expect(component.filteredImages().length).toBe(3);

    // HOTEL_GALLERY: only null roomType
    component.setFilter('HOTEL_GALLERY');
    expect(component.filteredImages().length).toBe(1);
    expect(component.filteredImages()[0].id).toBe(101);

    // DOUBLE room type
    component.setFilter('DOUBLE');
    expect(component.filteredImages().length).toBe(1);
    expect(component.filteredImages()[0].id).toBe(102);
  });

  it('should select another hotel and reload its images and rooms', () => {
    component.ngOnInit();
    expect(component.selectedHotelId()).toBe(1);

    component.selectHotel(2);
    expect(component.selectedHotelId()).toBe(2);
    expect(mockHotelImageService.getImages).toHaveBeenCalledWith(2);
    expect(mockRoomService.getRoomsByHotelId).toHaveBeenCalledWith(2);
  });

  it('should open upload dialog and prepare form defaults', () => {
    component.ngOnInit();
    component.openUploadDialog();

    expect(component.uploadDialogVisible()).toBe(true);
    expect(component.uploadForm.get('categoryType')?.value).toBe('HOTEL');
    expect(component.uploadForm.get('sortOrder')?.value).toBe(4); // images.length + 1
  });

  it('should handle file selection with validation and preview', () => {
    component.ngOnInit();
    component.openUploadDialog();

    const mockFile = new File(['content'], 'lobby.webp', { type: 'image/webp' });
    const event = {
      target: {
        files: [mockFile],
      },
    } as unknown as Event;

    component.onFileSelected(event);

    expect(mockImageUploadService.validateFile).toHaveBeenCalledWith(mockFile);
    expect(component.selectedFile()).toBe(mockFile);
    expect(component.previewUrl()).toBe('blob:http://localhost/mock-preview');
  });

  it('should reject invalid file during selection', () => {
    component.ngOnInit();
    component.openUploadDialog();

    mockImageUploadService.validateFile.mockReturnValue({
      valid: false,
      error: 'File size exceeds 5 MB',
    });

    const mockFile = new File(['huge'], 'huge.jpg', { type: 'image/jpeg' });
    const inputElement = { files: [mockFile], value: 'huge.jpg' };
    const event = { target: inputElement } as unknown as Event;

    component.onFileSelected(event);

    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Invalid File' })
    );
    expect(component.selectedFile()).toBeNull();
    expect(inputElement.value).toBe('');
  });

  it('should submit upload for Hotel Gallery category and refresh images', () => {
    component.ngOnInit();
    component.openUploadDialog();

    const mockFile = new File(['data'], 'pool.jpg', { type: 'image/jpeg' });
    component.selectedFile.set(mockFile);
    component.uploadForm.patchValue({
      categoryType: 'HOTEL',
      sortOrder: 0,
    });

    component.submitUpload();

    expect(mockImageUploadService.uploadImage).toHaveBeenCalledWith(1, mockFile, null, 0);
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Upload Complete' })
    );
    expect(component.uploadDialogVisible()).toBe(false);
  });

  it('should submit upload for Room Type category with valid room type', () => {
    component.ngOnInit();
    component.openUploadDialog();

    const mockFile = new File(['data'], 'room.webp', { type: 'image/webp' });
    component.selectedFile.set(mockFile);
    component.uploadForm.patchValue({
      categoryType: 'ROOM',
      roomType: 'DOUBLE',
      sortOrder: 1,
    });

    component.submitUpload();

    expect(mockImageUploadService.uploadImage).toHaveBeenCalledWith(1, mockFile, 'DOUBLE', 1);
  });

  it('should confirm and execute image deletion', () => {
    component.ngOnInit();
    const targetImage = mockImages[0];

    component.confirmDelete(targetImage);
    expect(component.deleteDialogVisible()).toBe(true);
    expect(component.imageToDelete()).toEqual(targetImage);

    component.executeDelete();

    expect(mockHotelImageService.deleteImage).toHaveBeenCalledWith(targetImage.id);
    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Image Deleted' })
    );
    expect(component.deleteDialogVisible()).toBe(false);
  });
});
