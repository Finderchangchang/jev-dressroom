import {createDecartClient,models,noopLogger} from '@decartai/sdk';
import {openDecart} from './decart-session.mjs';
export const connectRenderer=options=>openDecart({...options,sdk:{createDecartClient,models,noopLogger}});
