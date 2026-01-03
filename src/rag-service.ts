/**
 * RAG (Retrieval Augmented Generation) Service
 * Focuses only on actual CV content and target JD, no assumptions
 */

export interface RAGContext {
    cvContent: string;
    targetRole: string;
    jobDescription: string;
    extractedData: any;
}

export interface RAGResult {
    matchedSkills: string[];
    missingSkills: string[];
    contentMatches: { section: string; content: string; relevance: number }[];
    suggestions: string[];
    confidence: number;
}

/**
 * Build context from CV and JD
 */
export function buildRAGContext(cvText: string, targetRole: string, jdText: string, extractedData: any): RAGContext {
    return {
        cvContent: cvText,
        targetRole,
        jobDescription: jdText,
        extractedData
    };
}

/**
 * Semantic search in CV content for relevant sections
 */
export function searchCVContent(context: RAGContext, query: string): { section: string; content: string; relevance: number }[] {
    const cvText = context.cvContent.toLowerCase();
    const jdText = context.jobDescription.toLowerCase();
    const targetRole = context.targetRole.toLowerCase();
    
    // Define sections in CV
    const sections = extractCVSections(cvText);
    const results: { section: string; content: string; relevance: number }[] = [];
    
    // Calculate relevance based on keyword matching
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    for (const [sectionName, sectionContent] of Object.entries(sections)) {
        let relevance = 0;
        
        // Match query terms
        for (const term of queryTerms) {
            if (sectionContent.includes(term)) {
                relevance += 20;
            }
        }
        
        // Match target role
        if (targetRole && sectionContent.includes(targetRole)) {
            relevance += 15;
        }
        
        // Match JD keywords
        if (jdText) {
            const jdTerms = jdText.split(/\s+/).filter(term => term.length > 3);
            for (const term of jdTerms) {
                if (sectionContent.includes(term)) {
                    relevance += 5;
                }
            }
        }
        
        if (relevance > 0) {
            results.push({
                section: sectionName as string,
                content: sectionContent.substring(0, 300),
                relevance: Math.min(100, relevance)
            });
        }
    }
    
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

/**
 * Extract sections from CV text
 */
function extractCVSections(cvText: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = cvText.split('\n');
    
    let currentSection = 'general';
    let sectionContent = '';
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        
        // Check if this line is a section header
        if (isSectionHeader(lowerLine)) {
            // Save previous section
            if (currentSection && sectionContent.trim()) {
                sections[currentSection] = sectionContent.trim();
            }
            
            // Start new section
            currentSection = cleanSectionName(lowerLine);
            sectionContent = '';
        } else if (line.trim()) {
            sectionContent += line + ' ';
        }
    }
    
    // Save last section
    if (currentSection && sectionContent.trim()) {
        sections[currentSection] = sectionContent.trim();
    }
    
    return sections;
}

/**
 * Check if a line is a section header
 */
function isSectionHeader(line: string): boolean {
    const sectionHeaders = [
        'summary', 'profile', 'objective', 'experience', 'work experience', 
        'education', 'skills', 'technical skills', 'projects', 'certifications',
        'awards', 'achievements', 'contact', 'links'
    ];
    
    return sectionHeaders.some(header => 
        line.includes(header) && line.length < 50 && !line.includes('.')
    );
}

/**
 * Clean section name
 */
function cleanSectionName(line: string): string {
    return line.replace(/[^\w\s]/g, '').trim();
}

/**
 * Match skills between CV and JD
 */
export function matchSkills(context: RAGContext): { matched: string[]; missing: string[] } {
    const cvSkills = extractSkillsFromCV(context.cvContent);
    const jdSkills = extractSkillsFromJD(context.jobDescription);
    
    const matched = cvSkills.filter(skill => 
        jdSkills.some(jdSkill => 
            skill.toLowerCase().includes(jdSkill.toLowerCase()) || 
            jdSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );
    
    const missing = jdSkills.filter(jdSkill => 
        !cvSkills.some(skill => 
            skill.toLowerCase().includes(jdSkill.toLowerCase()) || 
            jdSkill.toLowerCase().includes(skill.toLowerCase())
        )
    );
    
    return { matched, missing };
}

/**
 * Extract skills from CV
 */
function extractSkillsFromCV(cvText: string): string[] {
    // Look for skills sections or skill-like patterns
    const skillsSection = extractSection(cvText, ['skills', 'technical skills', 'technologies', 'competencies']);
    
    if (skillsSection) {
        // Extract skills from common patterns
        const skillPatterns = [
            /\b(python|java|javascript|typescript|react|angular|vue|node\.?js|express|mongodb|sql|postgresql|mysql|aws|azure|gcp|docker|kubernetes|git|html|css|c\+\+|c#|go|rust|ruby|php|swift|kotlin|scala|r|matlab|shell|bash|tensorflow|pytorch|flask|django|spring|laravel|rails|next\.?js|nuxt|svelte|fastapi|asp\.net|\.net|jenkins|linux|windows|jira|figma|photoshop|rest|api|microservices|serverless|machine learning|deep learning|nlp|computer vision|data science|data analysis|etl|bi|devops|sre|frontend|backend|fullstack|mobile|ios|android|agile|scrum|ci\/cd|terraform|ansible|graphql|redis|elasticsearch|kafka|spark|hadoop|tableau|power bi|excel|selenium|jest|pytest|mocha|sas|spss|matlab|unity|unreal|blender|autocad|solidworks|adobe suite|figma|sketch|invision|adobe creative suite)\b/gi
        ];
        
        const allSkills: string[] = [];
        for (const pattern of skillPatterns) {
            const matches = skillsSection.match(pattern);
            if (matches) {
                allSkills.push(...matches.map(s => s.toLowerCase()));
            }
        }
        
        return [...new Set(allSkills)];
    }
    
    return [];
}

/**
 * Extract skills from JD
 */
function extractSkillsFromJD(jdText: string): string[] {
    const skillPatterns = [
        /\b(python|java|javascript|typescript|react|angular|vue|node\.?js|express|mongodb|sql|postgresql|mysql|aws|azure|gcp|docker|kubernetes|git|html|css|c\+\+|c#|go|rust|ruby|php|swift|kotlin|scala|r|matlab|shell|bash|tensorflow|pytorch|flask|django|spring|laravel|rails|next\.?js|nuxt|svelte|fastapi|asp\.net|\.net|jenkins|linux|windows|jira|figma|photoshop|rest|api|microservices|serverless|machine learning|deep learning|nlp|computer vision|data science|data analysis|etl|bi|devops|sre|frontend|backend|fullstack|mobile|ios|android|agile|scrum|ci\/cd|terraform|ansible|graphql|redis|elasticsearch|kafka|spark|hadoop|tableau|power bi|excel|selenium|jest|pytest|mocha|sas|spss|matlab|unity|unreal|blender|autocad|solidworks|adobe suite|figma|sketch|invision|adobe creative suite)\b/gi,
        /experience with ([^.\n]+)/gi,
        /knowledge of ([^.\n]+)/gi,
        /familiarity with ([^.\n]+)/gi,
        /proficiency in ([^.\n]+)/gi
    ];
    
    const allSkills: string[] = [];
    for (const pattern of skillPatterns) {
        const matches = jdText.match(pattern);
        if (matches) {
            for (const match of matches) {
                const extracted = match.replace(/experience with |knowledge of |familiarity with |proficiency in /i, '').trim();
                const individualSkills = extracted.split(/[,&+]/).map(s => s.trim());
                allSkills.push(...individualSkills);
            }
        }
    }
    
    return [...new Set(allSkills.filter(s => s.length > 2))];
}

/**
 * Extract specific section from text
 */
function extractSection(text: string, sectionNames: string[]): string | null {
    const lines = text.split('\n');
    let inSection = false;
    let sectionContent = '';
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        
        if (sectionNames.some(name => lowerLine.includes(name) && lowerLine.length < 50)) {
            inSection = true;
            sectionContent = '';
        } else if (inSection) {
            if (isSectionHeader(lowerLine)) {
                // Start of next section
                break;
            }
            sectionContent += line + ' ';
        }
    }
    
    return inSection && sectionContent.trim() ? sectionContent : null;
}

/**
 * Generate targeted suggestions based on RAG context
 */
export function generateSuggestions(context: RAGContext): string[] {
    const suggestions: string[] = [];
    
    // Check if target role matches CV content
    if (context.targetRole && !context.cvContent.toLowerCase().includes(context.targetRole.toLowerCase())) {
        suggestions.push(`Consider adding experience related to "${context.targetRole}" role`);
    }
    
    // Check for missing JD keywords
    const { matched, missing } = matchSkills(context);
    if (missing.length > 0) {
        suggestions.push(`Consider adding: ${missing.slice(0, 3).join(', ')}`);
    }
    
    // Check for experience gaps
    if (!context.cvContent.toLowerCase().includes('years') && !context.cvContent.toLowerCase().includes('experience')) {
        suggestions.push('Add years of experience or relevant experience details');
    }
    
    return suggestions.slice(0, 5);
}

/**
 * Main RAG function - matches CV to JD without assumptions
 */
export async function runRAGAnalysis(context: RAGContext): Promise<RAGResult> {
    const { matched, missing } = matchSkills(context);
    const contentMatches = searchCVContent(context, context.targetRole || context.jobDescription);
    const suggestions = generateSuggestions(context);
    
    // Calculate confidence based on matches
    const totalJDKeywords = extractSkillsFromJD(context.jobDescription).length;
    const matchScore = totalJDKeywords > 0 ? Math.round((matched.length / totalJDKeywords) * 100) : 0;
    
    return {
        matchedSkills: matched,
        missingSkills: missing,
        contentMatches,
        suggestions,
        confidence: matchScore
    };
}

/**
 * Validate CV content against extracted data (no AI assumptions)
 */
export function validateCVContent(cvText: string, extractedData: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const cvLower = cvText.toLowerCase();
    
    // Check if extracted email actually exists in CV text
    if (extractedData.email && !cvLower.includes(extractedData.email.toLowerCase())) {
        errors.push('Extracted email not found in CV text');
    }
    
    // Check if extracted phone actually exists in CV text
    if (extractedData.phone && !cvLower.includes(extractedData.phone.replace(/[\s\-\(\)\.+]/g, ''))) {
        errors.push('Extracted phone not found in CV text');
    }
    
    // Check experience consistency
    if (extractedData.experience && extractedData.experience.length > 0) {
        for (let i = 0; i < extractedData.experience.length; i++) {
            const exp = extractedData.experience[i];
            if (exp.role && !cvLower.includes(exp.role.toLowerCase())) {
                warnings.push(`Experience role "${exp.role}" not clearly found in CV`);
            }
            if (exp.company && !cvLower.includes(exp.company.toLowerCase())) {
                warnings.push(`Company "${exp.company}" not clearly found in CV`);
            }
        }
    }
    
    // Check skills consistency
    if (extractedData.skills && extractedData.skills.length > 0) {
        for (const skillGroup of extractedData.skills) {
            for (const skill of skillGroup.items) {
                if (!cvLower.includes(skill.toLowerCase())) {
                    warnings.push(`Skill "${skill}" not clearly found in CV`);
                }
            }
        }
    }
    
    return { errors, warnings };
}