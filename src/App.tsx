import { useState, useEffect, useCallback } from 'react';
import { Download, Check, X, FileText, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle, Loader, Upload, Target, Calendar, Briefcase, GraduationCap, Code, Settings } from 'lucide-react';
import './index.css';

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
    const [jdMatch, setJdMatch] = useState<{ score: number; matched: string[]; missing: string[] } | null>(null);
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
                });
            }
        }

        if (r.skills.length === 0) {
            issues.push({ id: 'skills', type: 'WARNING', section: 'Skills', context: 'Skills', message: 'Add skills to improve visibility', field: 'skills' });
        }

        return issues;
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
            }
        }

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

        const projLines = findSection(['projects', 'personal projects'], ['education', 'skills'], 20);
        const projects: CanonicalResume['projects'] = [];
        let cp: CanonicalResume['projects'][0] | null = null;
        for (const line of projLines) {
            if (line.length < 50 && !line.includes('.')) { if (cp) projects.push(cp); cp = { id: `proj_${projects.length}`, name: line, description: '', tech: [] }; }
            else if (cp) cp.description += line + ' ';
        }
        if (cp) projects.push(cp);

        return { header: { name, email, phone, linkedin, github }, profile, experience, education, skills, projects, photo: null, meta: { experienceYears: 0, profileLevel: 'fresher', profileReason: '' } };
    }, []);

    // Upload handler
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        setProcessing(true);
        setProcessingText('Reading your resume...');

        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

            const buf = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

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
            setProcessing(false);
        }
    };

    // JD matching
    useEffect(() => {
        if (!jd.trim()) { setJdMatch(null); return; }
        const rt = [resume.profile, resume.skills.flatMap(s => s.items).join(' '), resume.experience.map(e => e.bullets.join(' ')).join(' ')].join(' ').toLowerCase();
        const jdSkills = [...new Set((jd.match(/\b(python|java|javascript|typescript|react|angular|vue|node|mongodb|sql|aws|docker|kubernetes|git|agile)\b/gi) || []).map(s => s.toLowerCase()))];
        const matched = jdSkills.filter(s => rt.includes(s));
        const missing = jdSkills.filter(s => !rt.includes(s));
        setJdMatch({ score: jdSkills.length ? Math.round((matched.length / jdSkills.length) * 100) : 0, matched, missing });
    }, [jd, resume]);

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

    const hasErrors = issues.some(i => i.type === 'ERROR');

    // Download PDF
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
                </div>
            );
            case 'edu_header': return <h2 key={idx} className="cv-section-title">Education</h2>;
            case 'edu': return <div key={idx} className="cv-edu"><strong>{sec.data.degree}</strong><span>{sec.data.institution} {sec.data.year && `(${sec.data.year})`}</span></div>;
            default: return null;
        }
    };

    return (
        <div className="app">
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
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="summary-bar">
                                    <span className="err">{issues.filter(i => i.type === 'ERROR').length} errors</span>
                                    <span className="warn">{issues.filter(i => i.type === 'WARNING').length} warnings</span>
                                </div>
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
                            </div>
                        </div>
                        <div className="sticky-cta"><button className="btn primary" onClick={() => setStep('download')}>Use This Template <ChevronRight size={16} /></button></div>
                    </section>
                )}

                {/* STEP 5: DOWNLOAD - NO PREVIEW */}
                {step === 'download' && (
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
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
