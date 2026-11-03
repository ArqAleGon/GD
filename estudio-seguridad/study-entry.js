import {station} from './study-stations.js?v=20261103-e02plans32';
if(station.modelOnly) await import('./study-model-viewer.js?v=20261103-e02plans32');
else await import('./study.js?v=20261103-e02plans32');
