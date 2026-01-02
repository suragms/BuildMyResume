import { useState, useEffect, useCallback } from 'react';
import { Download, Check, X, FileText, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle, Loader, Upload, Settings } from 'lucide-react';
import './index.css';

// ============== TYPES ==============
interface Experience {
    role: string;
    company: string;
    startDate: string;
    endDate: string;
    bullets: string[];
}

interface Education {
    degree: string;
    institution: string;
    year: string;
}

interface Resume {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    profile: string;
    skills: { category: string; items: string[] }[];
    experience: Experience[];
    education: Education[];
    projects: { name: string; description: string; tech: string[] }[];
    photo: string | null;
}

interface ExtractionStatus {
    field: string;
    status: 'extracted' | 'missing' | 'invalid';
    value?: string;
    message?: string;
}

interface ValidationError {
    field: string;
    type: 'error' | 'warning';
    message: string;
    fixable: boolean;
}

interface TemplateSchema {
    id: string;
    name: string;
    price: number;
    columns: 1 | 2;
    photoRequired: boolean;
    photoPosition: 'top-left' | 'top-right' | 'none';
    sections: string[];
    colors: { primary: string; accent: string; text: string };
    bestFor: string[];
    atsScore: number;
}

// ============== CONFIG ==============
const CONFIG = {
    upi: 'hexastack@upi',
    paypal: 'paypal.me/hexastack',
    watermark: 'hexastack.com'
};

// A4 dimensions at 96 DPI (794x1123px)

// ============== TEMPLATE SCHEMAS ==============
const TEMPLATES: TemplateSchema[] = [
    {
        id: 'classic',
        name: 'Classic',
        price: 0,
        columns: 1,
        photoRequired: false,
        photoPosition: 'none',
        sections: ['header', 'profile', 'experience', 'education', 'skills', 'projects'],
        colors: { primary: '#1a1a1a', accent: '#334155', text: '#374151' },
        bestFor: ['fresher', 'intern', 'professional'],
        atsScore: 95
    },
    {
        id: 'minimal',
        name: 'Minimal',
        price: 0,
        columns: 1,
        photoRequired: false,
        photoPosition: 'none',
        sections: ['header', 'profile', 'skills', 'experience', 'education'],
        colors: { primary: '#111827', accent: '#6b7280', text: '#4b5563' },
        bestFor: ['fresher', 'intern'],
        atsScore: 98
    },
    {
        id: 'modern',
        name: 'Modern',
        price: 19,
        columns: 2,
        photoRequired: true,
        photoPosition: 'top-right',
        sections: ['header', 'profile', 'experience', 'skills', 'projects', 'education'],
        colors: { primary: '#1e40af', accent: '#3b82f6', text: '#1f2937' },
        bestFor: ['professional', 'senior'],
        atsScore: 88
    },
    {
        id: 'executive',
        name: 'Executive',
        price: 49,
        columns: 2,
        photoRequired: true,
        photoPosition: 'top-left',
        sections: ['header', 'profile', 'experience', 'skills', 'education', 'projects'],
        colors: { primary: '#0c4a6e', accent: '#0284c7', text: '#1e293b' },
        bestFor: ['senior', 'professional'],
        atsScore: 85
    }
];

// ============== STEPS ==============
type Step = 'upload' | 'targeting' | 'validation' | 'template' | 'download';

// ============== MAIN APP ==============
export default function App() {
    const [step, setStep] = useState<Step>('upload');
    const [processing, setProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState(0);

    const [resume, setResume] = useState<Resume>({
        name: '', email: '', phone: '', linkedin: '', github: '', profile: '',
        skills: [], experience: [], education: [], projects: [], photo: null
    });

    const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus[]>([]);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [jd, setJd] = useState('');
    const [jdAnalysis, setJdAnalysis] = useState<{ matched: string[]; missing: string[]; score: number } | null>(null);
    const [template, setTemplate] = useState('classic');
    const [paid, setPaid] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showAdmin, setShowAdmin] = useState(false);
    const [profileType, setProfileType] = useState<{ type: string; years: number; reason: string }>({ type: 'fresher', years: 0, reason: '' });

    // Stats
    const [stats, setStats] = useState(() => JSON.parse(localStorage.getItem('hx_stats') || '{"uploads":0,"downloads":0,"paid":0}'));
    const logStat = (key: 'uploads' | 'downloads' | 'paid') => {
        const s = { ...stats, [key]: stats[key] + 1 };
        setStats(s);
        localStorage.setItem('hx_stats', JSON.stringify(s));
    };

    // Admin hotkey
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key === 'A') setShowAdmin(true); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    // ============== DATE VALIDATION ==============
    const parseDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        const formats = [
            /(\d{2})\/(\d{4})/, // MM/YYYY
            /(\w+)\s+(\d{4})/, // Month YYYY
            /(\d{4})/ // YYYY
        ];
        for (const fmt of formats) {
            const match = dateStr.match(fmt);
            if (match) {
                if (match.length === 3 && /^\d+$/.test(match[1])) {
                    return new Date(parseInt(match[2]), parseInt(match[1]) - 1);
                }
                if (match.length === 3) {
                    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
                    const m = months[match[1].toLowerCase().slice(0, 3)];
                    if (m !== undefined) return new Date(parseInt(match[2]), m);
                }
                if (match.length === 2) {
                    return new Date(parseInt(match[1]), 0);
                }
            }
        }
        return null;
    };

    const isValidDateRange = (start: string, end: string): boolean => {
        if (end.toLowerCase() === 'present' || end.toLowerCase() === 'current') return true;
        const s = parseDate(start);
        const e = parseDate(end);
        if (!s || !e) return false;
        return s <= e;
    };

    const calculateYearsExp = (experiences: Experience[]): number => {
        let total = 0;
        for (const exp of experiences) {
            const start = parseDate(exp.startDate);
            const end = exp.endDate.toLowerCase() === 'present' ? new Date() : parseDate(exp.endDate);
            if (start && end) {
                total += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
            }
        }
        return Math.round(total * 10) / 10;
    };

    // ============== HARD VALIDATION ==============
    const runHardValidation = useCallback((r: Resume): ValidationError[] => {
        const errors: ValidationError[] = [];

        // Required fields
        if (!r.name.trim()) errors.push({ field: 'name', type: 'error', message: 'Name is required', fixable: true });
        if (!r.email.trim()) errors.push({ field: 'email', type: 'error', message: 'Email is required', fixable: true });
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
            errors.push({ field: 'email', type: 'error', message: 'Invalid email format', fixable: true });
        }

        // Phone validation
        if (!r.phone.trim()) {
            errors.push({ field: 'phone', type: 'warning', message: 'Phone recommended for contact', fixable: true });
        } else {
            const phoneClean = r.phone.replace(/[\s\-\(\)]/g, '');
            if (!/^\+?\d{10,15}$/.test(phoneClean)) {
                errors.push({ field: 'phone', type: 'error', message: 'Invalid phone format', fixable: true });
            }
        }

        // Date validation for each experience
        for (let i = 0; i < r.experience.length; i++) {
            const exp = r.experience[i];
            if (!exp.startDate) {
                errors.push({ field: `exp_${i}_start`, type: 'error', message: `${exp.role}: Missing start date`, fixable: true });
            }
            if (!exp.endDate) {
                errors.push({ field: `exp_${i}_end`, type: 'error', message: `${exp.role}: Missing end date`, fixable: true });
            }
            if (exp.startDate && exp.endDate && !isValidDateRange(exp.startDate, exp.endDate)) {
                errors.push({ field: `exp_${i}_date`, type: 'error', message: `${exp.role}: End date before start date`, fixable: true });
            }
        }

        // Check for overlapping roles
        const sortedExp = [...r.experience].sort((a, b) => {
            const aStart = parseDate(a.startDate);
            const bStart = parseDate(b.startDate);
            return (aStart?.getTime() || 0) - (bStart?.getTime() || 0);
        });

        for (let i = 0; i < sortedExp.length - 1; i++) {
            const current = sortedExp[i];
            const next = sortedExp[i + 1];
            const currEnd = current.endDate.toLowerCase() === 'present' ? new Date() : parseDate(current.endDate);
            const nextStart = parseDate(next.startDate);
            if (currEnd && nextStart && currEnd > nextStart) {
                errors.push({
                    field: `exp_overlap_${i}`,
                    type: 'warning',
                    message: `Overlapping dates: ${current.role} and ${next.role}`,
                    fixable: false
                });
            }
        }

        // Experience years vs profile type
        const years = calculateYearsExp(r.experience);
        if (years > 10 && r.experience.some(e => /intern|trainee/i.test(e.role))) {
            errors.push({
                field: 'profile_mismatch',
                type: 'error',
                message: 'Profile shows 10+ years but has intern roles - verify accuracy',
                fixable: false
            });
        }

        // Skills validation
        if (r.skills.length === 0 || r.skills.every(s => s.items.length === 0)) {
            errors.push({ field: 'skills', type: 'warning', message: 'Add skills to improve visibility', fixable: true });
        }

        return errors;
    }, []);

    // ============== PROFILE DETECTION ==============
    const detectProfile = useCallback((r: Resume) => {
        const years = calculateYearsExp(r.experience);
        const expText = r.experience.map(e => e.role + ' ' + e.bullets.join(' ')).join(' ').toLowerCase();

        let type = 'fresher';
        let reason = '';

        if (years >= 8 || /director|vp|head of|principal|architect/i.test(expText)) {
            type = 'senior';
            reason = years >= 8 ? `${years} years of experience` : 'Leadership role detected';
        } else if (years >= 3 || /senior|lead|manager/i.test(expText)) {
            type = 'professional';
            reason = years >= 3 ? `${years} years of experience` : 'Senior-level role detected';
        } else if (/intern|trainee|apprentice/i.test(expText)) {
            type = 'intern';
            reason = 'Internship or training role detected';
        } else {
            type = 'fresher';
            reason = years > 0 ? `${years} years experience` : 'Entry-level or recent graduate';
        }

        return { type, years, reason };
    }, []);

    // ============== RESUME PARSING ==============
    const parseResume = useCallback((text: string): { resume: Resume; status: ExtractionStatus[] } => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const status: ExtractionStatus[] = [];

        // Name detection
        let name = '';
        for (const line of lines.slice(0, 5)) {
            const cleaned = line.replace(/[^a-zA-Z\s]/g, '').trim();
            const words = cleaned.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2 && words.length <= 4 && cleaned.length < 50) {
                if (!['summary', 'profile', 'experience', 'education', 'skills', 'objective'].some(k => cleaned.toLowerCase().includes(k))) {
                    name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    break;
                }
            }
        }
        status.push(name ? { field: 'Name', status: 'extracted', value: name } : { field: 'Name', status: 'missing', message: 'Could not detect name' });

        // Email
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch?.[0] || '';
        if (email) {
            status.push({ field: 'Email', status: 'extracted', value: email });
        } else {
            status.push({ field: 'Email', status: 'missing', message: 'No email found' });
        }

        // Phone - improved detection
        const phonePatterns = [
            /(?:\+91[-\s]?)?[6-9]\d{9}/,
            /\+?[0-9]{1,3}[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/,
            /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/
        ];
        let phone = '';
        for (const pattern of phonePatterns) {
            const match = text.match(pattern);
            if (match) { phone = match[0].replace(/\s+/g, ''); break; }
        }
        if (phone) {
            status.push({ field: 'Phone', status: 'extracted', value: phone });
        } else {
            status.push({ field: 'Phone', status: 'missing', message: 'No phone number found' });
        }

        // LinkedIn & GitHub
        const linkedin = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)?.[0] || '';
        const github = text.match(/github\.com\/[a-zA-Z0-9_-]+/i)?.[0] || '';
        if (linkedin) status.push({ field: 'LinkedIn', status: 'extracted', value: linkedin });
        if (github) status.push({ field: 'GitHub', status: 'extracted', value: github });

        // Section finder helper
        const findSection = (keywords: string[], endKeywords: string[], maxLines = 20): string[] => {
            const lower = lines.map(l => l.toLowerCase());
            let start = -1;
            for (let i = 0; i < lower.length; i++) {
                if (keywords.some(k => lower[i].includes(k) && lower[i].length < 50)) { start = i; break; }
            }
            if (start === -1) return [];
            let end = Math.min(start + maxLines, lines.length);
            for (let i = start + 1; i < lines.length; i++) {
                if (endKeywords.some(k => lower[i].includes(k) && lower[i].length < 50)) { end = i; break; }
            }
            return lines.slice(start + 1, end);
        };

        // Profile
        const profileLines = findSection(['summary', 'profile', 'objective', 'about me'], ['experience', 'work', 'skills', 'education'], 6);
        const profile = profileLines.join(' ').slice(0, 500);
        if (profile) status.push({ field: 'Profile', status: 'extracted' });

        // Skills
        const skillLines = findSection(['skills', 'technical skills', 'technologies', 'competencies'], ['experience', 'work', 'education', 'projects'], 15);
        const skillText = skillLines.join(' ');

        const langMatch = skillText.match(/\b(python|java|javascript|typescript|c\+\+|c#|go|rust|ruby|php|swift|kotlin|scala|r\b|sql)\b/gi) || [];
        const fwMatch = skillText.match(/\b(react|angular|vue|node|express|django|flask|spring|laravel|rails|nextjs|next\.js)\b/gi) || [];
        const toolMatch = skillText.match(/\b(docker|kubernetes|aws|azure|gcp|git|jenkins|mongodb|postgresql|mysql|redis|terraform)\b/gi) || [];

        const skills: { category: string; items: string[] }[] = [];
        const uniqLangs = [...new Set(langMatch.map(s => s.toLowerCase()))];
        const uniqFws = [...new Set(fwMatch.map(s => s.toLowerCase()))];
        const uniqTools = [...new Set(toolMatch.map(s => s.toLowerCase()))];

        if (uniqLangs.length) skills.push({ category: 'Languages', items: uniqLangs });
        if (uniqFws.length) skills.push({ category: 'Frameworks', items: uniqFws });
        if (uniqTools.length) skills.push({ category: 'Tools', items: uniqTools });

        if (skills.length > 0) {
            status.push({ field: 'Skills', status: 'extracted', value: `${uniqLangs.length + uniqFws.length + uniqTools.length} skills found` });
        } else {
            status.push({ field: 'Skills', status: 'missing', message: 'No technical skills detected' });
        }

        // Experience
        const expLines = findSection(['experience', 'work experience', 'professional experience', 'employment'], ['education', 'skills', 'projects', 'certifications'], 40);
        const experience: Experience[] = [];
        let currentExp: Experience | null = null;

        for (const line of expLines) {
            // Date detection
            const datePattern = /(\d{2}\/\d{4}|\w+\s+\d{4}|\d{4})\s*[-–to]+\s*(\d{2}\/\d{4}|\w+\s+\d{4}|\d{4}|present|current)/i;
            const dateMatch = line.match(datePattern);

            if (dateMatch || /^(software|senior|junior|lead|manager|developer|engineer|analyst|designer|intern|associate)/i.test(line)) {
                if (currentExp && currentExp.role) experience.push(currentExp);

                const parts = line.split(/\s+[-–|at@]\s+/);
                currentExp = {
                    role: parts[0]?.replace(datePattern, '').trim() || line.replace(datePattern, '').trim(),
                    company: parts[1]?.replace(datePattern, '').trim() || '',
                    startDate: dateMatch?.[1] || '',
                    endDate: dateMatch?.[2] || '',
                    bullets: []
                };
            } else if (currentExp && line.length > 15) {
                // Clean bullet point
                const bullet = line.replace(/^[-•*]\s*/, '').trim();
                if (bullet.length > 10) currentExp.bullets.push(bullet);
            }
        }
        if (currentExp && currentExp.role) experience.push(currentExp);

        if (experience.length > 0) {
            status.push({ field: 'Experience', status: 'extracted', value: `${experience.length} roles found` });
        } else {
            status.push({ field: 'Experience', status: 'missing', message: 'No work experience detected' });
        }

        // Education
        const eduLines = findSection(['education', 'academic', 'qualification', 'degree'], ['skills', 'projects', 'experience', 'certifications'], 12);
        const education: Education[] = [];
        for (const line of eduLines) {
            if (/bachelor|master|b\.?tech|m\.?tech|bsc|msc|mba|phd|degree|university|college|institute/i.test(line)) {
                education.push({
                    degree: line.match(/(bachelor|master|b\.?tech|m\.?tech|b\.?e|m\.?e|bsc|msc|mba|bba|phd|diploma)[^,]*/i)?.[0] || line,
                    institution: line.match(/(university|college|institute|school)[^,]*/i)?.[0] || '',
                    year: line.match(/\d{4}/)?.[0] || ''
                });
            }
        }
        if (education.length > 0) {
            status.push({ field: 'Education', status: 'extracted', value: `${education.length} entries found` });
        } else {
            status.push({ field: 'Education', status: 'missing', message: 'No education found' });
        }

        // Projects
        const projLines = findSection(['projects', 'personal projects', 'portfolio', 'key projects'], ['education', 'skills', 'achievements', 'certifications'], 25);
        const projects: { name: string; description: string; tech: string[] }[] = [];
        let currentProj: { name: string; description: string; tech: string[] } | null = null;

        for (const line of projLines) {
            if (line.length < 50 && !line.includes('.') && !/^\d/.test(line)) {
                if (currentProj) projects.push(currentProj);
                currentProj = { name: line, description: '', tech: [] };
            } else if (currentProj) {
                currentProj.description += line + ' ';
                const techMatch = line.match(/\b(react|node|python|java|mongodb|postgresql|aws|docker|typescript|javascript)\b/gi);
                if (techMatch) currentProj.tech.push(...techMatch);
            }
        }
        if (currentProj) projects.push(currentProj);
        if (projects.length > 0) {
            status.push({ field: 'Projects', status: 'extracted', value: `${projects.length} projects found` });
        }

        return {
            resume: { name, email, phone, linkedin, github, profile, skills, experience, education, projects, photo: null },
            status
        };
    }, []);

    // ============== FILE UPLOAD ==============
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { alert('Please upload a PDF file'); return; }
        if (file.size > 10 * 1024 * 1024) { alert('File too large. Max 10MB'); return; }

        logStat('uploads');
        setProcessing(true);
        setProcessingStage(0);

        try {
            // Stage 1: Reading
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
            setProcessingStage(1);

            const buf = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            setTotalPages(pdf.numPages);

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                let pageText = '';
                let lastY = 0;
                for (const item of content.items as any[]) {
                    if (item.str) {
                        if (lastY && Math.abs(item.transform[5] - lastY) > 5) pageText += '\n';
                        pageText += item.str + ' ';
                        lastY = item.transform[5];
                    }
                }
                fullText += pageText + '\n\n';
            }

            // Stage 2: Extracting
            setProcessingStage(2);
            await new Promise(r => setTimeout(r, 200));
            const { resume: parsed, status } = parseResume(fullText);
            setResume(parsed);
            setExtractionStatus(status);

            // Stage 3: Analyzing
            setProcessingStage(3);
            await new Promise(r => setTimeout(r, 200));
            const profile = detectProfile(parsed);
            setProfileType(profile);

            // Stage 4: Validating
            setProcessingStage(4);
            await new Promise(r => setTimeout(r, 200));
            const errors = runHardValidation(parsed);
            setValidationErrors(errors);

            setProcessing(false);
            setStep('targeting');

        } catch (err) {
            console.error('PDF Error:', err);
            alert('Error reading PDF. Try a different file.');
            setProcessing(false);
        }
    };

    // ============== JD ANALYSIS ==============
    useEffect(() => {
        if (!jd.trim()) { setJdAnalysis(null); return; }

        const analyze = () => {
            const resumeText = [
                resume.profile,
                resume.skills.flatMap(s => s.items).join(' '),
                resume.experience.map(e => e.bullets.join(' ')).join(' '),
                resume.projects.map(p => p.description).join(' ')
            ].join(' ').toLowerCase();

            // Extract JD skills
            const jdSkills = (jd.match(/\b(python|java|javascript|typescript|react|angular|vue|node|mongodb|sql|aws|azure|docker|kubernetes|git|agile|scrum|ci\/cd|rest|api|microservices|html|css|tensorflow|pytorch|flask|django|spring)\b/gi) || [])
                .map(s => s.toLowerCase());
            const uniqueJdSkills = [...new Set(jdSkills)];

            const matched = uniqueJdSkills.filter(s => resumeText.includes(s));
            const missing = uniqueJdSkills.filter(s => !resumeText.includes(s));
            const score = uniqueJdSkills.length > 0 ? Math.round((matched.length / uniqueJdSkills.length) * 100) : 0;

            setJdAnalysis({ matched, missing, score });
        };

        const t = setTimeout(analyze, 500);
        return () => clearTimeout(t);
    }, [jd, resume]);

    // ============== PROCEED TO VALIDATION ==============
    const proceedToValidation = () => {
        const errors = runHardValidation(resume);
        setValidationErrors(errors);
        setStep('validation');
    };

    // ============== PDF DOWNLOAD ==============
    const downloadPDF = async () => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        const w = 210, m = 20, cw = w - m * 2;
        let y = 25;

        const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];

        // Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(tpl.colors.primary);
        doc.text(resume.name || 'Your Name', m, y);
        y += 8;

        // Contact
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        const contact = [resume.email, resume.phone].filter(Boolean).join(' | ');
        if (contact) { doc.text(contact, m, y); y += 4; }
        const links = [resume.linkedin, resume.github].filter(Boolean).join(' | ');
        if (links) { doc.text(links, m, y); y += 5; }

        y += 3;
        doc.setDrawColor(200);
        doc.line(m, y, w - m, y);
        y += 8;

        const addSection = (title: string, content: string) => {
            if (!content) return;
            if (y > 265) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(tpl.colors.primary);
            doc.text(title.toUpperCase(), m, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(60);
            const lines = doc.splitTextToSize(content, cw);
            for (const line of lines) {
                if (y > 275) { doc.addPage(); y = 20; }
                doc.text(line, m, y);
                y += 4;
            }
            y += 5;
        };

        // Sections based on template order
        for (const sec of tpl.sections) {
            switch (sec) {
                case 'profile': addSection('Profile', resume.profile); break;
                case 'skills':
                    addSection('Skills', resume.skills.map(s => s.category + ': ' + s.items.join(', ')).join('\n'));
                    break;
                case 'experience':
                    for (const exp of resume.experience) {
                        if (y > 260) { doc.addPage(); y = 20; }
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(10);
                        doc.setTextColor(40);
                        doc.text(exp.role + (exp.company ? ' at ' + exp.company : ''), m, y);
                        y += 4;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(8);
                        doc.setTextColor(100);
                        doc.text(exp.startDate + ' - ' + exp.endDate, m, y);
                        y += 4;
                        doc.setFontSize(9);
                        doc.setTextColor(60);
                        for (const bullet of exp.bullets.slice(0, 4)) {
                            const bulletLines = doc.splitTextToSize('• ' + bullet, cw);
                            for (const bl of bulletLines) {
                                if (y > 275) { doc.addPage(); y = 20; }
                                doc.text(bl, m, y);
                                y += 4;
                            }
                        }
                        y += 3;
                    }
                    break;
                case 'education':
                    addSection('Education', resume.education.map(e => e.degree + (e.institution ? ', ' + e.institution : '') + (e.year ? ' (' + e.year + ')' : '')).join('\n'));
                    break;
                case 'projects':
                    addSection('Projects', resume.projects.map(p => p.name + ': ' + p.description.slice(0, 150)).join('\n\n'));
                    break;
            }
        }

        if (!paid) {
            doc.setFontSize(8);
            doc.setTextColor(180);
            doc.text(CONFIG.watermark, w / 2, 290, { align: 'center' });
        }

        doc.save((resume.name.replace(/\s+/g, '_') || 'resume') + '.pdf');
        logStat('downloads');
    };

    // ============== A4 PREVIEW COMPONENT ==============
    const A4Preview = () => {
        const tpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];

        return (
            <div className="a4-preview-wrap">
                <div className="page-tabs">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} className={currentPage === i + 1 ? 'active' : ''} onClick={() => setCurrentPage(i + 1)}>
                            Page {i + 1}
                        </button>
                    ))}
                </div>
                <div className="a4-frame">
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
                                    <h2>Profile</h2>
                                    <p>{resume.profile}</p>
                                </div>
                            )}
                            {resume.skills.length > 0 && (
                                <div className="cv-section">
                                    <h2>Skills</h2>
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
                                    <h2>Experience</h2>
                                    {resume.experience.slice(0, 3).map((exp, i) => (
                                        <div key={i} className="exp-entry">
                                            <div className="exp-head">
                                                <strong>{exp.role}</strong>
                                                <span className="exp-date">{exp.startDate} - {exp.endDate}</span>
                                            </div>
                                            <div className="exp-company">{exp.company}</div>
                                            <ul>
                                                {exp.bullets.slice(0, 2).map((b, j) => <li key={j}>{b.slice(0, 80)}{b.length > 80 ? '...' : ''}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {resume.education.length > 0 && (
                                <div className="cv-section">
                                    <h2>Education</h2>
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
            </div>
        );
    };

    // ============== RENDER ==============
    return (
        <div className="app">
            {/* HEADER */}
            {step !== 'upload' && (
                <header>
                    <div className="logo" onClick={() => setStep('upload')}>
                        <FileText size={18} />
                        <span>HexaStack</span>
                    </div>
                    <div className="step-nav">
                        {['Upload', 'Target', 'Validate', 'Template', 'Download'].map((s, i) => {
                            const steps: Step[] = ['upload', 'targeting', 'validation', 'template', 'download'];
                            const isActive = steps.indexOf(step) >= i;
                            return (
                                <div key={s} className={`step-item ${isActive ? 'active' : ''}`}>
                                    <div className="step-num">{i + 1}</div>
                                    <span>{s}</span>
                                </div>
                            );
                        })}
                    </div>
                    <button className="icon-btn" onClick={() => setShowAdmin(true)}><Settings size={18} /></button>
                </header>
            )}

            {/* ADMIN MODAL */}
            {showAdmin && (
                <div className="overlay" onClick={() => setShowAdmin(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Admin Dashboard</h3>
                            <button onClick={() => setShowAdmin(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="stat-grid">
                                <div className="stat"><span>{stats.uploads}</span><small>Uploads</small></div>
                                <div className="stat"><span>{stats.downloads}</span><small>Downloads</small></div>
                                <div className="stat"><span>{stats.paid}</span><small>Paid</small></div>
                            </div>
                            <div className="admin-section">
                                <h4>Template Pricing</h4>
                                {TEMPLATES.filter(t => t.price > 0).map(t => (
                                    <div key={t.id} className="admin-row">
                                        <span>{t.name}</span>
                                        <span>₹{t.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main>
                {/* STEP 1: UPLOAD */}
                {step === 'upload' && (
                    <section className="upload-page">
                        {processing ? (
                            <div className="processing-box">
                                <div className="spinner" />
                                <h3>Processing your resume</h3>
                                <div className="processing-steps">
                                    {['Reading PDF', 'Extracting sections', 'Analyzing content', 'Validating data'].map((s, i) => (
                                        <div key={i} className={`p-step ${i < processingStage ? 'done' : ''} ${i === processingStage ? 'active' : ''}`}>
                                            {i < processingStage ? <Check size={14} /> : i === processingStage ? <Loader size={14} className="spin" /> : <span>{i + 1}</span>}
                                            <span>{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="upload-content">
                                <div className="hero-badge">Resume Formatter</div>
                                <h1>Upload your resume</h1>
                                <p className="hero-sub">Get a formatted PDF. No login. No data stored.</p>

                                <div className="upload-zone">
                                    <input type="file" accept=".pdf" id="resume-file" onChange={handleUpload} />
                                    <label htmlFor="resume-file">
                                        <Upload size={32} />
                                        <span>Drop PDF here or click to upload</span>
                                        <small>Max 10MB • PDF only</small>
                                    </label>
                                </div>

                                <div className="trust-badges">
                                    <span><Check size={14} /> No signup</span>
                                    <span><Check size={14} /> Files not stored</span>
                                    <span><Check size={14} /> Free preview</span>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* STEP 2: TARGETING (Optional JD) */}
                {step === 'targeting' && (
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

                                {/* Optional JD Input */}
                                <div className="jd-section">
                                    <h4>Target a Job (Optional)</h4>
                                    <textarea
                                        value={jd}
                                        onChange={e => setJd(e.target.value)}
                                        placeholder="Paste job description to match keywords..."
                                        rows={5}
                                    />
                                    {jdAnalysis && (
                                        <div className="jd-results">
                                            <div className="jd-score">{jdAnalysis.score}% Match</div>
                                            <div className="jd-tags">
                                                {jdAnalysis.matched.slice(0, 5).map((m, i) => <span key={i} className="tag matched">{m}</span>)}
                                                {jdAnalysis.missing.slice(0, 3).map((m, i) => <span key={i} className="tag missing">{m}</span>)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button className="btn primary full" onClick={proceedToValidation}>
                                    Continue to Validation <ChevronRight size={16} />
                                </button>
                            </div>

                            <div className="right-panel">
                                <A4Preview />
                            </div>
                        </div>
                    </section>
                )}

                {/* STEP 3: VALIDATION GATE */}
                {step === 'validation' && (
                    <section className="validation-page">
                        <div className="page-layout">
                            <div className="left-panel">
                                <button className="back-btn" onClick={() => setStep('targeting')}><ChevronLeft size={20} /></button>
                                <h2>Validation Gate</h2>
                                <p className="subtitle">Fix issues before proceeding. Errors must be resolved.</p>

                                {/* Validation Results */}
                                <div className="validation-list">
                                    {validationErrors.length === 0 ? (
                                        <div className="all-pass">
                                            <Check size={24} />
                                            <span>All checks passed</span>
                                        </div>
                                    ) : (
                                        validationErrors.map((err, i) => (
                                            <div key={i} className={`val-item ${err.type}`}>
                                                {err.type === 'error' ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
                                                <span>{err.message}</span>
                                                {err.fixable && <button className="fix-btn">Fix</button>}
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Quick Edit Section */}
                                <div className="quick-edit">
                                    <h4>Quick Edit</h4>
                                    <div className="edit-row">
                                        <label>Name</label>
                                        <input value={resume.name} onChange={e => setResume(p => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div className="edit-row">
                                        <label>Email</label>
                                        <input value={resume.email} onChange={e => setResume(p => ({ ...p, email: e.target.value }))} />
                                    </div>
                                    <div className="edit-row">
                                        <label>Phone</label>
                                        <input value={resume.phone} onChange={e => setResume(p => ({ ...p, phone: e.target.value }))} />
                                    </div>
                                </div>

                                <button
                                    className="btn primary full"
                                    disabled={validationErrors.some(e => e.type === 'error')}
                                    onClick={() => setStep('template')}
                                >
                                    {validationErrors.some(e => e.type === 'error') ? 'Fix Errors to Continue' : 'Choose Template'}
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <div className="right-panel">
                                <A4Preview />
                            </div>
                        </div>
                    </section>
                )}

                {/* STEP 4: TEMPLATE SELECTION */}
                {step === 'template' && (
                    <section className="template-page">
                        <div className="page-layout template-layout">
                            <div className="template-gallery">
                                <div className="gallery-head">
                                    <button className="back-btn" onClick={() => setStep('validation')}><ChevronLeft size={20} /></button>
                                    <h2>Choose Template</h2>
                                </div>
                                <div className="template-grid">
                                    {TEMPLATES.map(t => (
                                        <div
                                            key={t.id}
                                            className={`tpl-card ${template === t.id ? 'active' : ''} ${t.price > 0 && !paid ? 'premium' : ''}`}
                                            onClick={() => setTemplate(t.id)}
                                        >
                                            <div className={`tpl-preview ${t.id}`}>
                                                <div className="tpl-header" style={{ background: t.colors.primary }} />
                                                <div className="tpl-body" />
                                            </div>
                                            <div className="tpl-info">
                                                <span className="tpl-name">{t.name}</span>
                                                <span className="tpl-ats">ATS: {t.atsScore}%</span>
                                                <span className="tpl-for">{t.bestFor.join(', ')}</span>
                                                {t.price > 0 && <span className="tpl-price">₹{t.price}</span>}
                                            </div>
                                            {template === t.id && <div className="tpl-check"><Check size={14} /></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="template-preview-panel">
                                <h3>Live Preview</h3>
                                <A4Preview />
                                <button className="btn primary full" onClick={() => setStep('download')}>
                                    Continue <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* STEP 5: DOWNLOAD */}
                {step === 'download' && (
                    <section className="download-page">
                        <div className="page-layout">
                            <div className="download-preview-wrap">
                                <A4Preview />
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
                                    {jdAnalysis && <div className="check-item pass"><Check size={14} /> JD Match: {jdAnalysis.score}%</div>}
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
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <footer>
                <p>HexaStack Resume Formatter</p>
                <div className="footer-links">
                    <span>No signup required</span>
                    <span>Files deleted after processing</span>
                    <span>No tracking</span>
                </div>
            </footer>
        </div>
    );
}
