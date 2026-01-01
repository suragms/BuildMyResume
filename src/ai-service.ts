/**
 * HexaStack AI Service
 * Uses HuggingFace API for grammar checking and keyword extraction
 */

// Token should be set via environment variable or admin settings
let HF_TOKEN = '';
const HF_API = 'https://api-inference.huggingface.co/models';

// Set token (called from admin panel)
export function setHFToken(token: string) {
    HF_TOKEN = token;
}

// Cache results to avoid repeated API calls
const cache = new Map<string, any>();

interface GrammarResult {
    original: string;
    corrected: string;
    hasErrors: boolean;
    corrections: { original: string; suggestion: string; }[];
}

interface KeywordResult {
    keywords: string[];
    skills: string[];
    requirements: string[];
}

interface ATSMatch {
    keyword: string;
    found: boolean;
    section?: string;
}

/**
 * Extract keywords from Job Description using zero-shot classification
 */
export async function extractKeywords(jd: string): Promise<KeywordResult> {
    if (!jd.trim()) {
        return { keywords: [], skills: [], requirements: [] };
    }

    const cacheKey = `kw_${jd.slice(0, 100)}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        // Use keyword extraction via token classification
        const response = await fetch(`${HF_API}/yanekyuk/bert-uncased-keyword-extractor`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: jd.slice(0, 1000) })
        });

        if (!response.ok) {
            console.warn('Keyword API failed, using fallback');
            return extractKeywordsFallback(jd);
        }

        const data = await response.json();
        
        // Process token classification results
        const keywords: string[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.entity_group === 'KEY' || item.score > 0.5) {
                    keywords.push(item.word.replace(/##/g, ''));
                }
            }
        }

        // Also use fallback to ensure we get skills
        const fallback = extractKeywordsFallback(jd);
        
        const result = {
            keywords: [...new Set([...keywords, ...fallback.keywords])].slice(0, 20),
            skills: fallback.skills,
            requirements: fallback.requirements
        };

        cache.set(cacheKey, result);
        return result;

    } catch (error) {
        console.error('Keyword extraction error:', error);
        return extractKeywordsFallback(jd);
    }
}

/**
 * Fallback keyword extraction using pattern matching
 */
function extractKeywordsFallback(jd: string): KeywordResult {
    // Common tech skills patterns
    const skillPatterns = [
        /\b(python|java|javascript|typescript|react|angular|vue|node\.?js|express|mongodb|sql|postgresql|mysql|aws|azure|gcp|docker|kubernetes|git|html|css|c\+\+|c#|ruby|php|swift|kotlin|go|rust|scala|r\b|matlab|tensorflow|pytorch|keras|scikit-learn|pandas|numpy|flask|django|spring|laravel|rails|graphql|redis|elasticsearch|kafka|spark|hadoop|tableau|power\s?bi|excel|figma|sketch|photoshop|illustrator|jira|confluence|agile|scrum|ci\/cd|jenkins|github\s?actions|terraform|ansible|linux|unix|bash|powershell|api|rest|soap|microservices|serverless|machine\s?learning|deep\s?learning|nlp|computer\s?vision|data\s?science|data\s?analysis|etl|bi|devops|sre|frontend|backend|fullstack|mobile|ios|android)\b/gi
    ];

    // Experience level patterns
    const experiencePatterns = [
        /(\d+)\+?\s*years?/gi,
        /entry[\s-]?level/gi,
        /senior/gi,
        /junior/gi,
        /mid[\s-]?level/gi,
        /lead/gi,
        /principal/gi,
        /staff/gi,
        /fresher/gi
    ];

    // Soft skills
    const softSkillPatterns = [
        /\b(communication|leadership|teamwork|problem[\s-]?solving|analytical|creative|detail[\s-]?oriented|time\s?management|collaboration|adaptability|critical\s?thinking)\b/gi
    ];

    const skills: string[] = [];
    const requirements: string[] = [];
    const keywords: string[] = [];

    // Extract skills
    for (const pattern of skillPatterns) {
        const matches = jd.match(pattern);
        if (matches) {
            skills.push(...matches.map(m => m.toLowerCase()));
        }
    }

    // Extract soft skills
    for (const pattern of softSkillPatterns) {
        const matches = jd.match(pattern);
        if (matches) {
            skills.push(...matches.map(m => m.toLowerCase()));
        }
    }

    // Extract experience requirements
    for (const pattern of experiencePatterns) {
        const matches = jd.match(pattern);
        if (matches) {
            requirements.push(...matches);
        }
    }

    // Extract important nouns/phrases as keywords
    const sentences = jd.split(/[.!?]/);
    for (const sentence of sentences) {
        // Look for "required", "must have", "preferred", etc.
        if (/required|must|should|preferred|experience with|knowledge of|familiar with/i.test(sentence)) {
            const words = sentence.match(/\b[A-Z][a-zA-Z0-9+#.]+\b/g);
            if (words) {
                keywords.push(...words);
            }
        }
    }

    return {
        keywords: [...new Set(keywords)].slice(0, 15),
        skills: [...new Set(skills)].slice(0, 20),
        requirements: [...new Set(requirements)].slice(0, 10)
    };
}

/**
 * Check grammar using HuggingFace grammar correction model
 */
export async function checkGrammar(text: string): Promise<GrammarResult> {
    if (!text.trim() || text.length < 10) {
        return { original: text, corrected: text, hasErrors: false, corrections: [] };
    }

    const cacheKey = `gr_${text.slice(0, 100)}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        // Use T5 grammar correction model
        const response = await fetch(`${HF_API}/vennify/t5-base-grammar-correction`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                inputs: `grammar: ${text.slice(0, 500)}`,
                parameters: { max_length: 512 }
            })
        });

        if (!response.ok) {
            console.warn('Grammar API failed');
            return { original: text, corrected: text, hasErrors: false, corrections: [] };
        }

        const data = await response.json();
        const corrected = data[0]?.generated_text || text;

        // Find differences
        const corrections = findCorrections(text, corrected);

        const result = {
            original: text,
            corrected,
            hasErrors: corrections.length > 0,
            corrections
        };

        cache.set(cacheKey, result);
        return result;

    } catch (error) {
        console.error('Grammar check error:', error);
        return { original: text, corrected: text, hasErrors: false, corrections: [] };
    }
}

/**
 * Find differences between original and corrected text
 */
function findCorrections(original: string, corrected: string): { original: string; suggestion: string }[] {
    const corrections: { original: string; suggestion: string }[] = [];
    
    const origWords = original.split(/\s+/);
    const corrWords = corrected.split(/\s+/);
    
    const maxLen = Math.min(origWords.length, corrWords.length);
    
    for (let i = 0; i < maxLen; i++) {
        if (origWords[i].toLowerCase() !== corrWords[i].toLowerCase()) {
            corrections.push({
                original: origWords[i],
                suggestion: corrWords[i]
            });
        }
    }

    return corrections.slice(0, 10);
}

/**
 * Match resume content against JD keywords
 */
export function matchATSKeywords(resumeText: string, jdKeywords: KeywordResult): ATSMatch[] {
    const text = resumeText.toLowerCase();
    const matches: ATSMatch[] = [];

    // Check skills
    for (const skill of jdKeywords.skills) {
        const found = text.includes(skill.toLowerCase());
        matches.push({ keyword: skill, found, section: 'skills' });
    }

    // Check keywords
    for (const kw of jdKeywords.keywords) {
        const found = text.includes(kw.toLowerCase());
        if (!matches.some(m => m.keyword.toLowerCase() === kw.toLowerCase())) {
            matches.push({ keyword: kw, found, section: 'content' });
        }
    }

    return matches;
}

/**
 * Calculate ATS score based on keyword matches
 */
export function calculateATSScore(matches: ATSMatch[]): number {
    if (matches.length === 0) return 0;
    const found = matches.filter(m => m.found).length;
    return Math.round((found / matches.length) * 100);
}

/**
 * Detect if resume is for fresher or experienced candidate
 */
export function detectExperienceLevel(resume: {
    experience: string;
    education: string;
    projects: string;
}): 'fresher' | 'experienced' | 'unknown' {
    const expText = (resume.experience || '').toLowerCase();
    
    // Check for years of experience
    const yearsMatch = expText.match(/(\d+)\+?\s*years?/);
    if (yearsMatch) {
        const years = parseInt(yearsMatch[1]);
        if (years >= 2) return 'experienced';
    }

    // Check for job titles indicating experience
    const seniorTitles = /senior|lead|manager|principal|architect|director|head of/i;
    if (seniorTitles.test(expText)) return 'experienced';

    // Check for fresher indicators
    const fresherIndicators = /intern|trainee|fresher|graduate|entry.?level|campus|college/i;
    const combinedText = `${expText} ${resume.education} ${resume.projects}`.toLowerCase();
    
    if (fresherIndicators.test(combinedText)) return 'fresher';

    // If has significant experience content, likely experienced
    if (resume.experience && resume.experience.length > 200) return 'experienced';

    // If mostly projects and education, likely fresher
    if (resume.projects && resume.projects.length > resume.experience.length) return 'fresher';

    return 'unknown';
}

/**
 * Get missing sections that should be filled
 */
export function getMissingSections(resume: {
    name: string;
    email: string;
    phone: string;
    profile: string;
    skills: string[];
    experience: string;
    education: string;
    projects: string;
}, experienceLevel: 'fresher' | 'experienced' | 'unknown'): string[] {
    const missing: string[] = [];

    // Essential for everyone
    if (!resume.name) missing.push('Name is required');
    if (!resume.email) missing.push('Email is required');
    if (!resume.phone) missing.push('Phone number is recommended');
    if (resume.skills.length === 0) missing.push('Add your skills');

    if (experienceLevel === 'fresher') {
        // Freshers need education and projects
        if (!resume.education) missing.push('Education is essential for freshers');
        if (!resume.projects) missing.push('Add projects to showcase your skills');
        if (!resume.profile) missing.push('Add a brief profile summary');
    } else {
        // Experienced need work history
        if (!resume.experience) missing.push('Work experience is essential');
        if (!resume.profile) missing.push('Add a professional summary');
    }

    return missing;
}

export type { GrammarResult, KeywordResult, ATSMatch };
