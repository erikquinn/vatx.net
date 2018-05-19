// settings
const airspaceRadiusNm = 40;
const arrivalAirportList = ['KMIA', 'KFLL'];
var ataMap = {
    ANNEY3: 'HILEY',
    ANNEY4: 'HILEY',
    BLUFI3: 'HILEY',
    BLUFI4: 'HILEY',
    CURSO4: 'WEVER',
    CURSO5: 'WEVER',
    CYY8: 'WORPP',
    CYY9: 'WORPP',
    DEKAL4: 'DEKAL',
    DEKAL5: 'DEKAL',
    DVALL2: 'WEVER',
    DVALL3: 'WEVER',
    FISEL6: 'FISEL',
    FISEL7: 'FISEL',
    FLIPR4: 'JUNUR',
    FLIPR5: 'JUNUR',
    FORTL6: 'KUBIC',
    FORTL7: 'KUBIC',
    FOWEE8: 'JUNUR',
    FOWEE9: 'JUNUR',
    GISSH4: 'FISEL',
    GISSH5: 'FISEL',
    HILEY6: 'HILEY',
    HILEY7: 'HILEY',
    JINGL4: 'KUBIC',
    JINGL5: 'KUBIC',
    SSCOT3: 'WORPP',
    SSCOT4: 'WORPP',
    WAVUN2: 'DEKAL',
    WAVUN3: 'DEKAL'
};
var ataCoordinates = {
    'DEKAL': [25.850500, -79.631333],
    'FISEL': [26.384167, -79.857667],
    'HILEY': [26.254333, -80.013000],
    'JUNUR': [25.387833, -79.722167],
    'KUBIC': [26.097667, -80.949500],
    'WEVER': [25.552333, -80.913667],
    'WORPP': [25.893500, -80.974167]
};
var sectorMap = {
    N: ['WORPP', 'KUBIC', 'HILEY', 'FISEL', 'DEKAL'],
    S: ['WEVER', 'JUNUR'],
    F: ['*KMIA']
};
var maxCharactersInRoute = 50;
var routeTruncationSymbol = './.';

// helper functions
function _generateArrivalAtaInformationFromRoute(route) {
    const ataInformation =  {
        ata: '',
        procedure: ''
    };

    // record information for arrivals filed on procedures
    for (let procedure in ataMap) {
        const ata = ataMap[procedure];
        const ataNames = Object.keys(ataCoordinates);

        if (route.indexOf(procedure) !== -1) {
            ataInformation.ata = ata;
            ataInformation.procedure = procedure;

            break;
        }
    }

    // record information for arrivals NOT filed on procedures, but ARE filed over ATA
    if (ataInformation.ata === '') {
        for (let ata in ataCoordinates) {
            if (route.indexOf(ata) !== -1) {
                ataInformation.ata = ata;
                ataInformation.procedure = '------';

                break;
            }
        }
    }

    return ataInformation;
}
function _calculateDistance(originCoordinates, destinationCoordinates) {
    const R = 3440;
    const φ1 = _degreesToRadians(originCoordinates[0]);
    const φ2 = _degreesToRadians(destinationCoordinates[0]);
    const Δφ = _degreesToRadians(destinationCoordinates[0] - originCoordinates[0]);
    const Δλ = _degreesToRadians(destinationCoordinates[1] - originCoordinates[1]);
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;

    return d;   //nm
}
function _degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}
function _generateTruncatedRoute(route) {
    if (route.length <= maxCharactersInRoute) {
        return route;
    }

    const truncatedRoute = route.substr(route.length - maxCharactersInRoute + routeTruncationSymbol.length);

    return routeTruncationSymbol + truncatedRoute;
}
function _extractArrivalInformation(data) {
    const arrivals = data.filter(aircraft => arrivalAirportList.indexOf(aircraft.planned_destairport) !== -1);

    return arrivals.map(aircraft => {
        const ataInformation = _generateArrivalAtaInformationFromRoute(aircraft.planned_route);
        const aircraftCoordinates = [aircraft.latitude, aircraft.longitude];
        const destinationCoordinates = [aircraft.planned_destairport_lat, aircraft.planned_destairport_lon];
        let distanceToAta = _.round(_calculateDistance(aircraftCoordinates, destinationCoordinates) - airspaceRadiusNm);
        const ataName = ataInformation.ata || '--- NO ATA ---';
        const aircraftPositionReferenceFix = ataInformation.ata || aircraft.planned_destairport;
        const procedureName = ataInformation.procedure || '------';
        const truncatedRoute = _generateTruncatedRoute(aircraft.planned_route);

        if (typeof ataName === 'undefined') {
            distanceToAta = _.round(_calculateDistance(aircraftCoordinates, ataCoordinates[ataName]));
        }

         return {
            ata: ataName,
            procedure: procedureName,
            callsign: aircraft.callsign,
            type: aircraft.planned_aircraft,
            destination: aircraft.planned_destairport,
            route: truncatedRoute,
            location: `${distanceToAta} from ${aircraftPositionReferenceFix}`
        };
    });
}

// main function
function extractArrivalInformationByAta(data) {
    const arrivalInformation = _extractArrivalInformation(data);

    return _.groupBy(arrivalInformation, 'ata');
}

// try passing data from "sample-data.json" to `extractArrivalInformationByAta()`
