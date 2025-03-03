import { createStore } from 'https://unpkg.com/redux@latest/dist/redux.mjs';
import { reducer } from './reducer.js';

const store = createStore(reducer);
export { store };