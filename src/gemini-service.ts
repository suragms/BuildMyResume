/**
 * Gemini AI Service for Resume Parsing
 * Uses Google Generative AI for intelligent extraction and understanding
 */

// API Configuration - FREE TIER APIs
const GEMINI_API_KEY = 'AIzaSyAnGE8pqcrbdS_0f0jnmhVdVgGrjHEzSTw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// API Status tracking
let geminiAvailable = true;
let groqAvailable = true;
let lastGeminiError = 0;
let lastGroqError = 0;
const ERROR_COOLDOWN = 60000; // 1 minute cooldown after error

// Types
export interface ParsedResume {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    profile: string;
    skills: { category: string; items: string[] }[];
    experience: {
        role: string;
        company: string;
        startDate: string;
        endDate: string;
        bullets: string[];
    }[];
    education: {
        degree: string;
        institution: string;
        year: string;
    }[];
    projects: {
        name: string;
        description: string;
        tech: string[];
        startDate?: string;
        endDate?: string;
    }[];
}

export interface ExtractionResult {
    resume: ParsedResume;
    confidence: number;
    extractedFields: string[];
    missingFields: string[];
}

export interface JDMatchResult {
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    roleAlignment: number;
    suggestions: string[];
}

/**
 * Clean and normalize extracted text from PDF
 */
function cleanPDFText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/(\d)([A-Za-z])/g, '$1 $2')
        .replace(/([A-Za-z])(\d)/g, '$1 $2')
        .replace(/  +/g, ' ')
        .trim();
}

/**
 * Fast parsing with Groq (Llama 3.3 70B) - 2x faster than Gemini
 */
async function parseWithGroq(cleanedText: string): Promise<ExtractionResult | null> {
    const prompt = `Extract resume data as JSON. Only extract what exists, never invent.

RESUME:
${cleanedText.slice(0, 6000)}

Return JSON:
{"name":"","email":"","phone":"","linkedin":"","github":"","profile":"","skills":[{"category":"","items":[]}],"experience":[{"role":"","company":"","startDate":"","endDate":"","bullets":[]}],"education":[{"degree":"","institution":"","year":""}],"projects":[{"name":"","description":"","tech":[]}]}

Rules: Extract only existing data. Use "Present" for current jobs. Return valid JSON only.`;

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        console.error('Groq API error:', response.status);
        return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = validateParsedResume(parsed);

    const extractedFields: string[] = [];
    const missingFields: string[] = [];

    if (validated.name) extractedFields.push('Name'); else missingFields.push('Name');
    if (validated.email) extractedFields.push('Email'); else missingFields.push('Email');
    if (validated.phone) extractedFields.push('Phone'); else missingFields.push('Phone');
    if (validated.linkedin) extractedFields.push('LinkedIn');
    if (validated.github) extractedFields.push('GitHub');
    if (validated.profile) extractedFields.push('Profile');
    if (validated.skills.length > 0) extractedFields.push('Skills'); else missingFields.push('Skills');
    if (validated.experience.length > 0) extractedFields.push('Experience'); else missingFields.push('Experience');
    if (validated.education.length > 0) extractedFields.push('Education'); else missingFields.push('Education');
    if (validated.projects.length > 0) extractedFields.push('Projects');

    const confidence = (extractedFields.length / (extractedFields.length + missingFields.length)) * 100;

    return {
        resume: validated,
        confidence: Math.round(confidence),
        extractedFields,
        missingFields
    };
}

/**
 * Extract structured resume data using Gemini AI
 */
export async function parseResumeWithAI(rawText: string): Promise<ExtractionResult> {
    const cleanedText = cleanPDFText(rawText);

    // Try Groq first (faster), then Gemini, then fallback
    const now = Date.now();

    // Reset availability after cooldown
    if (!groqAvailable && (now - lastGroqError) >= ERROR_COOLDOWN) groqAvailable = true;
    if (!geminiAvailable && (now - lastGeminiError) >= ERROR_COOLDOWN) geminiAvailable = true;

    // Try Groq first (2x faster than Gemini)
    if (groqAvailable) {
        try {
            const result = await parseWithGroq(cleanedText);
            if (result) return result;
        } catch (e) {
            console.log('Groq failed, trying Gemini...');
            groqAvailable = false;
            lastGroqError = Date.now();
        }
    }

    // Fallback to Gemini
    if (!geminiAvailable && (now - lastGeminiError) < ERROR_COOLDOWN) {
        console.log('All APIs unavailable, using fallback');
        return fallbackParse(cleanedText);
    }

    // Reset Gemini after cooldown
    if (!geminiAvailable && (now - lastGeminiError) >= ERROR_COOLDOWN) {
        geminiAvailable = true;
    }

    const prompt = `You are a resume parser. Extract EXACTLY what is written in this resume text. Do NOT invent or add any information.

RESUME TEXT:
${cleanedText.slice(0, 8000)}

Extract and return a JSON object with these fields. Use empty strings/arrays if not found:

{
    "name": "Full name of the candidate",
    "email": "Email address",
    "phone": "Phone number with country code if present",
    "linkedin": "LinkedIn URL or username",
    "github": "GitHub URL or username",
    "profile": "Professional summary/objective (first 500 chars)",
    "skills": [
        {"category": "Programming Languages", "items": ["skill1", "skill2"]},
        {"category": "Frameworks", "items": ["framework1"]},
        {"category": "Tools", "items": ["tool1", "tool2"]}
    ],
    "experience": [
        {
            "role": "Job title exactly as written",
            "company": "Company name",
            "startDate": "Start date (e.g., Jan 2020, 2020, 01/2020)",
            "endDate": "End date or 'Present'",
            "bullets": ["Achievement 1", "Achievement 2"]
        }
    ],
    "education": [
        {
            "degree": "Degree name",
            "institution": "University/College name",
            "year": "Graduation year or date range"
        }
    ],
    "projects": [
        {
            "name": "Project name",
            "description": "Brief description",
            "tech": ["tech1", "tech2"],
            "startDate": "Start date if mentioned",
            "endDate": "End date if mentioned"
        }
    ]
}

CRITICAL RULES:
1. Extract ONLY what exists in the text - never invent data
2. For dates: Look for patterns like "Jan 2020 - Present", "2019-2021", "01/2020 to 12/2022"
3. If a date says "Present", "Current", "Now", "Ongoing" - use "Present"
4. Keep section headers clean - don't mix content into headers
5. Separate skills by category if the resume has categories
6. For phone: Include the full number with any country codes
7. For experience bullets: Keep achievements/responsibilities as separate items

Return ONLY valid JSON, no markdown, no explanation.`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status, await response.text());
            geminiAvailable = false;
            lastGeminiError = Date.now();
            return fallbackParse(cleanedText);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Clean the response - remove markdown code blocks if present
        let jsonStr = responseText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        // Try to extract JSON from response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('No valid JSON in response');
            return fallbackParse(cleanedText);
        }

        const parsed = JSON.parse(jsonMatch[0]) as ParsedResume;

        // Validate and clean the parsed data
        const validated = validateParsedResume(parsed);

        // Determine what was extracted vs missing
        const extractedFields: string[] = [];
        const missingFields: string[] = [];

        if (validated.name) extractedFields.push('Name');
        else missingFields.push('Name');

        if (validated.email) extractedFields.push('Email');
        else missingFields.push('Email');

        if (validated.phone) extractedFields.push('Phone');
        else missingFields.push('Phone');

        if (validated.linkedin) extractedFields.push('LinkedIn');
        if (validated.github) extractedFields.push('GitHub');

        if (validated.profile) extractedFields.push('Profile');

        if (validated.skills.length > 0 && validated.skills.some(s => s.items.length > 0)) {
            extractedFields.push('Skills');
        } else {
            missingFields.push('Skills');
        }

        if (validated.experience.length > 0) extractedFields.push('Experience');
        else missingFields.push('Experience');

        if (validated.education.length > 0) extractedFields.push('Education');
        else missingFields.push('Education');

        if (validated.projects.length > 0) extractedFields.push('Projects');

        const confidence = (extractedFields.length / (extractedFields.length + missingFields.length)) * 100;

        return {
            resume: validated,
            confidence: Math.round(confidence),
            extractedFields,
            missingFields
        };

    } catch (error) {
        console.error('AI parsing error:', error);
        geminiAvailable = false;
        lastGeminiError = Date.now();
        return fallbackParse(cleanedText);
    }
}

/**
 * Validate and clean parsed resume data
 */
function validateParsedResume(parsed: any): ParsedResume {
    const clean = (str: any): string => {
        if (typeof str !== 'string') return '';
        return str.trim();
    };

    const cleanDate = (date: any): string => {
        if (typeof date !== 'string') return '';
        const d = date.trim().toLowerCase();
        if (d.includes('present') || d.includes('current') || d.includes('now') || d.includes('ongoing')) {
            return 'Present';
        }
        return date.trim();
    };

    return {
        name: clean(parsed.name),
        email: clean(parsed.email),
        phone: clean(parsed.phone),
        linkedin: clean(parsed.linkedin),
        github: clean(parsed.github),
        profile: clean(parsed.profile).slice(0, 600),
        skills: Array.isArray(parsed.skills)
            ? parsed.skills.map((s: any) => ({
                category: clean(s.category) || 'General',
                items: Array.isArray(s.items) ? s.items.map((i: any) => clean(i)).filter(Boolean) : []
            })).filter((s: any) => s.items.length > 0)
            : [],
        experience: Array.isArray(parsed.experience)
            ? parsed.experience.map((e: any) => ({
                role: clean(e.role),
                company: clean(e.company),
                startDate: cleanDate(e.startDate),
                endDate: cleanDate(e.endDate),
                bullets: Array.isArray(e.bullets) ? e.bullets.map((b: any) => clean(b)).filter(Boolean) : []
            })).filter((e: any) => e.role || e.company)
            : [],
        education: Array.isArray(parsed.education)
            ? parsed.education.map((e: any) => ({
                degree: clean(e.degree),
                institution: clean(e.institution),
                year: clean(e.year)
            })).filter((e: any) => e.degree || e.institution)
            : [],
        projects: Array.isArray(parsed.projects)
            ? parsed.projects.map((p: any) => ({
                name: clean(p.name),
                description: clean(p.description),
                tech: Array.isArray(p.tech) ? p.tech.map((t: any) => clean(t)).filter(Boolean) : [],
                startDate: cleanDate(p.startDate),
                endDate: cleanDate(p.endDate)
            })).filter((p: any) => p.name || p.description)
            : []
    };
}

/**
 * Fallback parsing using regex patterns (no AI)
 */
function fallbackParse(text: string): ExtractionResult {
    console.log('Using fallback parser...');

    // Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const email = emailMatch ? emailMatch[1].toLowerCase() : '';

    // Phone
    const phonePatterns = [
        /(?:\+91[-\s]?)?[6-9]\d{9}/,
        /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
        /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/
    ];
    let phone = '';
    for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match) { phone = match[0]; break; }
    }

    // LinkedIn
    const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    const linkedin = linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : '';

    // GitHub
    const githubMatch = text.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
    const github = githubMatch ? `github.com/${githubMatch[1]}` : '';

    // Name - first meaningful line
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    let name = '';
    for (const line of lines.slice(0, 10)) {
        const cleaned = line.replace(/[^a-zA-Z\s]/g, '').trim();
        const words = cleaned.split(/\s+/).filter(w => w.length > 1);
        if (words.length >= 2 && words.length <= 4 && cleaned.length < 50) {
            const skipWords = ['summary', 'profile', 'experience', 'education', 'skills', 'resume'];
            if (!skipWords.some(k => cleaned.toLowerCase().includes(k))) {
                name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                break;
            }
        }
    }

    // Skills
    const skillPatterns = /\b(python|java|javascript|typescript|react|angular|vue|node\.?js|express|mongodb|sql|postgresql|mysql|aws|azure|docker|kubernetes|git|html|css|c\+\+|c#|ruby|php|swift|kotlin|go|rust|tensorflow|pytorch|django|flask|spring|next\.?js|graphql|redis)\b/gi;
    const skillMatches = text.match(skillPatterns) || [];
    const uniqueSkills = [...new Set(skillMatches.map(s => s.toLowerCase()))];

    const skills = uniqueSkills.length > 0
        ? [{ category: 'Technical Skills', items: uniqueSkills }]
        : [];

    const extractedFields: string[] = [];
    const missingFields: string[] = [];

    if (name) extractedFields.push('Name'); else missingFields.push('Name');
    if (email) extractedFields.push('Email'); else missingFields.push('Email');
    if (phone) extractedFields.push('Phone'); else missingFields.push('Phone');
    if (linkedin) extractedFields.push('LinkedIn');
    if (github) extractedFields.push('GitHub');
    if (skills.length > 0) extractedFields.push('Skills'); else missingFields.push('Skills');

    return {
        resume: {
            name, email, phone, linkedin, github,
            profile: '',
            skills,
            experience: [],
            education: [],
            projects: []
        },
        confidence: 30,
        extractedFields,
        missingFields
    };
}

/**
 * Match resume against Job Description using Groq API
 */
export async function matchResumeToJD(resume: ParsedResume, jdText: string, targetRole?: string): Promise<JDMatchResult> {
    if (!jdText.trim() && !targetRole?.trim()) {
        return {
            matchScore: 0,
            matchedSkills: [],
            missingSkills: [],
            roleAlignment: 0,
            suggestions: []
        };
    }

    const resumeText = [
        resume.profile,
        resume.skills.flatMap(s => s.items).join(', '),
        resume.experience.map(e => `${e.role} at ${e.company}: ${e.bullets.join('. ')}`).join('\n'),
        resume.projects.map(p => `${p.name}: ${p.description}`).join('\n')
    ].join('\n');

    const prompt = `Analyze how well this resume matches the job requirements.

RESUME:
${resumeText.slice(0, 3000)}

${targetRole ? `TARGET ROLE: ${targetRole}` : ''}
${jdText ? `JOB DESCRIPTION:\n${jdText.slice(0, 2000)}` : ''}

Return a JSON object:
{
    "matchScore": 0-100,
    "matchedSkills": ["skills from JD that are in resume"],
    "missingSkills": ["skills from JD that are NOT in resume"],
    "roleAlignment": 0-100,
    "suggestions": ["brief improvement suggestions"]
}

Consider semantic matches (e.g., "REST API" matches "RESTful", "AWS" matches "cloud").
Return ONLY valid JSON.`;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            console.error('Groq API error:', response.status);
            return fallbackJDMatch(resume, jdText);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return fallbackJDMatch(resume, jdText);
        }

        const result = JSON.parse(jsonMatch[0]);
        return {
            matchScore: Math.min(100, Math.max(0, result.matchScore || 0)),
            matchedSkills: Array.isArray(result.matchedSkills) ? result.matchedSkills : [],
            missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills : [],
            roleAlignment: Math.min(100, Math.max(0, result.roleAlignment || 0)),
            suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : []
        };

    } catch (error) {
        console.error('JD matching error:', error);
        return fallbackJDMatch(resume, jdText);
    }
}

/**
 * Fallback JD matching using keyword extraction
 */
function fallbackJDMatch(resume: ParsedResume, jdText: string): JDMatchResult {
    const resumeSkills = resume.skills.flatMap(s => s.items.map(i => i.toLowerCase()));
    const resumeText = [
        resume.profile,
        resume.experience.map(e => e.bullets.join(' ')).join(' '),
        resume.projects.map(p => p.description).join(' ')
    ].join(' ').toLowerCase();

    // Extract keywords from JD
    const skillPattern = /\b(python|java|javascript|typescript|react|angular|vue|node|mongodb|sql|aws|azure|docker|kubernetes|git|agile|scrum|ci\/cd|rest|api|microservices|machine learning|data science|tensorflow|pytorch|html|css|devops|linux|graphql|redis|elasticsearch)\b/gi;
    const jdSkills = [...new Set((jdText.match(skillPattern) || []).map(s => s.toLowerCase()))];

    const matched = jdSkills.filter(s => resumeSkills.includes(s) || resumeText.includes(s));
    const missing = jdSkills.filter(s => !matched.includes(s));

    const matchScore = jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 100) : 0;

    return {
        matchScore,
        matchedSkills: matched,
        missingSkills: missing,
        roleAlignment: matchScore,
        suggestions: missing.length > 0 ? [`Consider adding: ${missing.slice(0, 3).join(', ')}`] : []
    };
}

/**
 * Determine what validation issues are REAL (not just extraction misses)
 */
export function getSmartValidationIssues(result: ExtractionResult): {
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
} {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];
    const r = result.resume;

    // ONLY flag as error if we extracted something invalid, not if it's missing
    // Missing items are shown as "missing" in extraction status, not as validation errors

    // Name - only error if extracted but invalid
    if (r.name && r.name.length < 2) {
        errors.push({ field: 'name', message: 'Name is too short' });
    }

    // Email - only error if extracted but invalid format
    if (r.email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(r.email)) {
            errors.push({ field: 'email', message: 'Invalid email format' });
        }
    }

    // Phone - only warning if extracted but seems invalid
    if (r.phone) {
        const phoneClean = r.phone.replace(/[\s\-\(\)\.+]/g, '');
        if (phoneClean.length < 10 || phoneClean.length > 15) {
            warnings.push({ field: 'phone', message: 'Phone number format may be incorrect' });
        }
    }

    // Experience dates - check for valid ranges
    r.experience.forEach((exp, i) => {
        // Check if this is part-time experience
        const isPartTime = /part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(exp.role + ' ' + exp.company);

        if (exp.startDate && exp.endDate && exp.endDate.toLowerCase() !== 'present') {
            // Only validate if both dates exist
            const startYear = extractYear(exp.startDate);
            const endYear = extractYear(exp.endDate);
            if (startYear && endYear && startYear > endYear) {
                errors.push({
                    field: `exp_${i}_date`,
                    message: `${exp.role || 'Experience'}: End date is before start date`
                });
            }
        }

        // Don't show warning for part-time experience when user has other full-time experience
        const hasFullTimeExp = r.experience.some(e => !/part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(e.role + ' ' + e.company));

        if (exp.role && exp.bullets.length === 0 && !isPartTime) {
            warnings.push({
                field: `exp_${i}_bullets`,
                message: `${exp.role}: Consider adding achievements`
            });
        }
    });

    // Check for profile inconsistencies (e.g., saying "fresher" but having 10 years exp)
    const profileText = r.profile.toLowerCase();
    const totalYears = r.experience.reduce((sum, exp) => {
        const isPartTime = /part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(exp.role + ' ' + exp.company);
        const startYear = extractYear(exp.startDate);
        const endYear = exp.endDate.toLowerCase() === 'present' ? new Date().getFullYear() : extractYear(exp.endDate);
        if (startYear && endYear) {
            const years = Math.max(0, endYear - startYear);
            return sum + (isPartTime ? years * 0.5 : years);
        }
        return sum;
    }, 0);

    if ((profileText.includes('fresher') || profileText.includes('entry')) && totalYears > 2) {
        warnings.push({
            field: 'profile',
            message: 'Profile says "fresher" but you have significant experience'
        });
    }

    if ((profileText.includes('senior') || profileText.includes('lead')) && totalYears < 5) {
        warnings.push({
            field: 'profile',
            message: 'Profile says "senior" but experience seems limited'
        });
    }

    return { errors, warnings };
}

function extractYear(dateStr: string): number | null {
    const match = dateStr.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : null;
}

/**
 * Detect profile type (fresher/intern/professional/senior)
 */
export function detectProfileType(resume: ParsedResume): { type: string; years: number; reason: string } {
    let totalYears = 0;
    const now = new Date();
    const currentYear = now.getFullYear();

    for (const exp of resume.experience) {
        // Check if this is part-time/internship experience
        const isPartTime = /part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(exp.role + ' ' + exp.company);

        const startYear = extractYear(exp.startDate);
        let endYear = exp.endDate.toLowerCase() === 'present' ? currentYear : extractYear(exp.endDate);

        if (startYear && endYear) {
            const years = Math.max(0, endYear - startYear);
            // Only count 100% of full-time experience, 50% of part-time
            totalYears += isPartTime ? years * 0.5 : years;
        }
    }

    const expText = resume.experience.map(e => e.role).join(' ').toLowerCase();

    if (totalYears >= 8 || /director|vp|head of|principal|architect/i.test(expText)) {
        return { type: 'senior', years: Math.round(totalYears * 10) / 10, reason: totalYears >= 8 ? `${Math.round(totalYears * 10) / 10} years of experience` : 'Leadership role' };
    }
    if (totalYears >= 3 || /senior|lead|manager/i.test(expText)) {
        return { type: 'professional', years: Math.round(totalYears * 10) / 10, reason: `${Math.round(totalYears * 10) / 10} years of experience` };
    }
    if (/intern|trainee|apprentice/i.test(expText)) {
        return { type: 'intern', years: Math.round(totalYears * 10) / 10, reason: 'Internship or training role' };
    }
    return { type: 'fresher', years: Math.round(totalYears * 10) / 10, reason: totalYears > 0 ? `${Math.round(totalYears * 10) / 10} years experience` : 'Entry-level' };
}
