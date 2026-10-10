export type seatType = 
'REGULAR' |
'PREMIUM' |
'WINDOW' |
'AISLE';

export interface BusSeatDTO {
    id : number;
    seatNumber : string;
    seatType: seatType;
    busId : number;
}

export interface BusSeatRequestDTO {
    seatNumber : string;
    seatType: seatType;
    busId : number;
}

