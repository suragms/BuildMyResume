import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Check, X, FileText, ChevronRight, ChevronLeft, Pencil, Layout, Zap, Shield, Clock, Link, AlertCircle, Sparkles, Target, CheckCircle2, XCircle, Crown, Star, ZoomIn, ZoomOut } from 'lucide-react';
import { extractKeywords, checkGrammar, matchATSKeywords, calculateATSScore, detectExperienceLevel, getMissingSections, type KeywordResult, type ATSMatch, type GrammarResult } from './ai-service';
import './index.css';

const CONFIG = { price: 19, watermark: 'hexastack.com' };

const stats = {
    get: () => JSON.parse(localStorage.getItem('hxstats') || '{"u":0,"p":0,"d":0}'),
    log: (t: 'u' | 'p' | 'd') => { const s = stats.get(); s[t]++; localStorage.setItem('hxstats', JSON.stringify(s)); }
};

interface Resume {
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
    jobRole: string;
    jobDescription: string;
    specifications: string;
}

interface ParseLog {
    section: string;
    status: 'found' | 'missing' | 'error';
    content?: string;
}

type Step = 'home' | 'loading' | 'edit' | 'template' | 'preview' | 'pay' | 'done';

const TEMPLATES = [
    // Free Templates
    { id: 'classic', name: 'Classic', desc: 'Clean and traditional', price: 0, atsScore: 95 },
    { id: 'modern', name: 'Modern', desc: 'Contemporary design', price: 0, atsScore: 92 },
    // Premium Templates
    { id: 'executive', name: 'Executive', desc: 'Bold professional style', price: 19, atsScore: 98 },
    { id: 'minimal', name: 'Minimal', desc: 'Simple elegance', price: 29, atsScore: 96 },
    { id: 'creative', name: 'Creative', desc: 'Stand out design', price: 29, atsScore: 88 },
    { id: 'premium', name: 'Premium Plus', desc: 'All features included', price: 69, atsScore: 99 },
];

export default function App() {
    const [step, setStep] = useState<Step>('home');
    const [resume, setResume] = useState<Resume>({
        name: '', email: '', phone: '', linkedin: '', github: '',
        profile: '', skills: [], experience: '', education: '', projects: '', achievements: '',
        jobRole: '', jobDescription: '', specifications: ''
    });
    const [template, setTemplate] = useState('classic');
    const [editing, setEditing] = useState<string | null>(null);
    const [paid, setPaid] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [parseLog, setParseLog] = useState<ParseLog[]>([]);
    const [jdKeywords, setJdKeywords] = useState<KeywordResult | null>(null);
    const [atsMatches, setAtsMatches] = useState<ATSMatch[]>([]);
    const [atsScore, setAtsScore] = useState<number>(0);
    const [grammarResults, setGrammarResults] = useState<Record<string, GrammarResult>>({});
    const [experienceLevel, setExperienceLevel] = useState<'fresher' | 'experienced' | 'unknown'>('unknown');
    const [missingSections, setMissingSections] = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [cvScale, setCvScale] = useState(0.7);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const cvPaperRef = useRef<HTMLDivElement>(null);

    // Dynamic CV scaling for preview
    useEffect(() => {
        const calculateScale = () => {
            if (step !== 'template') return;
            if (!previewContainerRef.current || !cvPaperRef.current) return;
            const containerWidth = previewContainerRef.current.clientWidth - 60;
            const paperWidth = 595;
            const scaleW = containerWidth / paperWidth;
            const idealScale = Math.min(scaleW, 0.85);
            setCvScale(Math.max(idealScale, 0.4));
        };
        const timeout = setTimeout(calculateScale, 150);
        window.addEventListener('resize', calculateScale);
        return () => {
            window.removeEventListener('resize', calculateScale);
            clearTimeout(timeout);
        };
    }, [step, template]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key === 'A') { setIsAdmin(true); setShowAdmin(true); } };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    // Auto-save resume to localStorage
    useEffect(() => {
        if (resume.name || resume.email || resume.skills.length > 0) {
            localStorage.setItem('hexastack_resume', JSON.stringify(resume));
        }
    }, [resume]);

    // Load saved resume on mount
    useEffect(() => {
        const saved = localStorage.getItem('hexastack_resume');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.name || parsed.email) {
                    setResume(parsed);
                }
            } catch (e) {
                console.error('Failed to load saved resume');
            }
        }
    }, []);

    // Auto-save to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('hexaResume');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setResume(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error('Failed to load saved resume');
            }
        }
    }, []);

    useEffect(() => {
        if (resume.name || resume.email || resume.skills.length > 0) {
            localStorage.setItem('hexaResume', JSON.stringify(resume));
        }
    }, [resume]);

    // Auto-detect experience level and missing sections
    useEffect(() => {
        const level = detectExperienceLevel(resume);
        setExperienceLevel(level);
        const missing = getMissingSections(resume, level);
        setMissingSections(missing);
    }, [resume]);

    // Extract JD keywords when job description changes
    useEffect(() => {
        const analyzeJD = async () => {
            if (!resume.jobDescription.trim()) {
                setJdKeywords(null);
                setAtsMatches([]);
                setAtsScore(0);
                return;
            }
            setAiLoading('keywords');
            try {
                const keywords = await extractKeywords(resume.jobDescription);
                setJdKeywords(keywords);
                // Match against resume
                const resumeText = `${resume.profile} ${resume.skills.join(' ')} ${resume.experience} ${resume.education} ${resume.projects}`;
                const matches = matchATSKeywords(resumeText, keywords);
                setAtsMatches(matches);
                setAtsScore(calculateATSScore(matches));
            } catch (err) {
                console.error('JD analysis failed:', err);
            }
            setAiLoading(null);
        };
        const debounce = setTimeout(analyzeJD, 800);
        return () => clearTimeout(debounce);
    }, [resume.jobDescription, resume.profile, resume.skills, resume.experience, resume.education, resume.projects]);

    // Grammar check function
    const runGrammarCheck = async (field: string, text: string) => {
        if (!text.trim() || text.length < 20) return;
        setAiLoading(`grammar_${field}`);
        try {
            const result = await checkGrammar(text);
            setGrammarResults(prev => ({ ...prev, [field]: result }));
        } catch (err) {
            console.error('Grammar check failed:', err);
        }
        setAiLoading(null);
    };

    // Advanced PDF Parser
    const parseResume = useCallback((text: string): { resume: Resume; log: ParseLog[] } => {
        const log: ParseLog[] = [];
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Helper: Find section content between keywords
        const findSection = (startKeywords: string[], endKeywords: string[], maxLines = 15): string => {
            const linesLower = lines.map(l => l.toLowerCase());
            let startIdx = -1;

            for (let i = 0; i < linesLower.length; i++) {
                for (const kw of startKeywords) {
                    if (linesLower[i].includes(kw) && linesLower[i].length < 50) {
                        startIdx = i;
                        break;
                    }
                }
                if (startIdx !== -1) break;
            }

            if (startIdx === -1) return '';

            let endIdx = Math.min(startIdx + maxLines, lines.length);
            for (let i = startIdx + 1; i < lines.length; i++) {
                for (const kw of endKeywords) {
                    if (linesLower[i].includes(kw) && linesLower[i].length < 50) {
                        endIdx = i;
                        break;
                    }
                }
                if (endIdx !== startIdx + maxLines) break;
            }

            return lines.slice(startIdx + 1, endIdx).join('\n');
        };

        // 1. Extract Name - First line that looks like a name (no special chars, 2-4 words)
        let name = '';
        for (const line of lines.slice(0, 5)) {
            const cleaned = line.replace(/[^a-zA-Z\s]/g, '').trim();
            const words = cleaned.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2 && words.length <= 4 && cleaned.length < 50) {
                // Check it's not a section header
                const lower = cleaned.toLowerCase();
                if (!['summary', 'profile', 'experience', 'education', 'skills', 'projects'].some(k => lower.includes(k))) {
                    name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    break;
                }
            }
        }
        log.push({ section: 'Name', status: name ? 'found' : 'missing', content: name });

        // 2. Extract Email
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0] : '';
        log.push({ section: 'Email', status: email ? 'found' : 'missing', content: email });

        // 3. Extract Phone
        const phoneMatch = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}|\+?[0-9]{1,3}[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
        const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : '';
        log.push({ section: 'Phone', status: phone ? 'found' : 'missing', content: phone });

        // 4. Extract LinkedIn
        const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin:?\s*)[a-zA-Z0-9_-]+/i);
        const linkedin = linkedinMatch ?
            (linkedinMatch[0].includes('linkedin.com') ? linkedinMatch[0] : `linkedin.com/in/${linkedinMatch[0].split(/\s+/).pop()}`) : '';
        log.push({ section: 'LinkedIn', status: linkedin ? 'found' : 'missing', content: linkedin });

        // 5. Extract GitHub
        const githubMatch = text.match(/(?:github\.com\/|github:?\s*)[a-zA-Z0-9_-]+/i);
        const github = githubMatch ?
            (githubMatch[0].includes('github.com') ? githubMatch[0] : `github.com/${githubMatch[0].split(/\s+/).pop()}`) : '';
        log.push({ section: 'GitHub', status: github ? 'found' : 'missing', content: github });

        // 6. Extract Profile/Summary
        const profile = findSection(
            ['summary', 'profile', 'objective', 'about me', 'professional summary', 'career objective'],
            ['experience', 'work', 'skills', 'education', 'projects', 'technical'],
            8
        );
        log.push({ section: 'Profile', status: profile ? 'found' : 'missing' });

        // 7. Extract Skills - More comprehensive
        const skillsSection = findSection(
            ['skills', 'technical skills', 'technologies', 'competencies', 'tools', 'programming'],
            ['experience', 'work', 'education', 'projects', 'certifications', 'achievements'],
            12
        );

        // Also find inline skills
        const skillPatterns = [
            /(?:python|java|javascript|typescript|react|angular|vue|node|express|mongodb|sql|postgresql|mysql|aws|azure|gcp|docker|kubernetes|git|html|css|c\+\+|c#|ruby|php|swift|kotlin|go|rust|scala|r\b|matlab|tensorflow|pytorch|keras|scikit-learn|pandas|numpy|flask|django|spring|laravel|rails)/gi
        ];

        let allSkills = new Set<string>();

        // From skills section
        if (skillsSection) {
            skillsSection.split(/[,•|\n\/]/).forEach(s => {
                const skill = s.trim();
                if (skill.length > 1 && skill.length < 35 && !skill.match(/^\d+$/)) {
                    allSkills.add(skill);
                }
            });
        }

        // From pattern matching
        for (const pattern of skillPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(m => allSkills.add(m));
            }
        }

        const skills = Array.from(allSkills).slice(0, 20);
        log.push({ section: 'Skills', status: skills.length > 0 ? 'found' : 'missing', content: `${skills.length} skills found` });

        // 8. Extract Experience
        const experience = findSection(
            ['experience', 'work experience', 'professional experience', 'employment', 'work history'],
            ['education', 'skills', 'projects', 'certifications', 'achievements', 'awards'],
            20
        );
        log.push({ section: 'Experience', status: experience ? 'found' : 'missing' });

        // 9. Extract Education
        const education = findSection(
            ['education', 'academic', 'qualification', 'degree'],
            ['skills', 'projects', 'certifications', 'experience', 'achievements', 'awards'],
            12
        );
        log.push({ section: 'Education', status: education ? 'found' : 'missing' });

        // 10. Extract Projects
        const projects = findSection(
            ['projects', 'personal projects', 'academic projects', 'portfolio'],
            ['education', 'skills', 'certifications', 'achievements', 'awards', 'references'],
            20
        );
        log.push({ section: 'Projects', status: projects ? 'found' : 'missing' });

        // 11. Extract Achievements
        const achievements = findSection(
            ['achievements', 'awards', 'certifications', 'honors', 'accomplishments'],
            ['education', 'skills', 'projects', 'references', 'interests'],
            10
        );
        log.push({ section: 'Achievements', status: achievements ? 'found' : 'missing' });

        return {
            resume: {
                name, email, phone, linkedin, github, profile, skills, experience, education, projects, achievements,
                jobRole: '', jobDescription: '', specifications: ''
            },
            log
        };
    }, []);

    // Handle Upload with better error handling
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Max 5MB');
            return;
        }

        stats.log('u');
        setStep('loading');

        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

            const buf = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

            console.log(`PDF loaded: ${pdf.numPages} pages`);

            let fullText = '';

            // Extract from ALL pages
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const content = await page.getTextContent();

                // Better text extraction with spacing
                let pageText = '';
                let lastY = 0;

                for (const item of content.items as any[]) {
                    if (item.str) {
                        // Add newline if Y position changed significantly
                        if (lastY && Math.abs(item.transform[5] - lastY) > 5) {
                            pageText += '\n';
                        }
                        pageText += item.str + ' ';
                        lastY = item.transform[5];
                    }
                }

                fullText += pageText + '\n\n--- PAGE BREAK ---\n\n';
            }

            const { resume: parsed, log } = parseResume(fullText);
            setResume(parsed);
            setParseLog(log);
            setStep('edit');

        } catch (err) {
            console.error('PDF Error:', err);
            alert('Error reading PDF. Please try another file or check the format.');
            setStep('home');
        }
    };

    const update = (k: keyof Resume, v: string | string[]) => setResume(p => ({ ...p, [k]: v }));

    const downloadPDF = async () => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let y = 25;

        // Template-specific colors
        const templateColors: Record<string, { primary: string; accent: string }> = {
            classic: { primary: '#1a1a1a', accent: '#333333' },
            modern: { primary: '#0f172a', accent: '#1e40af' },
            executive: { primary: '#111827', accent: '#6366f1' },
            minimal: { primary: '#374151', accent: '#6b7280' },
            creative: { primary: '#7c3aed', accent: '#a855f7' },
            premium: { primary: '#0c4a6e', accent: '#0284c7' },
        };

        const colors = templateColors[template] || templateColors.classic;

        // Name - Large and bold
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(colors.primary);
        doc.text(resume.name || 'Your Name', margin, y);
        y += 9;

        // Job Role
        if (resume.jobRole) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(13);
            doc.setTextColor(colors.accent);
            doc.text(resume.jobRole, margin, y);
            y += 7;
        }

        // Contact line
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        const contactParts = [resume.email, resume.phone].filter(Boolean);
        if (contactParts.length) {
            doc.text(contactParts.join('  •  '), margin, y);
            y += 5;
        }

        // Links
        if (resume.linkedin || resume.github) {
            const links = [resume.linkedin, resume.github].filter(Boolean);
            doc.setTextColor(70, 130, 180);
            doc.text(links.join('  •  '), margin, y);
            y += 6;
        }

        y += 4;

        // Divider line
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        doc.setTextColor(0);

        const addSection = (title: string, content: string) => {
            if (!content) return;
            
            // Check if we need a new page
            if (y > 265) { 
                doc.addPage(); 
                y = 20; 
            }

            // Section header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(colors.primary);
            doc.text(title.toUpperCase(), margin, y);
            y += 1;

            // Underline
            doc.setDrawColor(colors.accent);
            doc.setLineWidth(0.5);
            doc.line(margin, y + 1, margin + 25, y + 1);
            y += 6;

            // Content
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(50);
            
            const lines = doc.splitTextToSize(content, contentWidth);
            
            for (const line of lines) {
                if (y > 275) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(line, margin, y);
                y += 5;
            }
            
            y += 6;
        };

        if (resume.profile) addSection('Profile', resume.profile);
        if (resume.skills.length) addSection('Skills', resume.skills.join('  •  '));
        if (resume.experience) addSection('Experience', resume.experience);
        if (resume.education) addSection('Education', resume.education);
        if (resume.projects) addSection('Projects', resume.projects);
        if (resume.achievements) addSection('Achievements', resume.achievements);

        // Watermark for unpaid
        if (!paid) {
            doc.setFontSize(8);
            doc.setTextColor(180);
            doc.text(CONFIG.watermark, pageWidth / 2, 290, { align: 'center' });
        }

        doc.save(`${resume.name.replace(/\s+/g, '_') || 'resume'}.pdf`);
        stats.log('d');
    };

    // Validation function
    const validateResume = (): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];
        if (!resume.name.trim()) errors.push('Name is required');
        if (!resume.email.trim()) errors.push('Email is required');
        if (resume.skills.length === 0) errors.push('At least one skill is required');
        return { isValid: errors.length === 0, errors };
    };

    // Download with validation
    const handleDownload = async () => {
        const { isValid, errors } = validateResume();
        if (!isValid) {
            setDownloadError(errors.join('. '));
            setTimeout(() => setDownloadError(null), 4000);
            return;
        }
        setIsDownloading(true);
        setDownloadError(null);
        try {
            await downloadPDF();
        } catch (err) {
            setDownloadError('Failed to generate PDF. Please try again.');
        }
        setIsDownloading(false);
    };

    const sectionGroups: { personal: { key: keyof Resume; label: string; multi?: boolean }[]; content: { key: keyof Resume; label: string; multi?: boolean }[] } = {
        personal: [
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'linkedin', label: 'LinkedIn' },
            { key: 'github', label: 'GitHub' },
        ],
        content: [
            { key: 'profile', label: 'Profile Summary', multi: true },
            { key: 'experience', label: 'Experience', multi: true },
            { key: 'education', label: 'Education', multi: true },
            { key: 'skills', label: 'Skills' },
            { key: 'projects', label: 'Projects', multi: true },
            { key: 'achievements', label: 'Achievements', multi: true },
        ]
    };

    const foundCount = parseLog.filter(l => l.status === 'found').length;
    const totalCount = parseLog.length;

    const CVPreview = ({ showWatermark = true }: { showWatermark?: boolean }) => (
        <div className={`cv-paper ${template}`}>
            <div className="cv-page">
                <div className="cv-header">
                    <h1>{resume.name || 'Your Name'}</h1>
                    {resume.jobRole && <p className="cv-job-title">{resume.jobRole}</p>}
                    <p className="cv-contact-line">
                        {resume.email || 'email@example.com'}
                        {resume.phone && ` • ${resume.phone}`}
                    </p>
                    {(resume.linkedin || resume.github) && (
                        <p className="cv-links">
                            {resume.linkedin && <span>{resume.linkedin}</span>}
                            {resume.github && <span>{resume.github}</span>}
                        </p>
                    )}
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
                            <div className="cv-skills">
                                {resume.skills.map((s, i) => <span key={i}>{s}</span>)}
                            </div>
                        </div>
                    )}
                    {resume.experience && (
                        <div className="cv-section">
                            <h2>Experience</h2>
                            <div className="cv-text">{resume.experience.split('\n').map((line, i) => (
                                <p key={i} className={line.match(/^[A-Z].*\d{4}/) ? 'cv-entry-title' : ''}>{line}</p>
                            ))}</div>
                        </div>
                    )}
                    {resume.education && (
                        <div className="cv-section">
                            <h2>Education</h2>
                            <div className="cv-text">{resume.education.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}</div>
                        </div>
                    )}
                    {resume.projects && (
                        <div className="cv-section">
                            <h2>Projects</h2>
                            <div className="cv-text">{resume.projects.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}</div>
                        </div>
                    )}
                    {resume.achievements && (
                        <div className="cv-section">
                            <h2>Achievements</h2>
                            <div className="cv-text">{resume.achievements.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}</div>
                        </div>
                    )}
                </div>
                {showWatermark && !paid && <div className="cv-watermark">{CONFIG.watermark}</div>}
            </div>
        </div>
    );

    const renderSectionGroup = (title: string, items: { key: keyof Resume; label: string; multi?: boolean }[]) => (
        <div className="section-group">
            <h3 className="group-title">{title}</h3>
            <div className="group-items">
                {items.map((sec) => {
                    const key = sec.key;
                    const val = key === 'skills' ? resume.skills.join(', ') : String(resume[key] || '');
                    const isEmpty = key === 'skills' ? resume.skills.length === 0 : !val;
                    const isOpen = editing === key;
                    const grammarResult = grammarResults[key];

                    return (
                        <div key={sec.key} className={`sec ${isOpen ? 'open' : ''} ${isEmpty ? 'empty' : 'filled'}`}>
                            <button className="sec-head" onClick={() => setEditing(isOpen ? null : sec.key)}>
                                <span className="sec-label">
                                    <div className={`status-indicator ${isEmpty ? 'missing' : 'found'}`}></div>
                                    {sec.label}
                                    {(sec.key === 'linkedin' || sec.key === 'github') && <Link size={12} className="link-icon" />}
                                    {grammarResult?.hasErrors && <AlertCircle size={12} className="grammar-warning" />}
                                </span>
                                <Pencil size={14} className="edit-icon" />
                            </button>
                            {isOpen && (
                                <div className="sec-body">
                                    {sec.key === 'skills' ? (
                                        <div className="input-wrapper">
                                            <input
                                                value={resume.skills.join(', ')}
                                                onChange={e => update('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                                placeholder="e.g. React, Node.js, Python"
                                            />
                                            <small className="field-hint">Separate skills with commas</small>
                                        </div>
                                    ) : sec.multi ? (
                                        <div className="input-wrapper">
                                            <textarea
                                                value={val}
                                                onChange={e => update(sec.key, e.target.value)}
                                                onBlur={() => sec.multi && runGrammarCheck(sec.key, val)}
                                                rows={6}
                                                placeholder={`Enter ${sec.label.toLowerCase()}...`}
                                            />
                                            {aiLoading === `grammar_${sec.key}` && <small className="field-hint loading">Checking grammar...</small>}
                                            {grammarResult?.hasErrors && (
                                                <div className="grammar-suggestions">
                                                    <small><Sparkles size={12} /> Suggestions:</small>
                                                    {grammarResult.corrections.slice(0, 3).map((c, i) => (
                                                        <span key={i} className="grammar-fix">"{c.original}" → "{c.suggestion}"</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <input
                                            value={val}
                                            onChange={e => update(sec.key, e.target.value)}
                                            placeholder={`Enter ${sec.label.toLowerCase()}...`}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="app">
            {step !== 'edit' && (
                <header>
                    <div className="logo" onClick={() => setStep('home')}><FileText size={18} /><span>HexaStack</span></div>
                    {isAdmin && <button className="admin-btn" onClick={() => setShowAdmin(true)}>Admin</button>}
                </header>
            )}

            {showAdmin && (
                <div className="overlay" onClick={() => setShowAdmin(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-head"><h3>Dashboard</h3><button onClick={() => setShowAdmin(false)}><X size={16} /></button></div>
                        <div className="modal-body">
                            <div className="stat-row">
                                <div className="stat"><span>{stats.get().u}</span><small>Uploads</small></div>
                                <div className="stat"><span>{stats.get().p}</span><small>Previews</small></div>
                                <div className="stat"><span>{stats.get().d}</span><small>Downloads</small></div>
                            </div>
                            <p className="revenue">Revenue: ₹{stats.get().d * CONFIG.price}</p>
                        </div>
                    </div>
                </div>
            )}

            <main>
                {step === 'home' && (
                    <section className="home">
                        <div className="hero">
                            <span className="badge">Free Resume Formatter</span>
                            <h1>Format your resume into a clean, professional PDF</h1>
                            <p className="subtitle">Upload your existing resume. We extract and format it beautifully. Edit any section. Download instantly.</p>

                            <div className="upload-area">
                                <input type="file" accept=".pdf" onChange={handleUpload} id="file" />
                                <label htmlFor="file">
                                    <Upload size={24} />
                                    <div><strong>Upload Resume</strong><span>PDF file only • Max 5MB</span></div>
                                </label>
                            </div>

                            <div className="hero-features">
                                <div className="hf"><Clock size={18} /><span>2 min process</span></div>
                                <div className="hf"><Shield size={18} /><span>No signup</span></div>
                                <div className="hf"><Zap size={18} /><span>All pages scanned</span></div>
                            </div>
                        </div>

                        <div className="benefits">
                            <div className="benefit">
                                <div className="b-icon"><Layout size={20} /></div>
                                <h3>Smart Extraction</h3>
                                <p>Detects name, email, LinkedIn, GitHub, skills & more</p>
                            </div>
                            <div className="benefit">
                                <div className="b-icon"><Pencil size={20} /></div>
                                <h3>Edit Easily</h3>
                                <p>Fix any section, add missing info</p>
                            </div>
                            <div className="benefit">
                                <div className="b-icon"><Download size={20} /></div>
                                <h3>Download PDF</h3>
                                <p>Free preview, ₹{CONFIG.price} for clean PDF</p>
                            </div>
                        </div>
                    </section>
                )}

                {step === 'loading' && (
                    <section className="loading">
                        <div className="spinner"></div>
                        <p>Scanning all pages...</p>
                    </section>
                )}

                {step === 'edit' && (
                    <section className="editor">
                        {/* LEFT: Resume Edit */}
                        <div className="editor-left">
                            <div className="editor-header">
                                <button onClick={() => setStep('home')} className="btn-back">
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h2>Edit Resume</h2>
                                    <p className="sub">Review and update your details</p>
                                </div>
                                <span className="step-badge">1/2</span>
                            </div>

                            <div className="sections-container">
                                {renderSectionGroup('Personal', sectionGroups.personal)}
                                {renderSectionGroup('Experience', sectionGroups.content)}
                            </div>

                            <button className="btn primary full" onClick={() => setStep('template')}>
                                Continue <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* RIGHT: Target Job (Optional) */}
                        <div className="editor-right">
                            <div className="target-card">
                                <div className="card-header">
                                    <h3>Target Job <span className="opt">(Optional)</span></h3>
                                </div>
                                <p className="card-hint">Tailor your resume to a specific job for better results.</p>

                                <div className="field">
                                    <label>Role</label>
                                    <input
                                        value={resume.jobRole}
                                        onChange={e => update('jobRole', e.target.value)}
                                        placeholder="e.g. Software Engineer"
                                    />
                                </div>

                                <div className="field">
                                    <label>Job Description</label>
                                    <textarea
                                        value={resume.jobDescription}
                                        onChange={e => update('jobDescription', e.target.value)}
                                        placeholder="Paste job description to match keywords..."
                                        rows={4}
                                    />
                                </div>

                                <div className="field">
                                    <label>Key Skills Needed</label>
                                    <input
                                        value={resume.specifications}
                                        onChange={e => update('specifications', e.target.value)}
                                        placeholder="e.g. React, Python, AWS"
                                    />
                                </div>
                            </div>

                            {/* Keywords Match - only show when JD exists */}
                            {atsMatches.length > 0 && (
                                <div className="keywords-card">
                                    <h4>Keywords Matched</h4>
                                    <div className="keywords">
                                        {atsMatches.slice(0, 10).map((m, i) => (
                                            <span key={i} className={m.found ? 'found' : 'miss'}>
                                                {m.keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {step === 'template' && (
                    <section className="templates-page">
                        {/* Header */}
                        <div className="tpl-header">
                            <button onClick={() => setStep('edit')} className="btn-back">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="tpl-header-content">
                                <h2>Choose Your Template</h2>
                                <p>Select a design that fits your style</p>
                            </div>
                        </div>

                        {/* Template Gallery - Full A4 Frames */}
                        <div className="tpl-gallery">
                            <div className="tpl-gallery-scroll">
                                {TEMPLATES.map((t, idx) => (
                                    <div 
                                        key={t.id} 
                                        className={`tpl-frame ${template === t.id ? 'active' : ''} ${t.price > 0 ? 'premium' : ''}`} 
                                        onClick={() => setTemplate(t.id)}
                                    >
                                        <div className="tpl-frame-inner">
                                            {/* Live preview with actual user data */}
                                            <div className={`tpl-cv-preview ${t.id}`}>
                                                <div className="tcv-header">
                                                    <h3>{resume.name || 'Your Name'}</h3>
                                                    {resume.jobRole && <span className="tcv-role">{resume.jobRole}</span>}
                                                    <p className="tcv-contact">{resume.email || 'email@example.com'} {resume.phone && `• ${resume.phone}`}</p>
                                                </div>
                                                {resume.profile && (
                                                    <div className="tcv-section">
                                                        <h4>Profile</h4>
                                                        <p>{resume.profile.substring(0, 150)}...</p>
                                                    </div>
                                                )}
                                                {resume.skills.length > 0 && (
                                                    <div className="tcv-section">
                                                        <h4>Skills</h4>
                                                        <div className="tcv-skills">
                                                            {resume.skills.slice(0, 6).map((s, i) => <span key={i}>{s}</span>)}
                                                        </div>
                                                    </div>
                                                )}
                                                {resume.experience && (
                                                    <div className="tcv-section">
                                                        <h4>Experience</h4>
                                                        <p>{resume.experience.substring(0, 100)}...</p>
                                                    </div>
                                                )}
                                            </div>
                                            {t.price > 0 && <span className="tpl-badge">₹{t.price}</span>}
                                            {template === t.id && <div className="tpl-selected"><Check size={16} /></div>}
                                        </div>
                                        <div className="tpl-frame-info">
                                            <span className="tpl-frame-name">{t.name}</span>
                                            <span className="tpl-frame-type">{t.price > 0 ? 'Premium' : 'Free'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Action */}
                        <div className="tpl-footer">
                            <div className="tpl-selected-info">
                                <span>Selected: <strong>{TEMPLATES.find(t => t.id === template)?.name}</strong></span>
                                {TEMPLATES.find(t => t.id === template)?.price ? (
                                    <span className="price-tag">₹{TEMPLATES.find(t => t.id === template)?.price}</span>
                                ) : (
                                    <span className="free-tag">Free</span>
                                )}
                            </div>
                            <button className="btn primary large" onClick={() => { stats.log('p'); setStep('preview'); }}>
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>
                    </section>
                )}

                {step === 'preview' && (
                    <section className="final-preview">
                        <h2>Your Resume</h2>
                        <div className="cv-frame final"><CVPreview showWatermark={!paid} /></div>
                        <p className="preview-note">{paid ? 'Ready to download' : `Free preview • ₹${CONFIG.price} removes watermark`}</p>
                        {downloadError && (
                            <div className="error-toast">
                                <AlertCircle size={14} /> {downloadError}
                            </div>
                        )}
                        <div className="btn-row">
                            <button className="btn secondary" onClick={() => setStep('template')}>Back</button>
                            {paid ? (
                                <button className="btn primary" onClick={handleDownload} disabled={isDownloading}>
                                    {isDownloading ? <span className="btn-loading">Generating...</span> : <><Download size={16} /> Download PDF</>}
                                </button>
                            ) : (
                                <>
                                    <button className="btn outline" onClick={handleDownload} disabled={isDownloading}>
                                        {isDownloading ? 'Generating...' : 'Download with watermark'}
                                    </button>
                                    <button className="btn primary" onClick={() => setStep('pay')}>Get Clean PDF — ₹{CONFIG.price}</button>
                                </>
                            )}
                        </div>
                    </section>
                )}

                {
                    step === 'pay' && (
                        <section className="payment">
                            <div className="pay-card">
                                <h2>₹{CONFIG.price}</h2>
                                <p>One-time payment</p>
                                <div className="upi"><span>Pay via UPI</span><strong>hexastack@upi</strong></div>
                                <button className="btn primary full" onClick={() => { setPaid(true); setStep('done'); }}><Check size={16} /> I have paid</button>
                                <button className="btn-link" onClick={() => setStep('preview')}>Go back</button>
                            </div>
                        </section>
                    )
                }

                {step === 'done' && (
                    <section className="done">
                        <div className="done-icon"><Check size={28} /></div>
                        <h2>Payment Confirmed</h2>
                        <p>Download your clean, professional resume.</p>
                        {downloadError && (
                            <div className="error-toast">
                                <AlertCircle size={14} /> {downloadError}
                            </div>
                        )}
                        <button className="btn primary" onClick={handleDownload} disabled={isDownloading}>
                            {isDownloading ? 'Generating...' : <><Download size={16} /> Download PDF</>}
                        </button>
                        <button className="btn-link" onClick={() => { setStep('home'); setPaid(false); }}>Format another resume</button>
                    </section>
                )}
            </main >

            <footer><p>HexaStack Resume Formatter — Format your CV online, free preview, instant download.</p></footer>
        </div >
    );
}
