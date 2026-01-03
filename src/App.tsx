import { useState, useEffect, useCallback } from 'react';
<<<<<<< HEAD
import { Download, Check, X, FileText, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle, Loader, Upload, Settings, Maximize } from 'lucide-react';
=======
import { Download, Check, X, FileText, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle, Loader, Upload, Target, Calendar, Briefcase, GraduationCap, Code, Settings } from 'lucide-react';
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
import './index.css';
import './design_overrides.css';
import { parseResumeWithAI, matchResumeToJD, getSmartValidationIssues, detectProfileType, type ParsedResume, type ExtractionResult, type JDMatchResult } from './gemini-service';
import { buildRAGContext, runRAGAnalysis, validateCVContent } from './rag-service';
// import { Hero } from './components/Hero';

// =====================================================
// CANONICAL RESUME MODEL
// =====================================================
interface CanonicalResume {
    header: { name: string; email: string; phone: string; linkedin: string; github: string };
    profile: string;
    experience: { id: string; company: string; role: string; startDate: string; endDate: string; bullets: string[] }[];
    education: { id: string; degree: string; institution: string; year: string }[];
    skills: { category: string; items: string[] }[];
    projects: { id: string; name: string; description: string; tech: string[] }[];
    photo: string | null;
    meta: { experienceYears: number; profileLevel: string; profileReason: string };
}

interface ValidationIssue {
    id: string;
    type: 'ERROR' | 'WARNING';
    section: string;
    context: string;
    message: string;
    field: string;
    fixOptions?: { label: string; value: string }[];
}

interface TemplateSchema {
    id: string;
    name: string;
    price: number;
    tag: string;
    columns: 1 | 2;
    colors: { primary: string; text: string };
    atsScore: number;
}

const TEMPLATES: TemplateSchema[] = [
    { id: 'classic', name: 'Classic', price: 0, tag: 'ATS Optimized', columns: 1, colors: { primary: '#1a1a1a', text: '#374151' }, atsScore: 95 },
    { id: 'minimal', name: 'Minimal', price: 0, tag: 'Single Column', columns: 1, colors: { primary: '#111827', text: '#4b5563' }, atsScore: 98 },
    { id: 'modern', name: 'Modern', price: 19, tag: 'Two Column', columns: 2, colors: { primary: '#1e40af', text: '#1f2937' }, atsScore: 88 },
    { id: 'executive', name: 'Executive', price: 49, tag: 'Premium', columns: 2, colors: { primary: '#0c4a6e', text: '#1e293b' }, atsScore: 85 }
];

type Step = 'upload' | 'targeting' | 'validate' | 'template' | 'download';

const A4_HEIGHT = 1123;
const PAGE_PADDING = 112;
const USABLE_HEIGHT = A4_HEIGHT - PAGE_PADDING;

export default function App() {
    const [step, setStep] = useState<Step>('upload');
    const [processing, setProcessing] = useState(false);
    const [processingText, setProcessingText] = useState('');

    const [resume, setResume] = useState<CanonicalResume>({
        header: { name: '', email: '', phone: '', linkedin: '', github: '' },
        profile: '', experience: [], education: [], skills: [], projects: [], photo: null,
        meta: { experienceYears: 0, profileLevel: 'fresher', profileReason: '' }
    });

    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [targetingEnabled, setTargetingEnabled] = useState(false);
    const [jd, setJd] = useState('');
<<<<<<< HEAD
    const [targetRole, setTargetRole] = useState('');
    const [jdAnalysis, setJdAnalysis] = useState<JDMatchResult | null>(null);
    const [aiExtractionResult, setAiExtractionResult] = useState<ExtractionResult | null>(null);
=======
    const [jdMatch, setJdMatch] = useState<{ score: number; matched: string[]; missing: string[] } | null>(null);
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
    const [template, setTemplate] = useState('classic');
    const [paid, setPaid] = useState(false);
    const [pages, setPages] = useState<any[][]>([]);
    const [activePage, setActivePage] = useState(0);
    const [editingIssue, setEditingIssue] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // Parse date helper
    const parseDate = (d: string): Date | null => {
        if (!d) return null;
        let m = d.match(/(\d{2})\/(\d{4})/);
        if (m) return new Date(parseInt(m[2]), parseInt(m[1]) - 1);
        m = d.match(/(\w+)\s+(\d{4})/);
        if (m) {
            const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
            const mo = months[m[1].toLowerCase().slice(0, 3)];
            if (mo !== undefined) return new Date(parseInt(m[2]), mo);
        }
        m = d.match(/(\d{4})/);
        if (m) return new Date(parseInt(m[1]), 0);
        return null;
    };

    // Validate resume
    const validate = useCallback((r: CanonicalResume): ValidationIssue[] => {
        const issues: ValidationIssue[] = [];

<<<<<<< HEAD
    const calculateYearsExp = (experiences: Experience[]): number => {
        let total = 0;
        for (const exp of experiences) {
            // Check if this is part-time experience
            const isPartTime = /part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(exp.role + ' ' + exp.company);
            const start = parseDate(exp.startDate);
            const end = exp.endDate.toLowerCase() === 'present' ? new Date() : parseDate(exp.endDate);
            if (start && end) {
                const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
                // Count part-time experience as 50% of full-time
                total += isPartTime ? years * 0.5 : years;
            }
        }
        return Math.round(total * 10) / 10;
    };

    // ============== FILTER EMPTY EXPERIENCES ==============
    const filterEmptyExperiences = (experiences: Experience[]): Experience[] => {
        return experiences.filter(exp =>
            exp.role.trim() ||
            exp.company.trim() ||
            (exp.bullets && exp.bullets.some(b => b.trim())) ||
            exp.startDate.trim() ||
            exp.endDate.trim()
        );
    };

    // ============== HARD VALIDATION ==============
    const runHardValidation = useCallback((r: Resume): ValidationError[] => {
        const errors: ValidationError[] = [];

        // Required fields - Name
        if (!r.name || !r.name.trim()) {
            errors.push({ field: 'name', type: 'error', message: '❌ Name is required', fixable: true });
        } else if (r.name.trim().length < 2) {
            errors.push({ field: 'name', type: 'error', message: '❌ Name is too short', fixable: true });
        } else if (r.name.trim().length > 100) {
            errors.push({ field: 'name', type: 'warning', message: '⚠️ Name seems too long', fixable: true });
        }

        // Required fields - Email
        if (!r.email || !r.email.trim()) {
            errors.push({ field: 'email', type: 'error', message: '❌ Email is required', fixable: true });
        } else {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(r.email.trim())) {
                errors.push({ field: 'email', type: 'error', message: '❌ Invalid email format', fixable: true });
            }
        }

        // Phone validation
        if (!r.phone || !r.phone.trim()) {
            errors.push({ field: 'phone', type: 'warning', message: '⚠️ Phone number recommended', fixable: true });
        } else {
            const phoneClean = r.phone.replace(/[\s\-\(\)\.]/g, '');
            if (!/^\+?\d{10,15}$/.test(phoneClean)) {
                errors.push({ field: 'phone', type: 'error', message: '❌ Invalid phone format (10-15 digits)', fixable: true });
            }
        }

        // Experience validation - only validate non-empty experiences
        const validExperiences = filterEmptyExperiences(r.experience);

        if (validExperiences.length === 0) {
            errors.push({ field: 'experience', type: 'warning', message: '⚠️ No work experience found', fixable: false });
        } else {
            // Validate each experience entry
            for (let i = 0; i < validExperiences.length; i++) {
                const exp = validExperiences[i];

                // Role validation
                if (!exp.role || !exp.role.trim()) {
                    errors.push({ field: `exp_${i}_role`, type: 'error', message: `❌ Experience ${i + 1}: Role is missing`, fixable: true });
                }

                // Company validation
                if (!exp.company || !exp.company.trim()) {
                    errors.push({ field: `exp_${i}_company`, type: 'warning', message: `⚠️ Experience ${i + 1}: Company name recommended`, fixable: true });
                }

                // Date validation
                if (!exp.startDate || !exp.startDate.trim()) {
                    errors.push({ field: `exp_${i}_start`, type: 'error', message: `❌ ${exp.role || 'Experience'}: Start date required`, fixable: true });
                }
                if (!exp.endDate || !exp.endDate.trim()) {
                    errors.push({ field: `exp_${i}_end`, type: 'error', message: `❌ ${exp.role || 'Experience'}: End date required`, fixable: true });
                }

                // Date range validation
                if (exp.startDate && exp.endDate && !isValidDateRange(exp.startDate, exp.endDate)) {
                    errors.push({ field: `exp_${i}_date`, type: 'error', message: `❌ ${exp.role}: End date is before start date`, fixable: true });
                }

                // Bullets validation
                if (!exp.bullets || exp.bullets.length === 0 || !exp.bullets.some(b => b.trim())) {
                    errors.push({ field: `exp_${i}_bullets`, type: 'warning', message: `⚠️ ${exp.role}: Add achievements/responsibilities`, fixable: true });
                }
            }

            // Check for overlapping roles
            const sortedExp = [...validExperiences]
                .filter(e => e.startDate && e.endDate)
                .sort((a, b) => {
                    const aStart = parseDate(a.startDate);
                    const bStart = parseDate(b.startDate);
                    return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
=======
        if (!r.header.name.trim()) {
            issues.push({ id: 'name', type: 'ERROR', section: 'Contact', context: 'Name', message: 'Name is required', field: 'header.name' });
        }
        if (!r.header.email.trim()) {
            issues.push({ id: 'email', type: 'ERROR', section: 'Contact', context: 'Email', message: 'Email is required', field: 'header.email' });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.header.email)) {
            issues.push({ id: 'email_format', type: 'ERROR', section: 'Contact', context: 'Email', message: 'Invalid email format', field: 'header.email' });
        }
        if (!r.header.phone.trim()) {
            issues.push({ id: 'phone', type: 'WARNING', section: 'Contact', context: 'Phone', message: 'Phone recommended for contact', field: 'header.phone' });
        }

        r.experience.forEach((exp, i) => {
            const ctx = `${exp.role || 'Role'} at ${exp.company || 'Company'}`;
            if (!exp.startDate) {
                issues.push({
                    id: `exp_${i}_start`, type: 'ERROR', section: 'Experience', context: ctx,
                    message: 'Missing start date', field: `experience.${i}.startDate`,
                    fixOptions: [{ label: 'Set Date', value: '' }]
                });
            }
            if (!exp.endDate) {
                issues.push({
                    id: `exp_${i}_end`, type: 'ERROR', section: 'Experience', context: ctx,
                    message: 'Missing end date', field: `experience.${i}.endDate`,
                    fixOptions: [{ label: 'Set Date', value: '' }, { label: 'Mark as Present', value: 'Present' }]
                });
            }
            if (exp.startDate && exp.endDate && exp.endDate.toLowerCase() !== 'present') {
                const s = parseDate(exp.startDate), e = parseDate(exp.endDate);
                if (s && e && s > e) {
                    issues.push({
                        id: `exp_${i}_range`, type: 'ERROR', section: 'Experience', context: ctx,
                        message: `End date (${exp.endDate}) is before start date (${exp.startDate})`, field: `experience.${i}`
                    });
                }
            }
        });

        // Overlaps
        const sorted = [...r.experience].filter(e => e.startDate).sort((a, b) => {
            const as = parseDate(a.startDate), bs = parseDate(b.startDate);
            return (as?.getTime() || 0) - (bs?.getTime() || 0);
        });
        for (let i = 0; i < sorted.length - 1; i++) {
            const curr = sorted[i], next = sorted[i + 1];
            const currEnd = curr.endDate.toLowerCase() === 'present' ? new Date() : parseDate(curr.endDate);
            const nextStart = parseDate(next.startDate);
            if (currEnd && nextStart && currEnd > nextStart) {
                issues.push({
                    id: `overlap_${i}`, type: 'WARNING', section: 'Experience',
                    context: `${curr.role} & ${next.role}`,
                    message: `Dates overlap: ${curr.startDate}–${curr.endDate} and ${next.startDate}–${next.endDate}`,
                    field: 'experience_overlap'
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
                });

            for (let i = 0; i < sortedExp.length - 1; i++) {
                const current = sortedExp[i];
                const next = sortedExp[i + 1];

                // Check if current role is part-time/internship
                const isCurrentPartTime = /part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(current.role + ' ' + current.company);
                const isNextPartTime = /part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(next.role + ' ' + next.company);

                // Skip overlap check if both roles are part-time (can overlap)
                if (isCurrentPartTime && isNextPartTime) continue;

                const currEnd = current.endDate.toLowerCase() === 'present' ? new Date() : parseDate(current.endDate);
                const nextStart = parseDate(next.startDate);

                if (currEnd && nextStart && currEnd > nextStart) {
                    // Only show as warning for part-time roles, error for full-time
                    if (isCurrentPartTime || isNextPartTime) {
                        errors.push({
                            field: `exp_overlap_${i}`,
                            type: 'warning',
                            message: `⚠️ Overlapping dates: ${current.role} and ${next.role} (part-time roles can overlap)`,
                            fixable: false
                        });
                    } else {
                        errors.push({
                            field: `exp_overlap_${i}`,
                            type: 'error',
                            message: `❌ Overlapping dates: ${current.role} and ${next.role}`,
                            fixable: false
                        });
                    }
                }
            }
        }

<<<<<<< HEAD
        // Education validation
        if (r.education.length === 0) {
            errors.push({ field: 'education', type: 'warning', message: '⚠️ No education found', fixable: false });
        } else {
            for (let i = 0; i < r.education.length; i++) {
                const edu = r.education[i];
                if (!edu.degree || !edu.degree.trim()) {
                    errors.push({ field: `edu_${i}_degree`, type: 'warning', message: `⚠️ Education ${i + 1}: Degree name missing`, fixable: true });
                }
            }
        }

        // Profile consistency check - only check valid experiences
        const years = calculateYearsExp(validExperiences);
        const hasInternRoles = validExperiences.some(e => /intern|trainee/i.test(e.role));

        // Only flag inconsistency if the experience calculation includes part-time roles as full-time
        // We'll calculate years differently to account for part-time roles
        const actualYears = validExperiences.reduce((sum, exp) => {
            const isPartTime = /part[-\s]?time|intern|internship|contract|freelance|temporary|seasonal|student|trainee|apprentice/i.test(exp.role + ' ' + exp.company);
            const start = parseDate(exp.startDate);
            const end = exp.endDate.toLowerCase() === 'present' ? new Date() : parseDate(exp.endDate);
            if (start && end) {
                const expYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
                return sum + (isPartTime ? expYears * 0.5 : expYears);
            }
            return sum;
        }, 0);

        if (actualYears > 10 && hasInternRoles) {
            errors.push({
                field: 'profile_mismatch',
                type: 'error',
                message: '❌ Inconsistency: 10+ years experience but has intern roles',
                fixable: false
            });
        } else if (years > 10 && hasInternRoles && actualYears <= 10) {
            // If the original calculation shows >10 but adjusted calculation shows <=10, it's likely due to part-time roles
            errors.push({
                field: 'profile_mismatch',
                type: 'warning',
                message: '⚠️ You have intern roles with high experience count - verify dates',
                fixable: false
            });
        }

        // Skills validation
        if (r.skills.length === 0 || r.skills.every(s => s.items.length === 0)) {
            errors.push({ field: 'skills', type: 'warning', message: '⚠️ Add skills to improve ATS score', fixable: true });
        } else {
            const totalSkills = r.skills.reduce((sum, s) => sum + s.items.length, 0);
            if (totalSkills < 3) {
                errors.push({ field: 'skills', type: 'warning', message: '⚠️ Add more skills (minimum 3-5 recommended)', fixable: true });
            }
        }

        // LinkedIn/GitHub validation
        if (!r.linkedin && !r.github) {
            errors.push({ field: 'social', type: 'warning', message: '⚠️ Add LinkedIn or GitHub profile', fixable: true });
        }

        return errors;
=======
        if (r.skills.length === 0) {
            issues.push({ id: 'skills', type: 'WARNING', section: 'Skills', context: 'Skills', message: 'Add skills to improve visibility', field: 'skills' });
        }

        return issues;
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
    }, []);

    // Compute years + classify
    const computeMeta = useCallback((r: CanonicalResume) => {
        let years = 0;
        for (const exp of r.experience) {
            if (!exp.startDate || !exp.endDate) continue;
            const s = parseDate(exp.startDate);
            const e = exp.endDate.toLowerCase() === 'present' ? new Date() : parseDate(exp.endDate);
            if (s && e && e > s) years += (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 365);
        }
        years = Math.round(years * 10) / 10;

        const roles = r.experience.map(e => e.role.toLowerCase()).join(' ');
        let level = 'fresher', reason = 'Entry-level';
        if (years >= 7 || /director|vp|head|principal/.test(roles)) { level = 'senior'; reason = `${years}+ years`; }
        else if (years >= 3 || /senior|lead|manager/.test(roles)) { level = 'professional'; reason = `${years} years`; }
        else if (/intern|trainee/.test(roles)) { level = 'intern'; reason = 'Internship role'; }

        return { experienceYears: years, profileLevel: level, profileReason: reason };
    }, []);

    // Paginate for template preview
    const paginate = useCallback((r: CanonicalResume): any[][] => {
        const sections: { type: string; data: any; height: number }[] = [];
        sections.push({ type: 'header', data: r.header, height: 100 });
        if (r.profile) sections.push({ type: 'profile', data: r.profile, height: 70 });
        if (r.skills.length) {
            sections.push({ type: 'skills_header', data: null, height: 30 });
            r.skills.forEach(s => sections.push({ type: 'skill', data: s, height: 22 }));
        }
        if (r.experience.length) {
            sections.push({ type: 'exp_header', data: null, height: 30 });
            r.experience.forEach(e => sections.push({ type: 'exp', data: e, height: 120 }));
        }
        if (r.education.length) {
            sections.push({ type: 'edu_header', data: null, height: 30 });
            r.education.forEach(e => sections.push({ type: 'edu', data: e, height: 50 }));
        }

<<<<<<< HEAD
        console.log('🔍 Parsing resume...', lines.length, 'lines');

        // ===== NAME DETECTION =====
        let name = '';
        // Try first 10 lines for name
        for (const line of lines.slice(0, 10)) {
            const cleaned = line.replace(/[^a-zA-Z\s]/g, '').trim();
            const words = cleaned.split(/\s+/).filter(w => w.length > 1);

            // Name should be 2-4 words, not too long, and not a section header
            if (words.length >= 2 && words.length <= 4 && cleaned.length >= 4 && cleaned.length < 60) {
                const excludeWords = ['summary', 'profile', 'experience', 'education', 'skills', 'objective', 'resume', 'curriculum', 'vitae', 'contact', 'phone', 'email'];
                if (!excludeWords.some(k => cleaned.toLowerCase().includes(k))) {
                    name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    console.log('✅ Name found:', name);
                    break;
                }
=======
        const pages: any[][] = [];
        let current: any[] = [], h = 0;
        for (const sec of sections) {
            if (h + sec.height > USABLE_HEIGHT && current.length) {
                pages.push(current);
                current = [];
                h = 0;
            }
            current.push(sec);
            h += sec.height;
        }
        if (current.length) pages.push(current);
        return pages.length ? pages : [[]];
    }, []);

    // Update model
    const updateResume = useCallback((updater: (r: CanonicalResume) => CanonicalResume) => {
        setResume(prev => {
            const updated = updater(prev);
            updated.meta = computeMeta(updated);
            setIssues(validate(updated));
            setPages(paginate(updated));
            return updated;
        });
    }, [computeMeta, validate, paginate]);

    // Parse PDF
    const parseResume = useCallback((text: string): CanonicalResume => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        // Name
        let name = '';
        for (const line of lines.slice(0, 5)) {
            const c = line.replace(/[^a-zA-Z\s]/g, '').trim();
            const w = c.split(/\s+/).filter(x => x.length > 1);
            if (w.length >= 2 && w.length <= 4 && c.length < 50 && !['summary', 'profile', 'experience'].some(k => c.toLowerCase().includes(k))) {
                name = w.map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join(' ');
                break;
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
            }
        }

<<<<<<< HEAD
        // ===== EMAIL DETECTION =====
        const emailPatterns = [
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
        ];
        let email = '';
        for (const pattern of emailPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                email = matches[0].toLowerCase();
                console.log('✅ Email found:', email);
                break;
            }
        }
        status.push(email ? { field: 'Email', status: 'extracted', value: email } : { field: 'Email', status: 'missing', message: 'No email found' });

        // ===== PHONE DETECTION =====
        const phonePatterns = [
            /(?:\+91[-\s]?)?[6-9]\d{9}/,  // Indian format
            /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // US format
            /\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/, // International
            /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/ // (123) 456-7890
        ];
        let phone = '';
        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) {
                phone = match[0].replace(/\s+/g, ' ').trim();
                console.log('✅ Phone found:', phone);
                break;
            }
        }
        status.push(phone ? { field: 'Phone', status: 'extracted', value: phone } : { field: 'Phone', status: 'missing', message: 'No phone number found' });

        // ===== LINKEDIN & GITHUB =====
        const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9_-]+)/i);
        const githubMatch = text.match(/(?:github\.com\/)([a-zA-Z0-9_-]+)/i);
        const linkedin = linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : '';
        const github = githubMatch ? `github.com/${githubMatch[1]}` : '';
        if (linkedin) { status.push({ field: 'LinkedIn', status: 'extracted', value: linkedin }); console.log('✅ LinkedIn found'); }
        if (github) { status.push({ field: 'GitHub', status: 'extracted', value: github }); console.log('✅ GitHub found'); }

        // ===== SECTION FINDER HELPER =====
        const findSection = (keywords: string[], endKeywords: string[], maxLines = 30): string[] => {
            const lower = lines.map(l => l.toLowerCase());
            let start = -1;

            // Find section start
            for (let i = 0; i < lower.length; i++) {
                const line = lower[i];
                if (keywords.some(k => line === k || line.startsWith(k + ':') || line.startsWith(k + ' ') || (line.includes(k) && line.length < 50))) {
                    start = i;
                    console.log(`📍 Found section "${keywords[0]}" at line ${i}`);
                    break;
                }
            }

            if (start === -1) {
                console.log(`❌ Section "${keywords[0]}" not found`);
                return [];
            }

            // Find section end
            let end = Math.min(start + maxLines, lines.length);
            for (let i = start + 1; i < lines.length; i++) {
                const line = lower[i];
                if (endKeywords.some(k => line === k || line.startsWith(k + ':') || line.startsWith(k + ' ') || (line.includes(k) && line.length < 50))) {
                    end = i;
                    console.log(`📍 Section "${keywords[0]}" ends at line ${i}`);
                    break;
                }
            }

            return lines.slice(start + 1, end);
        };

        // ===== PROFILE/SUMMARY =====
        const profileLines = findSection(
            ['summary', 'profile', 'objective', 'about me', 'about', 'professional summary'],
            ['experience', 'work experience', 'employment', 'skills', 'education'],
            10
        );
        const profile = profileLines.join(' ').slice(0, 600).trim();
        if (profile) {
            status.push({ field: 'Profile', status: 'extracted', value: `${profile.length} chars` });
            console.log('✅ Profile extracted:', profile.substring(0, 50) + '...');
        }

        // ===== SKILLS =====
        const skillLines = findSection(
            ['skills', 'technical skills', 'technologies', 'competencies', 'core competencies', 'expertise'],
            ['experience', 'work experience', 'employment', 'education', 'projects'],
            20
        );
        const skillText = skillLines.join(' ') + ' ' + text; // Also search full text as fallback

        // Expanded skill patterns
        const langMatch = skillText.match(/\b(python|java|javascript|typescript|c\+\+|c#|go|rust|ruby|php|swift|kotlin|scala|r\b|sql|html|css|c\b|perl|matlab|shell|bash)\b/gi) || [];
        const fwMatch = skillText.match(/\b(react|angular|vue|node\.?js|express|django|flask|spring|laravel|rails|next\.?js|nuxt|svelte|fastapi|asp\.net|\.net)\b/gi) || [];
        const toolMatch = skillText.match(/\b(docker|kubernetes|aws|azure|gcp|git|github|gitlab|jenkins|mongodb|postgresql|mysql|redis|terraform|ansible|linux|windows|jira|figma|photoshop)\b/gi) || [];

        const skills: { category: string; items: string[] }[] = [];
        const uniqLangs = [...new Set(langMatch.map(s => s.toLowerCase()))];
        const uniqFws = [...new Set(fwMatch.map(s => s.toLowerCase()))];
        const uniqTools = [...new Set(toolMatch.map(s => s.toLowerCase()))];

        if (uniqLangs.length) skills.push({ category: 'Languages', items: uniqLangs });
        if (uniqFws.length) skills.push({ category: 'Frameworks', items: uniqFws });
        if (uniqTools.length) skills.push({ category: 'Tools', items: uniqTools });

        const totalSkills = uniqLangs.length + uniqFws.length + uniqTools.length;
        if (totalSkills > 0) {
            status.push({ field: 'Skills', status: 'extracted', value: `${totalSkills} skills found` });
            console.log('✅ Skills extracted:', totalSkills);
        } else {
            status.push({ field: 'Skills', status: 'missing', message: 'No technical skills detected' });
        }

        // ===== EXPERIENCE =====
        const expLines = findSection(
            ['experience', 'work experience', 'professional experience', 'employment', 'work history', 'career'],
            ['education', 'academic', 'skills', 'projects', 'certifications'],
            50
        );

        const experience: Experience[] = [];
        let currentExp: Experience | null = null;

        // Improved date pattern
        const datePattern = /(\d{1,2}\/\d{4}|\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})\s*[-–—to]+\s*(\d{1,2}\/\d{4}|\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|present|current|now)/i;

        for (const line of expLines) {
            const dateMatch = line.match(datePattern);

            // Check if line is likely a role/company line
            const isRoleLine = /^(software|senior|junior|lead|manager|developer|engineer|analyst|designer|intern|associate|director|consultant|specialist|coordinator|assistant|executive|officer)/i.test(line) || dateMatch;

            if (isRoleLine) {
                // Save previous experience
                if (currentExp && currentExp.role) {
                    experience.push(currentExp);
                }

                // Extract role and company
                let role = line.replace(datePattern, '').trim();
                let company = '';

                // Try to split by common separators
                const separators = [' at ', ' @ ', ' - ', ' | ', ' , '];
                for (const sep of separators) {
                    if (role.includes(sep)) {
                        const parts = role.split(sep);
                        role = parts[0].trim();
                        company = parts.slice(1).join(sep).trim();
                        break;
                    }
                }

                currentExp = {
                    role: role || line.substring(0, 100),
                    company: company,
                    startDate: dateMatch?.[1] || '',
                    endDate: dateMatch?.[2] || '',
                    bullets: []
                };
            } else if (currentExp && line.length > 15) {
                // Add as bullet point
                const bullet = line.replace(/^[-•*●◦▪▫]\s*/, '').trim();
                if (bullet.length > 10 && !datePattern.test(bullet)) {
                    currentExp.bullets.push(bullet);
                }
            }
        }

        // Don't forget the last experience
        if (currentExp && currentExp.role) {
            experience.push(currentExp);
        }

        if (experience.length > 0) {
            status.push({ field: 'Experience', status: 'extracted', value: `${experience.length} roles found` });
            console.log('✅ Experience extracted:', experience.length, 'roles');
        } else {
            status.push({ field: 'Experience', status: 'missing', message: 'No work experience detected' });
        }

        // ===== EDUCATION =====
        const eduLines = findSection(
            ['education', 'academic', 'qualification', 'qualifications', 'academic background'],
            ['skills', 'projects', 'experience', 'certifications', 'achievements'],
            15
        );

        const education: Education[] = [];
        const degreePattern = /bachelor|master|b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|mba|bba|phd|doctorate|diploma|associate|degree/i;

        for (const line of eduLines) {
            if (degreePattern.test(line)) {
                const degreeMatch = line.match(/(bachelor[^,]*|master[^,]*|b\.?tech[^,]*|m\.?tech[^,]*|b\.?e[^,]*|m\.?e[^,]*|b\.?sc[^,]*|m\.?sc[^,]*|mba|bba|phd|doctorate[^,]*|diploma[^,]*)/i);
                const institutionMatch = line.match(/(university|college|institute|school|academy)[^,]*/i);
                const yearMatch = line.match(/\b(19|20)\d{2}\b/);

                education.push({
                    degree: degreeMatch?.[0] || line.substring(0, 100),
                    institution: institutionMatch?.[0] || '',
                    year: yearMatch?.[0] || ''
                });
            }
        }

        if (education.length > 0) {
            status.push({ field: 'Education', status: 'extracted', value: `${education.length} entries found` });
            console.log('✅ Education extracted:', education.length, 'entries');
        } else {
            status.push({ field: 'Education', status: 'missing', message: 'No education found' });
        }

        // ===== PROJECTS =====
        const projLines = findSection(
            ['projects', 'personal projects', 'portfolio', 'key projects', 'project experience'],
            ['education', 'skills', 'achievements', 'certifications', 'awards'],
            30
        );

        const projects: { name: string; description: string; tech: string[] }[] = [];
        let currentProj: { name: string; description: string; tech: string[] } | null = null;
=======
        const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
        const phone = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}|\+?[0-9]{1,3}[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/)?.[0] || '';
        const linkedin = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)?.[0] || '';
        const github = text.match(/github\.com\/[a-zA-Z0-9_-]+/i)?.[0] || '';

        const findSection = (kw: string[], end: string[], max = 25) => {
            const lower = lines.map(l => l.toLowerCase());
            let start = -1;
            for (let i = 0; i < lower.length; i++) if (kw.some(k => lower[i].includes(k) && lower[i].length < 50)) { start = i; break; }
            if (start === -1) return [];
            let endIdx = Math.min(start + max, lines.length);
            for (let i = start + 1; i < lines.length; i++) if (end.some(k => lower[i].includes(k) && lower[i].length < 50)) { endIdx = i; break; }
            return lines.slice(start + 1, endIdx);
        };

        const profileLines = findSection(['summary', 'profile', 'objective'], ['experience', 'skills', 'education'], 6);
        const profile = profileLines.join(' ').slice(0, 400);

        const skillLines = findSection(['skills', 'technical skills'], ['experience', 'education', 'projects'], 15);
        const skillText = skillLines.join(' ');
        const langs = [...new Set((skillText.match(/\b(python|java|javascript|typescript|c\+\+|go|rust|sql|r\b)\b/gi) || []).map(s => s.toLowerCase()))];
        const fws = [...new Set((skillText.match(/\b(react|angular|vue|node|express|django|flask|spring|nextjs)\b/gi) || []).map(s => s.toLowerCase()))];
        const tools = [...new Set((skillText.match(/\b(docker|kubernetes|aws|azure|gcp|git|mongodb|postgresql)\b/gi) || []).map(s => s.toLowerCase()))];
        const skills: CanonicalResume['skills'] = [];
        if (langs.length) skills.push({ category: 'Languages', items: langs });
        if (fws.length) skills.push({ category: 'Frameworks', items: fws });
        if (tools.length) skills.push({ category: 'Tools', items: tools });

        const expLines = findSection(['experience', 'work experience'], ['education', 'skills', 'projects'], 40);
        const experience: CanonicalResume['experience'] = [];
        let curr: CanonicalResume['experience'][0] | null = null;
        const dateRe = /(\d{2}\/\d{4}|\w+\s+\d{4}|\d{4})\s*[-–to]+\s*(\d{2}\/\d{4}|\w+\s+\d{4}|\d{4}|present|current)/i;
        for (const line of expLines) {
            const dm = line.match(dateRe);
            if (dm || /^(software|senior|junior|lead|manager|developer|engineer|intern|machine learning|data)/i.test(line)) {
                if (curr) experience.push(curr);
                const parts = line.split(/\s+[-–|at@]\s+/);
                curr = { id: `exp_${experience.length}`, role: parts[0]?.replace(dateRe, '').trim() || '', company: parts[1]?.replace(dateRe, '').trim() || '', startDate: dm?.[1] || '', endDate: dm?.[2] || '', bullets: [] };
            } else if (curr && line.length > 15) curr.bullets.push(line.replace(/^[-•*]\s*/, ''));
        }
        if (curr) experience.push(curr);

        const eduLines = findSection(['education', 'academic'], ['skills', 'projects', 'experience'], 12);
        const education: CanonicalResume['education'] = [];
        for (const line of eduLines) {
            if (/bachelor|master|b\.?tech|m\.?tech|bsc|msc|mba|phd|degree|university|college/i.test(line)) {
                education.push({
                    id: `edu_${education.length}`,
                    degree: line.match(/(bachelor|master|b\.?tech|m\.?tech|bsc|msc|mba|phd)[^,]*/i)?.[0] || line,
                    institution: line.match(/(university|college|institute)[^,]*/i)?.[0] || '',
                    year: line.match(/\d{4}/)?.[0] || ''
                });
            }
        }
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5

        const projLines = findSection(['projects', 'personal projects'], ['education', 'skills'], 20);
        const projects: CanonicalResume['projects'] = [];
        let cp: CanonicalResume['projects'][0] | null = null;
        for (const line of projLines) {
<<<<<<< HEAD
            // Project name is usually short, no periods, not starting with number
            if (line.length < 60 && !line.includes('.') && !/^\d/.test(line) && !/^[-•*]/.test(line)) {
                if (currentProj && currentProj.name) {
                    projects.push(currentProj);
                }
                currentProj = { name: line, description: '', tech: [] };
            } else if (currentProj) {
                currentProj.description += line + ' ';
                const techMatch = line.match(/\b(react|node|python|java|mongodb|postgresql|mysql|aws|docker|typescript|javascript|angular|vue|django|flask|spring|kubernetes|redis|graphql)\b/gi);
                if (techMatch) {
                    currentProj.tech.push(...techMatch.map(t => t.toLowerCase()));
                }
            }
        }

        if (currentProj && currentProj.name) {
            projects.push(currentProj);
=======
            if (line.length < 50 && !line.includes('.')) { if (cp) projects.push(cp); cp = { id: `proj_${projects.length}`, name: line, description: '', tech: [] }; }
            else if (cp) cp.description += line + ' ';
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
        }
        if (cp) projects.push(cp);

<<<<<<< HEAD
        // Deduplicate tech for each project
        projects.forEach(p => {
            p.tech = [...new Set(p.tech)];
            p.description = p.description.trim();
        });

        if (projects.length > 0) {
            status.push({ field: 'Projects', status: 'extracted', value: `${projects.length} projects found` });
            console.log('✅ Projects extracted:', projects.length);
        }

        console.log('🎉 Parsing complete!');
        return {
            resume: { name, email, phone, linkedin, github, profile, skills, experience, education, projects, photo: null },
            status
        };
=======
        return { header: { name, email, phone, linkedin, github }, profile, experience, education, skills, projects, photo: null, meta: { experienceYears: 0, profileLevel: 'fresher', profileReason: '' } };
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
    }, []);

    // Upload handler
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
<<<<<<< HEAD
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file only');
            return;
        }

        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Maximum size is 10MB');
            return;
        }
=======
        if (!file || file.type !== 'application/pdf') return;
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5

        setProcessing(true);
<<<<<<< HEAD
        setProcessingStage(0);
        setTotalPages(1);

        try {
            // Stage 1: Reading PDF
=======
        setProcessingText('Reading your resume...');

        try {
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

            const buf = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

<<<<<<< HEAD
            const pageCount = pdf.numPages;
            setTotalPages(pageCount);
            console.log(`PDF loaded: ${pageCount} page(s)`);

            // Extract text from all pages
            let fullText = '';
            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const textItems: any[] = content.items;

                let pageText = '';
                let lastY = -1;
                let lastX = -1;

                for (const item of textItems) {
                    if (item.str) {
                        const currentY = item.transform[5];
                        const currentX = item.transform[4];

                        if (lastY !== -1) {
                            const yDiff = Math.abs(currentY - lastY);
                            if (currentY > lastY + 100) {
                                pageText += '\n\n';
                            } else if (lastY - currentY > 5) {
                                pageText += '\n';
                            } else if (yDiff <= 5) {
                                if (Math.abs(currentX - lastX) > 50) {
                                    pageText += '  ';
                                } else if (pageText.length > 0 && !/[ \n]$/.test(pageText)) {
                                    pageText += ' ';
                                }
                            }
                        }

                        pageText += item.str;
                        lastY = currentY;
                        lastX = currentX + (item.width || 0);
                    }
                }

                fullText += pageText + '\n\n';
                console.log(`Extracted page ${i}/${pageCount} - ${pageText.length} chars`);
            }

            fullText = fullText.trim();
            console.log(`Total text extracted: ${fullText.length} characters`);

            // Stage 2: AI Extraction
            setProcessingStage(2);
            console.log('Using AI to parse resume...');
            const aiResult = await parseResumeWithAI(fullText);
            setAiExtractionResult(aiResult);

            // Convert to app Resume format
            const parsed: Resume = {
                name: aiResult.resume.name,
                email: aiResult.resume.email,
                phone: aiResult.resume.phone,
                linkedin: aiResult.resume.linkedin,
                github: aiResult.resume.github,
                profile: aiResult.resume.profile,
                skills: aiResult.resume.skills,
                experience: aiResult.resume.experience,
                education: aiResult.resume.education,
                projects: aiResult.resume.projects.map(p => ({
                    name: p.name,
                    description: p.description,
                    tech: p.tech
                })),
                photo: null
            };

            // Build extraction status from AI result
            const status: ExtractionStatus[] = [];
            for (const field of aiResult.extractedFields) {
                let value = '';
                switch (field) {
                    case 'Name': value = parsed.name; break;
                    case 'Email': value = parsed.email; break;
                    case 'Phone': value = parsed.phone; break;
                    case 'LinkedIn': value = parsed.linkedin; break;
                    case 'GitHub': value = parsed.github; break;
                    case 'Skills': value = `${parsed.skills.reduce((a, s) => a + s.items.length, 0)} skills`; break;
                    case 'Experience': value = `${parsed.experience.length} roles`; break;
                    case 'Education': value = `${parsed.education.length} entries`; break;
                    case 'Projects': value = `${parsed.projects.length} projects`; break;
                    case 'Profile': value = `${parsed.profile.length} chars`; break;
                }
                status.push({ field, status: 'extracted', value });
            }
            for (const field of aiResult.missingFields) {
                status.push({ field, status: 'missing', message: `${field} not found in PDF` });
            }

            setResume(parsed);
            setExtractionStatus(status);
            console.log('AI extraction complete:', aiResult.extractedFields.length, 'fields found');

            // Stage 3: Profile detection
            setProcessingStage(3);
            const profile = detectProfileType(aiResult.resume);
            setProfileType(profile);
            console.log('Profile detected:', profile.type, '-', profile.reason);

            // Stage 4: Smart validation (only real issues)
            setProcessingStage(4);
            const smartValidation = getSmartValidationIssues(aiResult);
            const errors: ValidationError[] = [
                ...smartValidation.errors.map(e => ({ field: e.field, type: 'error' as const, message: e.message, fixable: true })),
                ...smartValidation.warnings.map(w => ({ field: w.field, type: 'warning' as const, message: w.message, fixable: true }))
            ];
            setValidationErrors(errors);
            console.log('Smart validation:', errors.length, 'issues (only real problems)');

            setProcessing(false);
            setStep('targeting');
            console.log('Processing complete!');

        } catch (err: any) {
            console.error('PDF Error:', err);
            const errorMessage = err.message || 'Unknown error occurred';
            alert(`Error processing PDF:

${errorMessage}

Please try a different PDF file.`);
=======
            setProcessingText('Extracting information...');
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                let pt = '', ly = 0;
                for (const it of content.items as any[]) {
                    if (it.str) { if (ly && Math.abs(it.transform[5] - ly) > 5) pt += '\n'; pt += it.str + ' '; ly = it.transform[5]; }
                }
                text += pt + '\n\n';
            }

            setProcessingText('Validating data...');
            await new Promise(r => setTimeout(r, 300));

            const parsed = parseResume(text);
            parsed.meta = computeMeta(parsed);
            setResume(parsed);
            setIssues(validate(parsed));
            setPages(paginate(parsed));

            setProcessing(false);
            setStep('targeting');
        } catch (err) {
            alert('Error reading PDF');
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
            setProcessing(false);
            setTotalPages(1);
        }
    };

<<<<<<< HEAD
    // ============== JD ANALYSIS WITH RAG ==============
    useEffect(() => {
        if (!jd.trim() && !targetRole.trim()) { setJdAnalysis(null); return; }

        const analyze = async () => {
            try {
                // Use RAG for more accurate matching based on actual content
                const ragContext = buildRAGContext(
                    `${resume.profile} ${resume.skills.flatMap(s => s.items).join(' ')} ${resume.experience.map(e => `${e.role} ${e.company} ${e.bullets.join(' ')}`).join(' ')} ${resume.projects.map(p => `${p.name} ${p.description}`).join(' ')} ${resume.education.map(e => `${e.degree} ${e.institution}`).join(' ')}`,
                    targetRole,
                    jd,
                    resume
                );

                const ragResult = await runRAGAnalysis(ragContext);

                // Convert RAG result to JDMatchResult format
                const result: JDMatchResult = {
                    matchScore: ragResult.confidence,
                    matchedSkills: ragResult.matchedSkills,
                    missingSkills: ragResult.missingSkills,
                    roleAlignment: ragResult.confidence,
                    suggestions: ragResult.suggestions
                };

                setJdAnalysis(result);
            } catch (err) {
                console.error('JD analysis error:', err);
            }
        };

        const t = setTimeout(analyze, 1000);
        return () => clearTimeout(t);
    }, [jd, targetRole, resume]);
=======
    // JD matching
    useEffect(() => {
        if (!jd.trim()) { setJdMatch(null); return; }
        const rt = [resume.profile, resume.skills.flatMap(s => s.items).join(' '), resume.experience.map(e => e.bullets.join(' ')).join(' ')].join(' ').toLowerCase();
        const jdSkills = [...new Set((jd.match(/\b(python|java|javascript|typescript|react|angular|vue|node|mongodb|sql|aws|docker|kubernetes|git|agile)\b/gi) || []).map(s => s.toLowerCase()))];
        const matched = jdSkills.filter(s => rt.includes(s));
        const missing = jdSkills.filter(s => !rt.includes(s));
        setJdMatch({ score: jdSkills.length ? Math.round((matched.length / jdSkills.length) * 100) : 0, matched, missing });
    }, [jd, resume]);
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5

    // Fix issue
    const applyFix = (issue: ValidationIssue, value: string) => {
        const parts = issue.field.split('.');
        updateResume(prev => {
            const u = { ...prev };
            if (parts[0] === 'header') u.header = { ...u.header, [parts[1]]: value };
            else if (parts[0] === 'experience') {
                const idx = parseInt(parts[1]);
                u.experience = u.experience.map((e, i) => i === idx ? { ...e, [parts[2]]: value } : e);
            }
            return u;
        });
        setEditingIssue(null);
        setEditValue('');
    };

<<<<<<< HEAD
    // Auto-revalidate when resume changes in validation step
    useEffect(() => {
        if (step === 'validation') {
            const errors = runHardValidation(resume);
            setValidationErrors(errors);
        }
    }, [resume, step]);

    // ============== PDF DOWNLOAD ==============
=======
    const hasErrors = issues.some(i => i.type === 'ERROR');

    // Download PDF
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
    const downloadPDF = async () => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        const w = 210, m = 20, cw = w - m * 2;
        let y = 25;
        const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];

        doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(tpl.colors.primary);
        doc.text(resume.header.name || 'Your Name', m, y); y += 8;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
        doc.text([resume.header.email, resume.header.phone].filter(Boolean).join(' | '), m, y); y += 10;
        doc.setDrawColor(200); doc.line(m, y, w - m, y); y += 8;

        const addSec = (title: string, content: string) => {
            if (!content) return;
            if (y > 265) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(40);
            doc.text(title.toUpperCase(), m, y); y += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60);
            const lines = doc.splitTextToSize(content, cw);
            for (const l of lines) { if (y > 275) { doc.addPage(); y = 20; } doc.text(l, m, y); y += 4; }
            y += 5;
        };

        if (resume.profile) addSec('Profile', resume.profile);
        if (resume.skills.length) addSec('Skills', resume.skills.map(s => s.category + ': ' + s.items.join(', ')).join('\n'));
        for (const exp of resume.experience) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(exp.role + (exp.company ? ' at ' + exp.company : ''), m, y); y += 4;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100); doc.text(exp.startDate + ' - ' + exp.endDate, m, y); y += 4;
            doc.setFontSize(9); doc.setTextColor(60);
            for (const b of exp.bullets.slice(0, 3)) { const bl = doc.splitTextToSize('• ' + b, cw); for (const l of bl) { if (y > 275) { doc.addPage(); y = 20; } doc.text(l, m, y); y += 4; } }
            y += 3;
        }
        if (resume.education.length) addSec('Education', resume.education.map(e => e.degree + (e.institution ? ', ' + e.institution : '') + (e.year ? ' (' + e.year + ')' : '')).join('\n'));
        if (!paid) { doc.setFontSize(8); doc.setTextColor(180); doc.text('hexastack.com', w / 2, 290, { align: 'center' }); }
        doc.save((resume.header.name.replace(/\s+/g, '_') || 'resume') + '.pdf');
    };

    // Render page content for preview
    const renderPageSection = (sec: any, idx: number) => {
        const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];
<<<<<<< HEAD
        const [zoom, setZoom] = useState<'fit' | '100' | '125'>('fit');

        const getScale = () => {
            if (zoom === '100') return 0.65;
            if (zoom === '125') return 0.8;
            return 0.52; // fit
        };

        return (
            <div className="a4-preview-wrap">
                <div className="preview-controls">
                    <div className="page-tabs">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} className={currentPage === i + 1 ? 'active' : ''} onClick={() => setCurrentPage(i + 1)}>
                                Page {i + 1}
                            </button>
                        ))}
                    </div>
                    <div className="zoom-controls">
                        <button
                            className={zoom === 'fit' ? 'active' : ''}
                            onClick={() => setZoom('fit')}
                            title="Fit to view"
                        >
                            Fit
                        </button>
                        <button
                            className={zoom === '100' ? 'active' : ''}
                            onClick={() => setZoom('100')}
                            title="100% zoom"
                        >
                            100%
                        </button>
                        <button
                            className={zoom === '125' ? 'active' : ''}
                            onClick={() => setZoom('125')}
                            title="125% zoom"
                        >
                            125%
                        </button>
                    </div>
                </div>
                <div className="a4-scroll-container">
                    <div className="a4-frame" style={{ transform: `scale(${getScale()})` }}>
                        <div className={`a4-paper ${template}`} style={{ '--primary': tpl.colors.primary, '--accent': tpl.colors.accent } as React.CSSProperties}>
                            {resume.photo && tpl.photoPosition !== 'none' && (
                                <div className={`cv-photo ${tpl.photoPosition}`}>
                                    <img src={resume.photo} alt="" />
                                </div>
                            )}
                            <div className="cv-header">
                                <h1 style={{ color: tpl.colors.primary }}>{resume.name || 'Your Name'}</h1>
                                <p className="cv-contact">{[resume.email, resume.phone].filter(Boolean).join(' | ')}</p>
                                <p className="cv-links">{[resume.linkedin, resume.github].filter(Boolean).join(' | ')}</p>
                            </div>
                            <div className="cv-body">
                                {resume.profile && (
                                    <div className="cv-section">
                                        <h2 style={{ color: tpl.colors.primary }}>Profile</h2>
                                        <p>{resume.profile}</p>
                                    </div>
                                )}
                                {resume.skills.length > 0 && (
                                    <div className="cv-section">
                                        <h2 style={{ color: tpl.colors.primary }}>Skills</h2>
                                        {resume.skills.map((s, i) => (
                                            <div key={i} className="skill-row">
                                                <span className="skill-cat">{s.category}:</span>
                                                <span className="skill-items">{s.items.join(', ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resume.experience.length > 0 && (
                                    <div className="cv-section">
                                        <h2 style={{ color: tpl.colors.primary }}>Experience</h2>
                                        {resume.experience.map((exp, i) => (
                                            <div key={i} className="exp-entry">
                                                <div className="exp-head">
                                                    <strong>{exp.role}</strong>
                                                    <span className="exp-date">{exp.startDate} - {exp.endDate}</span>
                                                </div>
                                                <div className="exp-company">{exp.company}</div>
                                                <ul>
                                                    {exp.bullets.slice(0, 3).map((b, j) => <li key={j}>{b}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resume.projects.length > 0 && (
                                    <div className="cv-section">
                                        <h2 style={{ color: tpl.colors.primary }}>Projects</h2>
                                        {resume.projects.slice(0, 2).map((proj, i) => (
                                            <div key={i} className="project-entry">
                                                <strong className="project-name">{proj.name}</strong>
                                                <p className="project-desc">{proj.description.slice(0, 150)}{proj.description.length > 150 ? '...' : ''}</p>
                                                {proj.tech.length > 0 && (
                                                    <div className="project-tech">
                                                        {proj.tech.slice(0, 5).map((t, j) => (
                                                            <span key={j} className="tech-tag">{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {resume.education.length > 0 && (
                                    <div className="cv-section">
                                        <h2 style={{ color: tpl.colors.primary }}>Education</h2>
                                        {resume.education.map((e, i) => (
                                            <div key={i} className="edu-entry">
                                                <strong>{e.degree}</strong>
                                                <span>{e.institution} {e.year && `(${e.year})`}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {!paid && <div className="cv-watermark">{CONFIG.watermark}</div>}
                        </div>
                    </div>
=======
        switch (sec.type) {
            case 'header': return (
                <div key={idx} className="cv-header" style={{ color: tpl.colors.primary }}>
                    <h1>{sec.data.name || 'Your Name'}</h1>
                    <p className="cv-contact">{[sec.data.email, sec.data.phone].filter(Boolean).join(' | ')}</p>
                </div>
            );
            case 'profile': return <div key={idx} className="cv-section"><h2>Profile</h2><p>{sec.data}</p></div>;
            case 'skills_header': return <h2 key={idx} className="cv-section-title">Skills</h2>;
            case 'skill': return <div key={idx} className="cv-skill"><span className="cat">{sec.data.category}:</span> {sec.data.items.join(', ')}</div>;
            case 'exp_header': return <h2 key={idx} className="cv-section-title">Experience</h2>;
            case 'exp': return (
                <div key={idx} className="cv-exp">
                    <div className="cv-exp-head"><strong>{sec.data.role}</strong><span>{sec.data.startDate} - {sec.data.endDate}</span></div>
                    <div className="cv-exp-company">{sec.data.company}</div>
                    <ul>{sec.data.bullets?.slice(0, 2).map((b: string, i: number) => <li key={i}>{b.slice(0, 80)}</li>)}</ul>
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
                </div>
            );
            case 'edu_header': return <h2 key={idx} className="cv-section-title">Education</h2>;
            case 'edu': return <div key={idx} className="cv-edu"><strong>{sec.data.degree}</strong><span>{sec.data.institution} {sec.data.year && `(${sec.data.year})`}</span></div>;
            default: return null;
        }
    };

<<<<<<< HEAD
    // ============== FIX MODAL ==============
    const [fixModal, setFixModal] = useState<{ field: string; value: string; label: string } | null>(null);

    const openFixModal = (err: ValidationError) => {
        let value = '';
        let label = '';

        // Parse field path to get current value
        if (err.field.startsWith('exp_')) {
            const parts = err.field.split('_'); // exp_0_startDate
            const idx = parseInt(parts[1]);
            const key = parts[2];
            if (resume.experience[idx]) {
                value = (resume.experience[idx] as any)[key] || '';
                label = `Experience ${idx + 1}: ${key === 'startDate' ? 'Start Date' : key === 'endDate' ? 'End Date' : key}`;
            }
        } else if (err.field.startsWith('edu_')) {
            const parts = err.field.split('_');
            const idx = parseInt(parts[1]);
            const key = parts[2];
            if (resume.education[idx]) {
                value = (resume.education[idx] as any)[key] || '';
                label = `Education ${idx + 1}: ${key}`;
            }
        } else if (err.field === 'skills') {
            value = ''; // Special case, maybe show text area or specialized input
            label = 'Add Skills (comma separated)';
        } else {
            // Fallback for simple fields
            value = (resume as any)[err.field] || '';
            label = err.field.charAt(0).toUpperCase() + err.field.slice(1);
        }

        setFixModal({ field: err.field, value, label });
    };

    const saveFix = () => {
        if (!fixModal) return;

        setResume(prev => {
            const next = { ...prev };

            if (fixModal.field.startsWith('exp_')) {
                const parts = fixModal.field.split('_');
                const idx = parseInt(parts[1]);
                const key = parts[2];
                if (next.experience[idx]) {
                    const newExp = [...next.experience];
                    (newExp[idx] as any)[key] = fixModal.value;
                    next.experience = newExp;
                }
            } else if (fixModal.field.startsWith('edu_')) {
                const parts = fixModal.field.split('_');
                const idx = parseInt(parts[1]);
                const key = parts[2];
                if (next.education[idx]) {
                    const newEdu = [...next.education];
                    (newEdu[idx] as any)[key] = fixModal.value;
                    next.education = newEdu;
                }
            } else if (fixModal.field === 'skills') {
                // Add to first category or create 'General'
                if (next.skills.length === 0) next.skills = [{ category: 'General', items: [] }];
                const newItems = fixModal.value.split(',').map(s => s.trim()).filter(Boolean);
                next.skills[0].items = [...next.skills[0].items, ...newItems];
            } else {
                (next as any)[fixModal.field] = fixModal.value;
            }
            return next;
        });
        setFixModal(null);
    };

    return (
        <div className="app">
            {/* FIX MODAL */}
            {fixModal && (
                <div className="overlay" onClick={() => setFixModal(null)}>
                    <div className="modal fix-modal" onClick={e => e.stopPropagation()}>
                        <h3>Fix Issue: {fixModal.label}</h3>
                        <div className="modal-body">
                            <label>Enter Value:</label>
                            {fixModal.field.includes('date') || fixModal.field.includes('Date') ? (
                                <input
                                    type="text"
                                    placeholder="e.g. Jan 2022 or Present"
                                    value={fixModal.value}
                                    onChange={e => setFixModal({ ...fixModal, value: e.target.value })}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={fixModal.value}
                                    onChange={e => setFixModal({ ...fixModal, value: e.target.value })}
                                />
                            )}
                            <div className="modal-actions">
                                <button className="btn" onClick={() => setFixModal(null)}>Cancel</button>
                                <button className="btn primary" onClick={saveFix}>Save Fix</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
=======
    return (
        <div className="app">
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
            {step !== 'upload' && (
                <header className="header">
                    <div className="logo" onClick={() => setStep('upload')}><FileText size={18} /><span>HexaStack</span></div>
                    <div className="steps">
                        {['Upload', 'Target', 'Validate', 'Template', 'Download'].map((s, i) => {
                            const all: Step[] = ['upload', 'targeting', 'validate', 'template', 'download'];
                            const active = all.indexOf(step) >= i;
                            return <div key={s} className={`step ${active ? 'active' : ''}`}><span className="num">{i + 1}</span><span className="label">{s}</span></div>;
                        })}
                    </div>
                    <button className="icon-btn"><Settings size={18} /></button>
                </header>
            )}

            {/* Edit Modal */}
            {editingIssue && (
                <div className="overlay" onClick={() => setEditingIssue(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-head"><h3>Fix Issue</h3><button onClick={() => setEditingIssue(null)}><X size={18} /></button></div>
                        <div className="modal-body">
                            <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Enter value..." autoFocus />
                            <button className="btn primary" onClick={() => { const iss = issues.find(i => i.id === editingIssue); if (iss) applyFix(iss, editValue); }}>Save & Validate</button>
                        </div>
                    </div>
                </div>
            )}

            <main>


                {/* STEP 1: UPLOAD */}
                {step === 'upload' && (
                    <section className="page-upload">
                        {processing ? (
                            <div className="loader-card">
                                <div className="spinner" />
                                <p>{processingText}</p>
                            </div>
                        ) : (
                            <div className="upload-card">
                                <div className="badge">Resume Formatter</div>
                                <h1>Upload your resume</h1>
                                <p className="sub">No login. Files deleted after processing.</p>
                                <div className="drop-zone">
                                    <input type="file" accept=".pdf" id="file" onChange={handleUpload} />
                                    <label htmlFor="file"><Upload size={36} /><span>Drop PDF here or click</span></label>
                                </div>
                                <div className="trust"><span><Check size={14} /> No signup</span><span><Check size={14} /> Not stored</span><span><Check size={14} /> Free preview</span></div>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 2: TARGETING */}
                {step === 'targeting' && (
<<<<<<< HEAD
                    <section className="targeting-page">
                        <div className="page-layout">
                            <div className="left-panel">
                                <button className="back-btn" onClick={() => setStep('upload')}><ChevronLeft size={20} /></button>
                                <h2>Extraction Complete</h2>
                                <p className="subtitle">Review what we found. Add a job description for targeted keywords.</p>

                                {/* Extraction Status */}
                                <div className="status-panel">
                                    <h4>Extraction Status</h4>
                                    {extractionStatus.map((s, i) => (
                                        <div key={i} className={`status-row ${s.status}`}>
                                            {s.status === 'extracted' ? <Check size={14} /> : s.status === 'missing' ? <X size={14} /> : <AlertTriangle size={14} />}
                                            <span className="status-field">{s.field}</span>
                                            <span className="status-val">{s.value || s.message}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Profile Detection */}
                                <div className="profile-box">
                                    <div className="profile-label">Detected Profile</div>
                                    <div className="profile-type">{profileType.type}</div>
                                    <div className="profile-reason">{profileType.reason} • {profileType.years} years</div>
                                </div>

                                {/* Target Role Input */}
                                <div className="jd-section">
                                    <h4>Target Role (Optional)</h4>
                                    <input
                                        type="text"
                                        value={targetRole}
                                        onChange={e => setTargetRole(e.target.value)}
                                        placeholder="e.g., Senior Software Engineer"
                                        className="target-role-input"
                                    />
                                </div>

                                {/* Optional JD Input */}
                                <div className="jd-section">
                                    <h4>Job Description (Optional)</h4>
                                    <textarea
                                        value={jd}
                                        onChange={e => setJd(e.target.value)}
                                        placeholder="Paste job description to match keywords..."
                                        rows={5}
                                    />
                                    {jdAnalysis && (
                                        <div className="jd-results">
                                            <div className="jd-score">{jdAnalysis.matchScore}% Match</div>
                                            <div className="jd-tags">
                                                {jdAnalysis.matchedSkills.slice(0, 5).map((m: string, i: number) => <span key={i} className="tag matched">{m}</span>)}
                                                {jdAnalysis.missingSkills.slice(0, 3).map((m: string, i: number) => <span key={i} className="tag missing">{m}</span>)}
                                            </div>
=======
                    <section className="page-target">
                        <div className="target-card">
                            <button className="back" onClick={() => setStep('upload')}><ChevronLeft size={20} /></button>
                            <div className="toggle-row">
                                <Target size={20} />
                                <span>Target a specific job?</span>
                                <button className={`toggle ${targetingEnabled ? 'on' : ''}`} onClick={() => setTargetingEnabled(!targetingEnabled)}><span /></button>
                            </div>
                            {targetingEnabled && (
                                <div className="jd-input">
                                    <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste job description..." rows={5} />
                                    {jdMatch && (
                                        <div className="jd-result">
                                            <span className="score">{jdMatch.score}% Match</span>
                                            <div className="tags">{jdMatch.matched.slice(0, 4).map((m, i) => <span key={i} className="tag match">{m}</span>)}{jdMatch.missing.slice(0, 3).map((m, i) => <span key={i} className="tag miss">{m}</span>)}</div>
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="sticky-cta"><button className="btn primary" onClick={() => setStep('validate')}>Continue <ChevronRight size={16} /></button></div>
                    </section>
                )}

                {/* STEP 3: VALIDATE - NO PREVIEW */}
                {step === 'validate' && (
                    <section className="page-validate">
                        <div className="validate-container">
                            <div className="validate-left">
                                <button className="back" onClick={() => setStep('targeting')}><ChevronLeft size={20} /></button>
                                <h2>Fix & Validate</h2>
                                <p className="sub">Resolve issues before formatting</p>

                                <div className="issues-list">
                                    {issues.length === 0 ? (
                                        <div className="all-good"><Check size={24} /> All data validated</div>
                                    ) : (
<<<<<<< HEAD
                                        validationErrors.map((err, i) => (
                                            <div key={i} className={`val-item ${err.type}`}>
                                                {err.type === 'error' ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
                                                <span>{err.message}</span>
                                                {err.fixable && <button className="fix-btn" onClick={() => openFixModal(err)}>Fix</button>}
=======
                                        issues.map(iss => (
                                            <div key={iss.id} className={`issue ${iss.type.toLowerCase()}`}>
                                                <div className="issue-icon">{iss.type === 'ERROR' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}</div>
                                                <div className="issue-content">
                                                    <div className="issue-section"><span className="section-tag">{iss.section}</span> <span className="context">{iss.context}</span></div>
                                                    <div className="issue-msg">{iss.message}</div>
                                                </div>
                                                <div className="issue-actions">
                                                    {iss.fixOptions?.map((opt, i) => (
                                                        <button key={i} className="fix-btn" onClick={() => opt.value ? applyFix(iss, opt.value) : (setEditingIssue(iss.id), setEditValue(''))}>{opt.label}</button>
                                                    ))}
                                                    {!iss.fixOptions && <button className="fix-btn" onClick={() => { setEditingIssue(iss.id); setEditValue(''); }}>Fix</button>}
                                                </div>
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
                                            </div>
                                        ))
                                    )}
                                </div>

<<<<<<< HEAD
                                {/* Quick Edit Section */}
                                <div className="quick-edit">
                                    <h4>Quick Edit</h4>
                                    <div className="edit-row">
                                        <label>Name</label>
                                        <input
                                            value={resume.name}
                                            onChange={e => setResume(p => ({ ...p, name: e.target.value }))}
                                            className={validationErrors.some(e => e.field === 'name') ? 'input-error' : ''}
                                        />
                                    </div>
                                    <div className="edit-row">
                                        <label>Email</label>
                                        <input
                                            value={resume.email}
                                            onChange={e => setResume(p => ({ ...p, email: e.target.value }))}
                                            className={validationErrors.some(e => e.field === 'email') ? 'input-error' : ''}
                                        />
                                    </div>
                                    <div className="edit-row">
                                        <label>Phone</label>
                                        <input
                                            value={resume.phone}
                                            onChange={e => setResume(p => ({ ...p, phone: e.target.value }))}
                                            className={validationErrors.some(e => e.field === 'phone') ? 'input-error' : ''}
                                        />
                                    </div>
                                    <div className="edit-row">
                                        <label>LinkedIn</label>
                                        <input
                                            value={resume.linkedin}
                                            onChange={e => setResume(p => ({ ...p, linkedin: e.target.value }))}
                                            placeholder="linkedin.com/in/username"
                                            className={validationErrors.some(e => e.field === 'LinkedIn') ? 'input-error' : ''}
                                        />
                                    </div>
                                    <div className="edit-row">
                                        <label>GitHub</label>
                                        <input
                                            value={resume.github}
                                            onChange={e => setResume(p => ({ ...p, github: e.target.value }))}
                                            placeholder="github.com/username"
                                            className={validationErrors.some(e => e.field === 'GitHub') ? 'input-error' : ''}
                                        />
                                    </div>
                                    <div className="edit-row">
                                        <label>Profile Summary</label>
                                        <textarea
                                            value={resume.profile}
                                            onChange={e => setResume(p => ({ ...p, profile: e.target.value }))}
                                            rows={3}
                                            placeholder="Brief professional summary..."
                                        />
                                    </div>
                                    <div className="edit-row">
                                        <label>Skills</label>
                                        <input
                                            value={resume.skills.flatMap(s => s.items).join(', ')}
                                            onChange={e => {
                                                const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                setResume(p => ({
                                                    ...p,
                                                    skills: [{ category: 'Technical Skills', items: skills }]
                                                }));
                                            }}
                                            placeholder="comma-separated skills"
                                        />
                                    </div>
                                </div>

                                {/* Add Content Section */}
                                <div className="add-content-section">
                                    <h4>Add More Content</h4>
                                    <div className="content-grid">
                                        <button className="content-btn" onClick={() => {
                                            // Add new experience
                                            const newExp = {
                                                role: '',
                                                company: '',
                                                startDate: '',
                                                endDate: '',
                                                bullets: ['']
                                            };
                                            setResume(p => ({
                                                ...p,
                                                experience: [...p.experience, newExp]
                                            }));
                                        }}>
                                            <ChevronRight size={16} />
                                            Add Experience
                                        </button>
                                        <button className="content-btn" onClick={() => {
                                            // Add new project
                                            const newProj = {
                                                name: '',
                                                description: '',
                                                tech: []
                                            };
                                            setResume(p => ({
                                                ...p,
                                                projects: [...p.projects, newProj]
                                            }));
                                        }}>
                                            <ChevronRight size={16} />
                                            Add Project
                                        </button>
                                        <button className="content-btn" onClick={() => {
                                            // Add new education
                                            const newEdu = {
                                                degree: '',
                                                institution: '',
                                                year: ''
                                            };
                                            setResume(p => ({
                                                ...p,
                                                education: [...p.education, newEdu]
                                            }));
                                        }}>
                                            <ChevronRight size={16} />
                                            Add Education
                                        </button>
                                        <button className="content-btn" onClick={() => {
                                            // Add achievement
                                            setResume(p => ({
                                                ...p,
                                                profile: p.profile + '\n- Achievement: ' // Placeholder
                                            }));
                                        }}>
                                            <ChevronRight size={16} />
                                            Add Achievement
                                        </button>
                                    </div>
                                </div>

                                <button
                                    className={`btn primary full ${validationErrors.some(e => e.type === 'error') ? 'btn-error' : ''}`}
                                    onClick={() => {
                                        const hasErrors = validationErrors.some(e => e.type === 'error');
                                        if (hasErrors) {
                                            // Show specific error message
                                            const errorCount = validationErrors.filter(e => e.type === 'error').length;
                                            const errorMessages = validationErrors.filter(e => e.type === 'error').map(e => e.message).join('\n- ');
                                            alert(`⚠️ You still have ${errorCount} critical errors to fix:

- ${errorMessages}

Please use the 'Fix' buttons next to each error to correct issues.`);
                                            // Scroll to error list
                                            document.querySelector('.validation-list')?.scrollIntoView({ behavior: 'smooth' });
                                        } else {
                                            setStep('template');
                                        }
                                    }}
                                >
                                    {validationErrors.some(e => e.type === 'error')
                                        ? `Fix ${validationErrors.filter(e => e.type === 'error').length} Critical Error(s)`
                                        : 'Choose Template'}
                                    <ChevronRight size={16} />
                                </button>
=======
                                <div className="summary-bar">
                                    <span className="err">{issues.filter(i => i.type === 'ERROR').length} errors</span>
                                    <span className="warn">{issues.filter(i => i.type === 'WARNING').length} warnings</span>
                                </div>
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
                            </div>

                            <div className="validate-right">
                                <h3>Extracted Data</h3>
                                <div className="data-card"><Briefcase size={16} /><span>Experience</span><strong>{resume.experience.length} roles</strong></div>
                                <div className="data-card"><GraduationCap size={16} /><span>Education</span><strong>{resume.education.length} entries</strong></div>
                                <div className="data-card"><Code size={16} /><span>Skills</span><strong>{resume.skills.reduce((a, s) => a + s.items.length, 0)} skills</strong></div>
                                <div className="data-card"><Calendar size={16} /><span>Experience</span><strong>{resume.meta.experienceYears} years</strong></div>
                                <div className="profile-tag">{resume.meta.profileLevel}</div>
                            </div>
                        </div>
                        <div className="sticky-cta">
                            <button className="btn primary" disabled={hasErrors} onClick={() => { setPages(paginate(resume)); setStep('template'); }}>
                                {hasErrors ? 'Fix Errors to Continue' : 'Continue to Templates'} <ChevronRight size={16} />
                            </button>
                        </div>
                    </section>
                )}

                {/* STEP 4: TEMPLATE - PREVIEW STARTS HERE */}
                {step === 'template' && (
<<<<<<< HEAD
                    <section className="template-page">
                        <div className="page-layout template-layout">
                            {/* LEFT: Selection Grid */}
                            <div className="template-gallery">
                                <div className="gallery-head">
                                    <button className="back-btn" onClick={() => setStep('validation')}><ChevronLeft size={20} /></button>
                                    <div>
                                        <h2>Choose Template</h2>
                                        <p className="subtitle">Select a professional template that matches your career level.</p>
                                    </div>
                                </div>
                                <div className="template-grid">
                                    {TEMPLATES.map(t => {
                                        const isRecommended = t.bestFor.includes(profileType.type);
                                        const isSelected = template === t.id;
                                        return (
                                            <div
                                                key={t.id}
                                                className={`tpl-card ${isSelected ? 'active' : ''}`}
                                                onClick={() => setTemplate(t.id)}
                                            >
                                                {isRecommended && <div className="tpl-badge recommended">Recommended</div>}
                                                {t.price > 0 && <div className="tpl-badge price">₹{t.price}</div>}

                                                <div className={`tpl-preview-thumb ${t.id}`}>
                                                    <div className="thumb-header" style={{ background: t.colors.primary }} />
                                                    <div className="thumb-body">
                                                        <div className="thumb-line w-75" />
                                                        <div className="thumb-line w-50" />
                                                        <div className="thumb-line w-100 mt-2" />
                                                        <div className="thumb-line w-100" />
                                                    </div>
                                                </div>

                                                <div className="tpl-info">
                                                    <span className="tpl-name">{t.name}</span>
                                                    <div className="tpl-ats-pill">ATS: {t.atsScore}%</div>
                                                </div>

                                                {isSelected && <div className="tpl-selected-check"><Check size={14} /></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* RIGHT: Dark Live Preview */}
                            <div className="template-preview-panel">
                                <div className="preview-top-bar">
                                    <div className="badge-white">Page 1</div>
                                    <div className="preview-controls">
                                        <button className="ctrl-btn"><Maximize size={14} /> Fit</button>
                                        <div className="zoom-pill">100%</div>
                                    </div>
                                </div>

                                <div className="dark-preview-stage">
                                    <h3>Live Preview</h3>
                                    <div className="paper-shadow-wrap">
                                        <A4Preview />
                                    </div>
                                </div>

                                <button className="btn primary full floating-cta" onClick={() => setStep('download')}>
                                    Continue to Download <ChevronRight size={16} />
                                </button>
=======
                    <section className="page-template">
                        <div className="template-container">
                            <div className="template-left">
                                <div className="template-head"><button className="back" onClick={() => setStep('validate')}><ChevronLeft size={20} /></button><h2>Choose Template</h2></div>
                                <div className="template-grid">
                                    {TEMPLATES.map(t => (
                                        <div key={t.id} className={`tpl-card ${template === t.id ? 'active' : ''}`} onClick={() => setTemplate(t.id)}>
                                            <div className="tpl-thumb" style={{ borderTopColor: t.colors.primary }}><div className="tpl-lines" /></div>
                                            <div className="tpl-info"><span className="name">{t.name}</span><span className="tag">{t.tag}</span><span className="ats">ATS {t.atsScore}%</span></div>
                                            {t.price > 0 && <span className="price">₹{t.price}</span>}
                                            {template === t.id && <div className="check"><Check size={14} /></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="template-right">
                                {pages.length > 1 && (
                                    <div className="page-tabs">{pages.map((_, i) => <button key={i} className={activePage === i ? 'active' : ''} onClick={() => setActivePage(i)}>Page {i + 1}</button>)}</div>
                                )}
                                <div className="a4-wrapper"><div className={`a4 ${template}`}>{pages[activePage]?.map((sec, i) => renderPageSection(sec, i))}{!paid && <div className="watermark">hexastack.com</div>}</div></div>
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
                            </div>
                        </div>
                        <div className="sticky-cta"><button className="btn primary" onClick={() => setStep('download')}>Use This Template <ChevronRight size={16} /></button></div>
                    </section>
                )}

                {/* STEP 5: DOWNLOAD - NO PREVIEW */}
                {step === 'download' && (
<<<<<<< HEAD
                    <section className="download-page">
                        <div className="page-layout">
                            <div className="download-preview-wrap">
                                <div className="preview-label">Your Resume Preview</div>
                                <A4Preview />
                                <div className="download-info-card">
                                    <h3>
                                        <FileText size={18} />
                                        {TEMPLATES.find(t => t.id === template)?.name || 'Classic'} Template
                                    </h3>
                                    <p>
                                        Professional resume template optimized for ATS systems and designed to make a strong first impression.
                                    </p>
                                    <div className="download-info-stats">
                                        <div className="download-stat">
                                            <span className="download-stat-value">{TEMPLATES.find(t => t.id === template)?.atsScore || 95}%</span>
                                            <span className="download-stat-label">ATS Score</span>
                                        </div>
                                        <div className="download-stat">
                                            <span className="download-stat-value">{totalPages}</span>
                                            <span className="download-stat-label">Pages</span>
                                        </div>
                                        <div className="download-stat">
                                            <span className="download-stat-value">A4</span>
                                            <span className="download-stat-label">Format</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="download-panel">
                                <button className="back-btn" onClick={() => setStep('template')}><ChevronLeft size={20} /></button>
                                <h2>Download Resume</h2>

                                {/* Final Checklist */}
                                <div className="final-checklist">
                                    <h4>Final Check</h4>
                                    <div className="check-item pass"><Check size={14} /> Name and contact info</div>
                                    <div className="check-item pass"><Check size={14} /> Experience with dates</div>
                                    <div className="check-item pass"><Check size={14} /> Skills categorized</div>
                                    <div className="check-item pass"><Check size={14} /> Education details</div>
                                    {jdAnalysis && <div className="check-item pass"><Check size={14} /> JD Match: {jdAnalysis.matchScore}%</div>}
                                </div>

                                {/* Download Options */}
                                <div className="download-options">
                                    <div className="dl-option free">
                                        <h3>Free</h3>
                                        <ul>
                                            <li><Check size={14} /> PDF Download</li>
                                            <li><X size={14} /> Watermark included</li>
                                        </ul>
                                        <button className="btn secondary full" onClick={downloadPDF}>
                                            <Download size={16} /> Download with Watermark
                                        </button>
                                    </div>

                                    <div className="dl-option paid">
                                        <span className="rec-tag">Recommended</span>
                                        <h3>₹{TEMPLATES.find(t => t.id === template)?.price || 19}</h3>
                                        <ul>
                                            <li><Check size={14} /> Clean PDF</li>
                                            <li><Check size={14} /> No watermark</li>
                                            <li><Check size={14} /> Premium template</li>
                                        </ul>
                                        <button className="btn primary full" onClick={() => { setPaid(true); logStat('paid'); downloadPDF(); }}>
                                            <Download size={16} /> Pay & Download
                                        </button>
                                        <p className="payment-hint">UPI: {CONFIG.upi}</p>
                                    </div>
                                </div>
=======
                    <section className="page-download">
                        <div className="download-card">
                            <button className="back" onClick={() => setStep('template')}><ChevronLeft size={20} /></button>
                            <h2>Download Resume</h2>
                            <div className="checklist">
                                <div className="check-item"><Check size={16} /> {resume.header.name}</div>
                                <div className="check-item"><Check size={16} /> {resume.experience.length} experience entries</div>
                                <div className="check-item"><Check size={16} /> {pages.length} page(s)</div>
                                <div className="check-item"><Check size={16} /> Template: {TEMPLATES.find(t => t.id === template)?.name}</div>
                            </div>
                            <div className="dl-options">
                                <div className="dl-box free"><h3>Free</h3><ul><li><Check size={14} /> PDF</li><li><X size={14} /> Watermark</li></ul><button className="btn secondary" onClick={downloadPDF}><Download size={16} /> Download</button></div>
                                <div className="dl-box paid"><span className="rec">Recommended</span><h3>₹{TEMPLATES.find(t => t.id === template)?.price || 19}</h3><ul><li><Check size={14} /> Clean PDF</li><li><Check size={14} /> No watermark</li></ul><button className="btn primary" onClick={() => { setPaid(true); downloadPDF(); }}><Download size={16} /> Pay & Download</button></div>
>>>>>>> 61b4bd16ddaffd219378fb64e2f955a1c18237d5
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
