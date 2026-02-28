import { Database as OriginalDatabase } from './src/types/database.types';
import { createClient } from '@supabase/supabase-js';

export type Database = {
    public: Omit<OriginalDatabase['public'], 'Views'> & {
        Views: {
            view_financial_metrics: OriginalDatabase['public']['Views']['view_financial_metrics'] & {
                Relationships: []
            }
        }
    }
}

const client = createClient<Database>('http://localhost', 'key');
client.from('organizations').insert({ name: 'test', slug: 'test' });
