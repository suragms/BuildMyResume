// Resume Templates Module - Benjamin Shah Design System
// ATS-optimized, recruiter-approved templates

// ============ TYPOGRAPHY SYSTEM ============
export const TYPOGRAPHY = {
    fontFamily: {
        primary: "'Inter', 'Helvetica Neue', Arial, Calibri, sans-serif",
        fallback: "Arial, Calibri, sans-serif"
    },
    fontSize: {
        name: '24px',
        sectionHeader: '13px',
        jobTitle: '12px',
        body: '11px',
        meta: '10px'
    },
    fontWeight: {
        bold: 700,
        semiBold: 600,
        regular: 400
    },
    lineHeight: {
        body: 1.35,
        bullets: 1.4
    }
};

// ============ COLOR SYSTEM (ATS-SAFE) ============
export const COLORS = {
    primary: '#111111',      // Near black - main text
    secondary: '#444444',    // Dark gray - secondary text
    accent: '#2F3E46',       // Muted slate - headers/lines
    divider: '#E0E0E0',      // Light gray - section dividers
    white: '#FFFFFF'         // Background
};

// ============ SPACING SYSTEM ============
export const SPACING = {
    page: {
        width: '210mm',
        height: '297mm',
        marginTop: '20mm',
        marginBottom: '20mm',
        marginLeft: '18mm',
        marginRight: '18mm'
    },
    section: {
        beforeSection: '12px',
        afterTitle: '6px',
        dividerHeight: '1px'
    },
    bullet: {
        indent: '12px',
        symbol: '•'
    }
};

// ============ SECTION ORDER (MANDATORY) ============
export const SECTION_ORDER = [
    'header',
    'summary',
    'skills',
    'experience',
    'projects',
    'education',
    'certifications',
    'achievements'
] as const;

export type SectionType = typeof SECTION_ORDER[number];

// ============ TEMPLATE INTERFACE ============
export interface TemplateStyle {
    id: string;
    name: string;
    description: string;
    preview: string;
    typography: typeof TYPOGRAPHY;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        divider: string;
    };
    spacing: typeof SPACING;
    layout: {
        columns: 1 | 2;
        headerStyle: 'centered' | 'left' | 'split';
        sectionDivider: boolean;
        bulletStyle: 'dot' | 'dash' | 'none';
    };
    atsScore: number; // 1-100
}

// ============ TEMPLATES ============
export const TEMPLATES: TemplateStyle[] = [
    {
        id: 'benjamin-shah',
        name: 'Benjamin Shah',
        description: 'ATS-optimized, recruiter-approved professional template',
        preview: 'Professional single-column layout with clean typography',
        typography: TYPOGRAPHY,
        colors: {
            primary: '#111111',
            secondary: '#444444',
            accent: '#2F3E46',
            divider: '#E0E0E0'
        },
        spacing: SPACING,
        layout: {
            columns: 1,
            headerStyle: 'left',
            sectionDivider: true,
            bulletStyle: 'dot'
        },
        atsScore: 98
    },
    {
        id: 'classic-pro',
        name: 'Classic Pro',
        description: 'Traditional format preferred by corporate recruiters',
        preview: 'Clean, traditional resume layout',
        typography: TYPOGRAPHY,
        colors: {
            primary: '#000000',
            secondary: '#333333',
            accent: '#1a1a1a',
            divider: '#cccccc'
        },
        spacing: SPACING,
        layout: {
            columns: 1,
            headerStyle: 'centered',
            sectionDivider: true,
            bulletStyle: 'dot'
        },
        atsScore: 95
    },
    {
        id: 'minimal-clean',
        name: 'Minimal Clean',
        description: 'Simple and elegant with maximum readability',
        preview: 'Minimalist design with subtle accents',
        typography: TYPOGRAPHY,
        colors: {
            primary: '#1a1a1a',
            secondary: '#4a4a4a',
            accent: '#666666',
            divider: '#e5e5e5'
        },
        spacing: SPACING,
        layout: {
            columns: 1,
            headerStyle: 'left',
            sectionDivider: false,
            bulletStyle: 'dash'
        },
        atsScore: 96
    }
];

// ============ PAGE RULES ============
export const PAGE_RULES = {
    onePage: {
        maxExperience: 2,
        maxProjects: 2,
        maxSummaryLines: 3,
        recommended: true
    },
    twoPages: {
        maxExperience: 5,
        maxProjects: 4,
        maxSummaryLines: 4,
        rule: 'Never split a job across pages'
    },
    threePages: {
        minYearsExperience: 8,
        rule: 'Each page must start with section header',
        minPageContent: 40 // percentage
    },
    maxPages: 3
};

// ============ CONTENT RULES ============
export const CONTENT_RULES = {
    summary: {
        maxLines: 3,
        noPronouns: true,
        valueBasedOnly: true
    },
    skills: {
        maxGroups: 5,
        format: 'inline', // NOT bullets
        noProgressBars: true,
        noRatings: true
    },
    experience: {
        maxBulletsPerRole: 4,
        bulletMaxLines: 2,
        order: 'reverse-chronological',
        requireActionVerbs: true,
        preferQuantifiedResults: true
    },
    projects: {
        structure: ['name', 'techStack', 'description', 'result'],
        maxProjects: 4
    },
    education: {
        showGPA: 'only-if-strong',
        keepShort: true
    }
};

// ============ HELPER FUNCTIONS ============
export const getTemplate = (id: string): TemplateStyle | undefined => {
    return TEMPLATES.find(t => t.id === id);
};

export const getDefaultTemplate = (): TemplateStyle => {
    return TEMPLATES[0]; // Benjamin Shah
};

export const getTemplateCSS = (template: TemplateStyle): string => {
    return `
        .cv-paper.${template.id} {
            font-family: ${template.typography.fontFamily.primary};
            color: ${template.colors.primary};
            line-height: ${template.typography.lineHeight.body};
        }
        .cv-paper.${template.id} h1 {
            font-size: ${template.typography.fontSize.name};
            font-weight: ${template.typography.fontWeight.bold};
            color: ${template.colors.primary};
        }
        .cv-paper.${template.id} h2 {
            font-size: ${template.typography.fontSize.sectionHeader};
            font-weight: ${template.typography.fontWeight.semiBold};
            color: ${template.colors.accent};
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: ${template.layout.sectionDivider ? `1px solid ${template.colors.divider}` : 'none'};
            padding-bottom: ${template.spacing.section.afterTitle};
            margin-top: ${template.spacing.section.beforeSection};
        }
        .cv-paper.${template.id} .job-title {
            font-size: ${template.typography.fontSize.jobTitle};
            font-weight: ${template.typography.fontWeight.semiBold};
        }
        .cv-paper.${template.id} p,
        .cv-paper.${template.id} li {
            font-size: ${template.typography.fontSize.body};
            color: ${template.colors.secondary};
        }
        .cv-paper.${template.id} .meta {
            font-size: ${template.typography.fontSize.meta};
            color: ${template.colors.secondary};
        }
        .cv-paper.${template.id} ul {
            padding-left: ${template.spacing.bullet.indent};
            list-style-type: ${template.layout.bulletStyle === 'dot' ? 'disc' : template.layout.bulletStyle === 'dash' ? '"- "' : 'none'};
        }
    `;
};

// ============ VALIDATION ============
export const validatePageCount = (
    experienceCount: number,
    projectCount: number,
    yearsExperience: number
): 1 | 2 | 3 => {
    if (experienceCount <= PAGE_RULES.onePage.maxExperience && 
        projectCount <= PAGE_RULES.onePage.maxProjects) {
        return 1;
    }
    if (experienceCount <= PAGE_RULES.twoPages.maxExperience && 
        projectCount <= PAGE_RULES.twoPages.maxProjects) {
        return 2;
    }
    if (yearsExperience >= PAGE_RULES.threePages.minYearsExperience) {
        return 3;
    }
    return 2;
};

export const getATSScore = (templateId: string): number => {
    const template = getTemplate(templateId);
    return template?.atsScore || 0;
};
