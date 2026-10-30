import {station} from './study-stations.js?v=20261030-stations';
if(station.modelOnly) await import('./study-model-viewer.js?v=20261030-stations');
else await import('./study.js?v=20261030-stations');
