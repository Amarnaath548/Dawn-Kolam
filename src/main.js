import levels from './levels/levels.json';
import { createScreenManager } from './ui/screens.js';

const app = document.getElementById('app');
const screenManager = createScreenManager(app, levels);
screenManager.show('menu');
