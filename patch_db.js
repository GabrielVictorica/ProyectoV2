const fs = require('fs');
let content = fs.readFileSync('src/types/database.types.ts', 'utf8');

// 1. Fix view_financial_metrics missing Relationships
if (!content.includes('Relationships: []', content.indexOf('view_financial_metrics: {'))) {
    // It's missing. We inject it at the end of its Row.
    content = content.replace(
        /view_financial_metrics: \{\r?\n\s*Row: \{[\s\S]*?\}\r?\n\s*\}/,
        match => match.replace(/\}\r?\n\s*\}$/, '}\n                Relationships: []\n            }')
    );
}

// 2. Add missing tables and views
const tablesToAdd = `
            profile_supervisors: { Row: any; Insert: any; Update: any; Relationships: any[] }
            agent_objectives: { Row: any; Insert: any; Update: any; Relationships: any[] }
            persons: { Row: any; Insert: any; Update: any; Relationships: any[] }
            person_searches: { Row: any; Insert: any; Update: any; Relationships: any[] }
`;
const viewsToAdd = `
            view_agent_progress: { Row: any; Relationships: any[] }
            view_team_objectives_summary: { Row: any; Relationships: any[] }
            view_anonymous_clients: { Row: any; Relationships: any[] }
            view_agent_progress_extended: { Row: any; Relationships: any[] }
`;

content = content.replace(tablesToAdd, '');
content = content.replace(viewsToAdd, '');

content = content.replace(/        \}\r?\n        Views: \{/g, tablesToAdd + '        }\n        Views: {');
content = content.replace(/            \}\r?\n        \}\r?\n        Functions: \{/g, '            }\n' + viewsToAdd + '        }\n        Functions: {');

fs.writeFileSync('src/types/database.types.ts', content);
console.log('Database types patched! Root cause fixed.');
