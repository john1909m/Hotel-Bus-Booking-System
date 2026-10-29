package com.spring.boot.controller;

import com.spring.boot.dto.BusDto;
import com.spring.boot.dto.BusFeatureDto;
import com.spring.boot.dto.BusFeatureSummaryDto;
import com.spring.boot.dto.BusPricingUpdateRequestDto;
import com.spring.boot.dto.BusTripPriceBreakdownDto;
import com.spring.boot.exception.AnalyticsValidationException;
import com.spring.boot.exception.BookingConflictException;
import com.spring.boot.exception.GlobalExceptionHandler;
import com.spring.boot.helper.BundleMessageService;
import com.spring.boot.service.interfaces.BusFeatureService;
import com.spring.boot.service.interfaces.BusService;
import com.spring.boot.service.interfaces.BusTripService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class BusPricingControllerTest {

    private MockMvc mockMvcBus;
    private MockMvc mockMvcFeatures;
    private MockMvc mockMvcTrip;

    @Mock
    private BusService busService;

    @Mock
    private BusFeatureService busFeatureService;

    @Mock
    private BusTripService busTripService;

    @Mock
    private BundleMessageService bundleMessageService;

    @InjectMocks
    private BusController busController;

    @InjectMocks
    private BusFeatureController busFeatureController;

    @InjectMocks
    private BusTripController busTripController;

    @BeforeEach
    void setUp() {
        lenient().when(bundleMessageService.getMessage(anyString())).thenAnswer(inv -> inv.getArgument(0));
        GlobalExceptionHandler exceptionHandler = new GlobalExceptionHandler(bundleMessageService);

        mockMvcBus = MockMvcBuilders.standaloneSetup(busController)
                .setControllerAdvice(exceptionHandler)
                .build();

        mockMvcFeatures = MockMvcBuilders.standaloneSetup(busFeatureController)
                .setControllerAdvice(exceptionHandler)
                .build();

        mockMvcTrip = MockMvcBuilders.standaloneSetup(busTripController)
                .setControllerAdvice(exceptionHandler)
                .build();
    }

    @Test
    @DisplayName("GET /api/bus-features returns 200 and list of features")
    void testGetAllFeatures_Success() throws Exception {
        BusFeatureDto f1 = BusFeatureDto.builder()
                .id(1L)
                .code("WIFI")
                .nameKey("feature.wifi")
                .surcharge(new BigDecimal("10.00"))
                .active(true)
                .build();

        when(busFeatureService.getAllFeatures()).thenReturn(List.of(f1));

        mockMvcFeatures.perform(get("/api/bus-features"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("WIFI"))
                .andExpect(jsonPath("$[0].surcharge").value(10.00));
    }

    @Test
    @DisplayName("POST /api/bus-features with duplicate code returns 409 conflict")
    void testCreateFeature_Conflict() throws Exception {
        when(busFeatureService.createFeature(any())).thenThrow(new BookingConflictException("Data conflict: duplicate or conflicting resource already exists"));

        mockMvcFeatures.perform(post("/api/bus-features")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"WIFI\",\"nameKey\":\"feature.wifi\",\"surcharge\":10.00,\"active\":true}"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("PUT /api/buses/{id}/pricing with factor 0.40 returns 400 Bad Request")
    void testUpdateBusPricing_FactorTooLow() throws Exception {
        mockMvcBus.perform(put("/api/buses/1/pricing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"priceFactor\":0.40,\"featureIds\":[1]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/buses/{id}/pricing with factor 3.50 returns 400 Bad Request")
    void testUpdateBusPricing_FactorTooHigh() throws Exception {
        mockMvcBus.perform(put("/api/buses/1/pricing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"priceFactor\":3.50,\"featureIds\":[1]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/buses/{id}/pricing with valid factor and features returns 200")
    void testUpdateBusPricing_Success() throws Exception {
        BusDto busDto = new BusDto();
        busDto.setId(1L);
        busDto.setPriceFactor(new BigDecimal("1.25"));

        when(busService.updateBusPricing(eq(1L), any(BusPricingUpdateRequestDto.class))).thenReturn(busDto);

        mockMvcBus.perform(put("/api/buses/1/pricing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"priceFactor\":1.25,\"featureIds\":[1,2]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceFactor").value(1.25));
    }

    @Test
    @DisplayName("GET /api/bus-trips/{id}/price returns 200 and dynamic price quote breakdown")
    void testGetBusTripPriceQuote_Success() throws Exception {
        BusTripPriceBreakdownDto quote = BusTripPriceBreakdownDto.builder()
                .basePrice(new BigDecimal("100.00"))
                .priceFactor(new BigDecimal("1.25"))
                .factoredPrice(new BigDecimal("125.00"))
                .features(List.of(
                        BusFeatureSummaryDto.builder().code("WIFI").surcharge(new BigDecimal("10.00")).build()
                ))
                .total(new BigDecimal("135.00"))
                .build();

        when(busTripService.getBusTripPriceQuote(100L)).thenReturn(quote);

        mockMvcTrip.perform(get("/api/bus-trips/100/price"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basePrice").value(100.00))
                .andExpect(jsonPath("$.priceFactor").value(1.25))
                .andExpect(jsonPath("$.factoredPrice").value(125.00))
                .andExpect(jsonPath("$.features[0].code").value("WIFI"))
                .andExpect(jsonPath("$.total").value(135.00));
    }

    @Test
    @DisplayName("GET /api/buses/{id} includes priceFactor and features")
    void testGetBusById_IncludesPricingAndFeatures() throws Exception {
        BusFeatureDto wifi = BusFeatureDto.builder().id(1L).code("WIFI").surcharge(new BigDecimal("10.00")).active(true).build();
        BusDto busDto = new BusDto();
        busDto.setId(1L);
        busDto.setBusNumber("BUS-101");
        busDto.setPriceFactor(new BigDecimal("1.25"));
        busDto.setFeatures(Set.of(wifi));

        when(busService.getBusById(1L)).thenReturn(busDto);

        mockMvcBus.perform(get("/api/buses/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.busNumber").value("BUS-101"))
                .andExpect(jsonPath("$.priceFactor").value(1.25))
                .andExpect(jsonPath("$.features[0].code").value("WIFI"));
    }
}
