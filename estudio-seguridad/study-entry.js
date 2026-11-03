import {station} from './study-stations.js?v=20261103-estins34';
if(station.modelOnly) await import('./study-model-viewer.js?v=20261103-estins34');
else await import('./study.js?v=20261103-areas35');
