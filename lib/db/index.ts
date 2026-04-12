import 'dotenv/config';

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export * from './types';

const client = createClient({ url: process.env.DB_FILE_NAME! });

export const db = drizzle({
    client,
    schema: schema,
    logger: process.env.NODE_ENV === 'development' ? true : false,
});

