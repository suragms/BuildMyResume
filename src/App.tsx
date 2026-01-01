import { useState, useEffect, useCallback } from 'react';
import { Upload, Download, Check, X, FileText, ChevronRight, ChevronLeft, Pencil, Layout, Zap, Shield, Clock, Link } from 'lucide-react';
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
    { id: 'classic', name: 'Classic', desc: 'Clean and professional' },
    { id: 'modern', name: 'Modern', desc: 'Contemporary layout' },
    { id: 'minimal', name: 'Minimal', desc: 'Simple and elegant' },
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

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && e.key === 'A') { setIsAdmin(true); setShowAdmin(true); } };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

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
        let y = 20;

        // Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(resume.name || 'Your Name', 20, y);
        y += 7;

        // Job Role
        if (resume.jobRole) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(14);
            doc.setTextColor(60);
            doc.text(resume.jobRole, 20, y);
            y += 6;
        }

        // Contact line
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80);
        const contactParts = [resume.email, resume.phone].filter(Boolean);
        doc.text(contactParts.join(' • '), 20, y);
        y += 5;

        // Links
        if (resume.linkedin || resume.github) {
            const links = [resume.linkedin, resume.github].filter(Boolean);
            doc.text(links.join(' • '), 20, y);
            y += 8;
        } else {
            y += 3;
        }

        doc.setTextColor(0);

        const addSection = (title: string, content: string) => {
            if (!content) return;
            if (y > 270) { doc.addPage(); y = 20; } // Handle page break
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(title.toUpperCase(), 20, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(content, 170);
            doc.text(lines, 20, y);
            y += lines.length * 4 + 6;
        };

        if (resume.profile) addSection('Profile', resume.profile);
        if (resume.skills.length) addSection('Skills', resume.skills.join(' • '));
        if (resume.experience) addSection('Experience', resume.experience);
        if (resume.education) addSection('Education', resume.education);
        if (resume.projects) addSection('Projects', resume.projects);
        if (resume.achievements) addSection('Achievements', resume.achievements);

        if (!paid) {
            doc.setFontSize(7);
            doc.setTextColor(200);
            doc.text(CONFIG.watermark, 105, 290, { align: 'center' });
        }

        doc.save(`${resume.name.replace(/\s+/g, '_') || 'resume'}.pdf`);
        stats.log('d');
    };

    const sectionGroups = {
        personal: [
            { key: 'name', label: 'Full Name' },
            { key: 'jobRole', label: 'Job Role' },
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
        ],
        target: [
            { key: 'jobDescription', label: 'Job Description (JD)', multi: true },
            { key: 'specifications', label: 'Other Specifications', multi: true },
        ]
    };

    const foundCount = parseLog.filter(l => l.status === 'found').length;
    const totalCount = parseLog.length;

    const CVPreview = ({ showWatermark = true }: { showWatermark?: boolean }) => (
        <div className={`cv-paper ${template}`}>
            <div className="cv-header">
                <h1>{resume.name || 'Your Name'}</h1>
                {resume.jobRole && <p className="cv-job-title" style={{ fontSize: '1.2em', color: '#666', marginTop: '4px' }}>{resume.jobRole}</p>}
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
                {resume.profile && <div className="cv-section"><h2>Profile</h2><p>{resume.profile}</p></div>}
                {resume.skills.length > 0 && (
                    <div className="cv-section">
                        <h2>Skills</h2>
                        <div className="cv-skills">{resume.skills.map((s, i) => <span key={i}>{s}</span>)}</div>
                    </div>
                )}
                {resume.experience && <div className="cv-section"><h2>Experience</h2><p>{resume.experience}</p></div>}
                {resume.education && <div className="cv-section"><h2>Education</h2><p>{resume.education}</p></div>}
                {resume.projects && <div className="cv-section"><h2>Projects</h2><p>{resume.projects}</p></div>}
                {resume.achievements && <div className="cv-section"><h2>Achievements</h2><p>{resume.achievements}</p></div>}
            </div>
            {showWatermark && !paid && <div className="cv-watermark">{CONFIG.watermark}</div>}
        </div>
    );

    const renderSectionGroup = (title: string, items: any[]) => (
        <div className="section-group">
            <h3 className="group-title">{title}</h3>
            <div className="group-items">
                {items.map((sec: any) => {
                    const val = sec.key === 'skills' ? resume.skills.join(', ') : resume[sec.key] as string;
                    const isEmpty = sec.key === 'skills' ? resume.skills.length === 0 : !val;
                    const isOpen = editing === sec.key;

                    return (
                        <div key={sec.key} className={`sec ${isOpen ? 'open' : ''} ${isEmpty ? 'empty' : 'filled'}`}>
                            <button className="sec-head" onClick={() => setEditing(isOpen ? null : sec.key)}>
                                <span className="sec-label">
                                    <div className={`status-indicator ${isEmpty ? 'missing' : 'found'}`}></div>
                                    {sec.label}
                                    {(sec.key === 'linkedin' || sec.key === 'github') && <Link size={12} className="link-icon" />}
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
                                        <textarea
                                            value={val}
                                            onChange={e => update(sec.key, e.target.value)}
                                            rows={6}
                                            placeholder={`Enter ${sec.label.toLowerCase()}...`}
                                        />
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

    const [zoom, setZoom] = useState(0.75);

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
                        <div className="editor-left">
                            <div className="editor-header">
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <button onClick={() => setStep('home')} className="btn-icon-back" title="Back to Home">
                                        <ChevronLeft size={24} />
                                    </button>
                                    <div>
                                        <h2>Edit Resume</h2>
                                        <p className="header-sub">Review and edit extracted details</p>
                                    </div>
                                </div>
                                <span className="step-badge">Step 1 of 2</span>
                            </div>

                            {/* Parse Status */}
                            <div className="parse-status">
                                <div className="parse-header">
                                    <span><strong>{foundCount}</strong> of {totalCount} sections found</span>
                                </div>
                                <div className="parse-dots">
                                    {parseLog.map((l, i) => (
                                        <div key={i} className={`parse - dot ${l.status} `} title={`${l.section}: ${l.status}`}></div>
                                    ))}
                                </div>
                            </div >

                            <div className="sections-container">
                                {renderSectionGroup('Personal Details', sectionGroups.personal)}
                                {renderSectionGroup('Professional Experience', sectionGroups.content)}
                                {renderSectionGroup('Resume Tailoring', sectionGroups.target)}
                            </div>

                            <button className="btn primary full" onClick={() => setStep('template')}>
                                Choose Template <ChevronRight size={16} />
                            </button>
                        </div >

                        <div className="editor-right">
                            <div className="cv-frame"><CVPreview /></div>
                        </div>
                    </section >
                )
                }

                {
                    step === 'template' && (
                        <section className="template-page">
                            <div className="template-header">
                                <h2>Choose Template</h2>
                                <span className="step-badge">Step 2 of 2</span>
                            </div>
                            <div className="template-grid">
                                {TEMPLATES.map(t => (
                                    <div key={t.id} className={`template-card ${template === t.id ? 'selected' : ''}`} onClick={() => setTemplate(t.id)}>
                                        <div className="template-preview">
                                            <div className={`cv-mini ${t.id}`}>
                                                <div className="mini-header"></div>
                                                <div className="mini-line w80"></div>
                                                <div className="mini-line w60"></div>
                                                <div className="mini-block"></div>
                                                <div className="mini-line w90"></div>
                                            </div>
                                        </div>
                                        <div className="template-info"><h3>{t.name}</h3><p>{t.desc}</p></div>
                                        {template === t.id && <div className="template-check"><Check size={16} /></div>}
                                    </div>
                                ))}
                            </div>
                            <div className="cv-frame large"><CVPreview /></div>
                            <div className="template-actions">
                                <button className="btn secondary" onClick={() => setStep('edit')}>Back</button>
                                <button className="btn primary" onClick={() => { stats.log('p'); setStep('preview'); }}>Continue <ChevronRight size={16} /></button>
                            </div>
                        </section>
                    )
                }

                {
                    step === 'preview' && (
                        <section className="final-preview">
                            <h2>Your Resume</h2>
                            <div className="cv-frame final"><CVPreview showWatermark={!paid} /></div>
                            <p className="preview-note">{paid ? 'Ready to download' : `Free preview • ₹${CONFIG.price} removes watermark`}</p>
                            <div className="btn-row">
                                <button className="btn secondary" onClick={() => setStep('template')}>Back</button>
                                {paid ? (
                                    <button className="btn primary" onClick={downloadPDF}><Download size={16} /> Download PDF</button>
                                ) : (
                                    <>
                                        <button className="btn outline" onClick={downloadPDF}>Download with watermark</button>
                                        <button className="btn primary" onClick={() => setStep('pay')}>Get Clean PDF — ₹{CONFIG.price}</button>
                                    </>
                                )}
                            </div>
                        </section>
                    )
                }

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

                {
                    step === 'done' && (
                        <section className="done">
                            <div className="done-icon"><Check size={28} /></div>
                            <h2>Payment Confirmed</h2>
                            <p>Download your clean, professional resume.</p>
                            <button className="btn primary" onClick={downloadPDF}><Download size={16} /> Download PDF</button>
                            <button className="btn-link" onClick={() => { setStep('home'); setPaid(false); }}>Format another resume</button>
                        </section>
                    )
                }
            </main >

            <footer><p>HexaStack Resume Formatter — Format your CV online, free preview, instant download.</p></footer>
        </div >
    );
}
