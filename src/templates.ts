// Resume Templates Module

export interface TemplateStyle {
    id: string;
    name: string;
    description: string;
    headerStyle: 'classic' | 'modern' | 'minimal';
    colorScheme: {
        primary: string;
        secondary: string;
        accent: string;
    };
}

export const TEMPLATES: TemplateStyle[] = [
    {
        id: 'classic',
        name: 'Classic',
        description: 'Clean and professional',
        headerStyle: 'classic',
        colorScheme: {
            primary: '#0a0a0a',
            secondary: '#71717a',
            accent: '#3b82f6'
        }
    },
    {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary layout',
        headerStyle: 'modern',
        colorScheme: {
            primary: '#1f2937',
            secondary: '#6b7280',
            accent: '#2563eb'
        }
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Simple and elegant',
        headerStyle: 'minimal',
        colorScheme: {
            primary: '#18181b',
            secondary: '#a1a1aa',
            accent: '#525252'
        }
    }
];

export const getTemplate = (id: string): TemplateStyle | undefined => {
    return TEMPLATES.find(t => t.id === id);
};

export const getTemplateClass = (id: string): string => {
    return id;
};
