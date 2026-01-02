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

/**
 * 10-Layer Validation System
 */
export interface ValidationResult {
    layer: number;
    name: string;
    passed: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

export function runValidation(resume: {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    profile: string;
    skills: string[];
    experience: string;
    education: string;
    projects: string;
    achievements: string;
}, experienceLevel: 'fresher' | 'experienced' | 'unknown'): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Layer 1: Section Completeness
    const layer1 = checkSectionCompleteness(resume, experienceLevel);
    results.push({ layer: 1, name: 'Section Completeness', ...layer1 });

    // Layer 2: Grammar & Clarity (simplified - no AI)
    const layer2 = checkBasicClarity(resume);
    results.push({ layer: 2, name: 'Clarity Check', ...layer2 });

    // Layer 3: Consistency
    const layer3 = checkConsistency(resume);
    results.push({ layer: 3, name: 'Consistency', ...layer3 });

    // Layer 4: Length Balance
    const layer4 = checkLengthBalance(resume);
    results.push({ layer: 4, name: 'Length Balance', ...layer4 });

    // Layer 5: Skill Relevance
    const layer5 = checkSkillRelevance(resume);
    results.push({ layer: 5, name: 'Skill Relevance', ...layer5 });

    // Layer 6: Redundancy
    const layer6 = checkRedundancy(resume);
    results.push({ layer: 6, name: 'Redundancy Check', ...layer6 });

    // Layer 7: Formatting Readiness
    const layer7 = checkFormattingReadiness(resume);
    results.push({ layer: 7, name: 'Formatting', ...layer7 });

    // Layer 8: Contact Info
    const layer8 = checkContactInfo(resume);
    results.push({ layer: 8, name: 'Contact Info', ...layer8 });

    // Layer 9: Visual Hierarchy
    const layer9 = checkVisualHierarchy(resume, experienceLevel);
    results.push({ layer: 9, name: 'Structure', ...layer9 });

    // Layer 10: Final Sanity
    const passedCount = results.filter(r => r.passed).length;
    const layer10: { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } = {
        passed: passedCount >= 7,
        message: passedCount >= 7 
            ? 'Resume looks professional and ready' 
            : `${10 - passedCount} issues need attention`,
        severity: passedCount >= 7 ? 'info' : 'warning'
    };
    results.push({ layer: 10, name: 'Final Check', ...layer10 });

    return results;
}

function checkSectionCompleteness(resume: any, level: string): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    const required = ['name', 'email'];
    const missing = required.filter(k => !resume[k]);
    
    if (missing.length > 0) {
        return { passed: false, message: `Missing: ${missing.join(', ')}`, severity: 'error' };
    }
    if (resume.skills.length === 0) {
        return { passed: false, message: 'Add at least one skill', severity: 'error' };
    }
    return { passed: true, message: 'All required sections present', severity: 'info' };
}

function checkBasicClarity(resume: any): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    const text = `${resume.profile} ${resume.experience}`;
    if (text.length < 50) {
        return { passed: true, message: 'Content looks clear', severity: 'info' };
    }
    
    // Check for very long sentences
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
    const longSentences = sentences.filter(s => s.split(' ').length > 40);
    
    if (longSentences.length > 0) {
        return { passed: false, message: 'Some sentences are too long', severity: 'warning' };
    }
    return { passed: true, message: 'Text clarity is good', severity: 'info' };
}

function checkConsistency(resume: any): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    // Check date format consistency
    const text = `${resume.experience} ${resume.education}`;
    const datePatterns = [
        text.match(/\d{4}\s*-\s*\d{4}/g)?.length || 0,
        text.match(/\d{2}\/\d{4}/g)?.length || 0,
        text.match(/[A-Z][a-z]+\s+\d{4}/g)?.length || 0
    ];
    
    const usedFormats = datePatterns.filter(p => p > 0).length;
    if (usedFormats > 1) {
        return { passed: false, message: 'Inconsistent date formats', severity: 'warning' };
    }
    return { passed: true, message: 'Formatting is consistent', severity: 'info' };
}

function checkLengthBalance(resume: any): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    if (resume.profile && resume.profile.length > 500) {
        return { passed: false, message: 'Profile summary is too long', severity: 'warning' };
    }
    
    const totalLength = Object.values(resume).reduce((sum: number, val) => {
        if (typeof val === 'string') return sum + val.length;
        if (Array.isArray(val)) return sum + val.join(' ').length;
        return sum;
    }, 0);
    
    if (totalLength < 200) {
        return { passed: false, message: 'Resume content is too short', severity: 'warning' };
    }
    if (totalLength > 5000) {
        return { passed: false, message: 'Resume might be too detailed', severity: 'warning' };
    }
    
    return { passed: true, message: 'Content length is appropriate', severity: 'info' };
}

function checkSkillRelevance(resume: any): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    if (resume.skills.length === 0) {
        return { passed: false, message: 'No skills listed', severity: 'error' };
    }
    if (resume.skills.length > 25) {
        return { passed: false, message: 'Too many skills listed', severity: 'warning' };
    }
    return { passed: true, message: 'Skills section looks good', severity: 'info' };
}

function checkRedundancy(resume: any): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    // Check for duplicate skills
    const lowerSkills = resume.skills.map((s: string) => s.toLowerCase());
    const uniqueSkills = new Set(lowerSkills);
    
    if (uniqueSkills.size < lowerSkills.length) {
        return { passed: false, message: 'Duplicate skills found', severity: 'warning' };
    }
    return { passed: true, message: 'No obvious redundancy', severity: 'info' };
}

function checkFormattingReadiness(resume: any): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    const text = `${resume.experience} ${resume.projects}`;
    const bulletPoints = (text.match(/^[-•*]/gm) || []).length;
    const lines = text.split('\n').length;
    
    if (lines > 5 && bulletPoints < 2) {
        return { passed: false, message: 'Consider using bullet points', severity: 'info' };
    }
    return { passed: true, message: 'Ready for PDF formatting', severity: 'info' };
}

function checkContactInfo(resume: any): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    if (!resume.email) {
        return { passed: false, message: 'Email is required', severity: 'error' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resume.email)) {
        return { passed: false, message: 'Invalid email format', severity: 'error' };
    }
    
    if (!resume.phone && !resume.linkedin) {
        return { passed: false, message: 'Add phone or LinkedIn', severity: 'warning' };
    }
    
    return { passed: true, message: 'Contact info complete', severity: 'info' };
}

function checkVisualHierarchy(resume: any, level: string): { passed: boolean; message: string; severity: 'error' | 'warning' | 'info' } {
    if (level === 'fresher') {
        if (!resume.education && !resume.projects) {
            return { passed: false, message: 'Freshers need education or projects', severity: 'warning' };
        }
    } else {
        if (!resume.experience) {
            return { passed: false, message: 'Experience section needed', severity: 'warning' };
        }
    }
    return { passed: true, message: 'Structure appropriate for profile', severity: 'info' };
}

/**
 * Semantic Analysis Types and Functions
 */
export interface SemanticAnalysis {
    sentences: {
        text: string;
        type: 'action' | 'responsibility' | 'achievement' | 'neutral';
        impactScore: number;
        skills: string[];
        tools: string[];
    }[];
    skillLevels: { skill: string; level: 'beginner' | 'intermediate' | 'advanced' }[];
    weakPhrases: string[];
}

export interface JDMatchResult {
    score: number;
    missingSkills: string[];
    strongMatches: string[];
    semanticMatches: { jdPhrase: string; resumePhrase: string; similarity: number }[];
}

export interface QualityGateResult {
    name: string;
    passed: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
}

/**
 * Analyze resume semantically - detect action vs responsibility, impact, skills
 */
export async function analyzeResumeSemantic(resume: {
    profile: string;
    experience: string;
    projects: string;
}): Promise<SemanticAnalysis> {
    const text = `${resume.profile} ${resume.experience} ${resume.projects}`;
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
    
    const analyzed = sentences.slice(0, 20).map(s => {
        const t = s.trim();
        // Detect sentence type
        let type: 'action' | 'responsibility' | 'achievement' | 'neutral' = 'neutral';
        if (/^(developed|built|created|implemented|designed|led|managed|achieved|increased|reduced|improved|launched|delivered)/i.test(t)) {
            type = 'action';
        } else if (/responsible for|duties include|worked on|assisted with/i.test(t)) {
            type = 'responsibility';
        } else if (/awarded|recognized|achieved|won|increased.*by|reduced.*by|improved.*by/i.test(t)) {
            type = 'achievement';
        }
        
        // Impact score based on quantifiable metrics
        let impactScore = 50;
        if (/\d+%|\d+x|\$\d+|\d+ (users|clients|customers|projects)/i.test(t)) impactScore = 90;
        else if (type === 'action') impactScore = 70;
        else if (type === 'responsibility') impactScore = 40;
        
        // Extract skills and tools
        const skillPattern = /\b(python|java|javascript|typescript|react|angular|vue|node|mongodb|sql|aws|azure|docker|kubernetes|git)\b/gi;
        const skills = (t.match(skillPattern) || []).map(s => s.toLowerCase());
        
        return { text: t, type, impactScore, skills, tools: skills };
    });
    
    // Detect skill levels from context
    const skillMentions = new Map<string, number>();
    analyzed.forEach(s => s.skills.forEach(skill => {
        skillMentions.set(skill, (skillMentions.get(skill) || 0) + 1);
    }));
    
    const skillLevels = Array.from(skillMentions.entries()).map(([skill, count]) => ({
        skill,
        level: count >= 3 ? 'advanced' : count >= 2 ? 'intermediate' : 'beginner' as 'beginner' | 'intermediate' | 'advanced'
    }));
    
    // Find weak phrases
    const weakPatterns = [
        'worked on', 'helped with', 'assisted', 'was responsible for',
        'participated in', 'was involved in', 'dealt with'
    ];
    const weakPhrases = weakPatterns.filter(p => text.toLowerCase().includes(p));
    
    return { sentences: analyzed, skillLevels, weakPhrases };
}

/**
 * Match resume against JD using semantic similarity (not just keywords)
 */
export async function matchJDSemantic(resume: {
    profile: string;
    skills: string[];
    experience: string;
    projects: string;
}, jd: string): Promise<JDMatchResult> {
    const resumeText = `${resume.profile} ${resume.skills.join(' ')} ${resume.experience} ${resume.projects}`.toLowerCase();
    const jdLower = jd.toLowerCase();
    
    // Extract JD requirements
    const jdKeywords = extractKeywordsFallback(jd);
    
    // Semantic matching pairs (JD term -> Resume equivalents)
    const semanticMap: Record<string, string[]> = {
        'restful': ['rest', 'api', 'fastapi', 'express', 'flask', 'endpoints'],
        'ci/cd': ['jenkins', 'github actions', 'gitlab', 'devops', 'deployment', 'pipeline'],
        'cloud': ['aws', 'azure', 'gcp', 'ec2', 's3', 'lambda', 'serverless'],
        'database': ['sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'dynamodb'],
        'frontend': ['react', 'angular', 'vue', 'javascript', 'typescript', 'html', 'css'],
        'backend': ['node', 'python', 'java', 'express', 'django', 'spring', 'api'],
        'agile': ['scrum', 'sprint', 'jira', 'kanban', 'standup'],
        'testing': ['unit test', 'jest', 'pytest', 'mocha', 'selenium', 'qa']
    };
    
    const strongMatches: string[] = [];
    const missingSkills: string[] = [];
    const semanticMatches: { jdPhrase: string; resumePhrase: string; similarity: number }[] = [];
    
    // Check direct skill matches
    for (const skill of jdKeywords.skills) {
        if (resumeText.includes(skill.toLowerCase())) {
            strongMatches.push(skill);
        } else {
            // Check semantic equivalents
            let found = false;
            for (const [key, equivalents] of Object.entries(semanticMap)) {
                if (skill.toLowerCase().includes(key) || key.includes(skill.toLowerCase())) {
                    for (const eq of equivalents) {
                        if (resumeText.includes(eq)) {
                            strongMatches.push(skill);
                            semanticMatches.push({ jdPhrase: skill, resumePhrase: eq, similarity: 0.8 });
                            found = true;
                            break;
                        }
                    }
                }
                if (found) break;
            }
            if (!found) missingSkills.push(skill);
        }
    }
    
    // Calculate score
    const totalSkills = jdKeywords.skills.length || 1;
    const score = Math.round((strongMatches.length / totalSkills) * 100);
    
    return { score, missingSkills, strongMatches, semanticMatches };
}

/**
 * Quality Gates - Run before PDF export
 */
export async function runQualityGates(resume: {
    name: string;
    email: string;
    phone: string;
    profile: string;
    skills: string[];
    experience: string;
    education: string;
    projects: string;
}, jdMatch: JDMatchResult | null): Promise<QualityGateResult[]> {
    const gates: QualityGateResult[] = [];
    
    // Gate 1: Grammar pass (simplified)
    const text = `${resume.profile} ${resume.experience}`;
    const hasBasicGrammarIssues = /\s{2,}|[a-z]\.[A-Z]/.test(text);
    gates.push({
        name: 'Grammar Check',
        passed: !hasBasicGrammarIssues,
        message: hasBasicGrammarIssues ? 'Minor grammar issues detected' : 'Grammar looks good',
        severity: hasBasicGrammarIssues ? 'warning' : 'info'
    });
    
    // Gate 2: ATS readability
    const hasSpecialChars = /[^\w\s.,;:!?@()\-\'"]/g.test(text);
    gates.push({
        name: 'ATS Readability',
        passed: !hasSpecialChars,
        message: hasSpecialChars ? 'Some characters may not parse well in ATS' : 'ATS-friendly format',
        severity: hasSpecialChars ? 'warning' : 'info'
    });
    
    // Gate 3: Section completeness
    const requiredSections = ['name', 'email', 'skills'];
    const missing = requiredSections.filter(s => {
        if (s === 'skills') return resume.skills.length === 0;
        return !(resume as any)[s];
    });
    gates.push({
        name: 'Section Completeness',
        passed: missing.length === 0,
        message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All required sections present',
        severity: missing.length > 0 ? 'error' : 'info'
    });
    
    // Gate 4: Page balance (content length)
    const totalLength = Object.values(resume).reduce((sum: number, val) => {
        if (typeof val === 'string') return sum + val.length;
        if (Array.isArray(val)) return sum + val.join(' ').length;
        return sum;
    }, 0);
    const balanced = totalLength >= 300 && totalLength <= 5000;
    gates.push({
        name: 'Page Balance',
        passed: balanced,
        message: totalLength < 300 ? 'Resume is too short' : totalLength > 5000 ? 'Resume might be too long' : 'Good content length',
        severity: balanced ? 'info' : 'warning'
    });
    
    // Gate 5: JD Coverage (if JD provided)
    if (jdMatch) {
        gates.push({
            name: 'JD Coverage',
            passed: jdMatch.score >= 50,
            message: `${jdMatch.score}% keyword match with job description`,
            severity: jdMatch.score < 30 ? 'warning' : 'info'
        });
    }
    
    // Gate 6: No sentence fluff
    const fluffPatterns = /very|really|just|basically|actually|honestly|literally/gi;
    const fluffCount = (text.match(fluffPatterns) || []).length;
    gates.push({
        name: 'Concise Writing',
        passed: fluffCount < 3,
        message: fluffCount >= 3 ? 'Remove filler words for impact' : 'Writing is concise',
        severity: fluffCount >= 3 ? 'warning' : 'info'
    });
    
    return gates;
}

export type { GrammarResult, KeywordResult, ATSMatch };
