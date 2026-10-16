import * as sdk from '@xmaxai/web-sdk';
import {openXmax} from './xmax-session.mjs';
export const connectRenderer=options=>openXmax({...options,sdk});
