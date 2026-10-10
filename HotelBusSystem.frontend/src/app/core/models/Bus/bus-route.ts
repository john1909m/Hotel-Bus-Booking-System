export interface BusRouteDTO{
    id: number;
    name: string;
    duration: number;
    originStopId : number;
    destinationStopId: number;

}

export interface BusRouteRequestDTO{
    name: string;
    duration: number;
    originStopId : number;
    destinationStopId: number;
    
}