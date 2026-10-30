import {station} from './study-stations.js?v=20261030-ins31';
if(station.modelOnly) await import('./study-model-viewer.js?v=20261030-ins31');
else await import('./study.js?v=20261030-ins31');
